/**
 * InteractionAnalyzer — v3 (AST-based)
 *
 * Uses @babel/parser to produce a real AST for each source file, then
 * walks the tree to extract navigation interactions. AST parsing is
 * significantly more reliable than regex — it is not fooled by multi-line
 * attributes, nested JSX, comments, or string literals that look like code.
 *
 * Patterns detected:
 *   1. <Link to="…"> / <NavLink to="…">  — string literal prop
 *   2. <Link to={ROUTES.key}>            — MemberExpression, constant resolved
 *   3. <Link to={`/static`}>             — TemplateLiteral with no expressions
 *   4. <a href="…">                      — internal anchors (href starts with /)
 *   5. navigate('/…') / router.push('/…') — CallExpression anywhere in file
 *   6. navigate(-1)                       — go-back action
 *   7. onClick → fetch / axios calls      — API interaction detection (v1 retained)
 *
 * ROUTES resolution:
 *   Route-config files (routes.ts, navigation.ts, …) are parsed first.
 *   ObjectProperty nodes inside the exported constant are extracted to build
 *   a key→path map that is used when resolving MemberExpression `to` props.
 *
 * Error handling:
 *   If @babel/parser throws (syntax error, unsupported syntax), the file is
 *   skipped silently — same conservative policy as the rest of the engine.
 */

import { parse } from '@babel/parser';
import type { CategorizedFile, InteractionEntry } from './types';

// ─── AST node types (minimal subset we care about) ────────────────────────────
// Using `any` for child node types to keep the file concise. The AST shape
// comes straight from @babel/parser and is well-documented at babeljs.io.
/* eslint-disable @typescript-eslint/no-explicit-any */
type ASTNode = Record<string, any> & { type: string };

// ─── Generic AST walker ───────────────────────────────────────────────────────

/**
 * Depth-first traversal of a Babel AST.
 * Calls `visitor` for every node that has a `type` property.
 * Returns immediately when visitor returns `false` (early exit).
 */
function walk(node: any, visitor: (node: ASTNode) => false | void): void {
  if (!node || typeof node !== 'object') return;
  if (node.type) {
    if (visitor(node as ASTNode) === false) return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) walk(item, visitor);
      }
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, visitor);
    }
  }
}

/** Parse a source file with Babel, tolerating errors. Returns null on failure. */
function tryParse(content: string, path: string): ASTNode | null {
  try {
    return parse(content, {
      sourceType: 'module',
      strictMode: false,
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
    }) as unknown as ASTNode;
  } catch {
    // Parse error — skip file rather than crash the whole pipeline
    return null;
  }
}

// ─── ROUTES constant resolution ───────────────────────────────────────────────

/** File paths that typically export a ROUTES / PATHS constant. */
const ROUTE_FILE_RE =
  /(?:^|\/)(?:routes?|navigation|routing|(?:constants\/)?routes?|paths?)\.[jt]sx?$/i;

/**
 * Extract a { key → path } map from AST ObjectExpression properties.
 * Works for both `{ login: '/login' }` and `{ login: ROUTES.login }` (skips
 * non-string-literal values to stay conservative).
 */
function extractObjectRoutes(objNode: ASTNode): Map<string, string> {
  const map = new Map<string, string>();
  if (objNode.type !== 'ObjectExpression') return map;
  for (const prop of (objNode.properties as ASTNode[])) {
    if (prop.type !== 'ObjectProperty') continue;
    const key =
      prop.key?.type === 'Identifier' ? (prop.key.name as string) :
      prop.key?.type === 'StringLiteral' ? (prop.key.value as string) :
      null;
    const val =
      prop.value?.type === 'StringLiteral' ? (prop.value.value as string) : null;
    if (key && val && (val.startsWith('/') || val === '/')) {
      map.set(key, val);
    }
  }
  return map;
}

/**
 * Find all `const ROUTES = { … }` (and similar) declarations in a file AST
 * and return the merged key→path map.
 *
 * Recognises:
 *   const ROUTES = { … }
 *   export const ROUTES = { … }
 *   export default { … }   (only if the file name is a route config)
 */
function extractRouteMap(ast: ASTNode): Map<string, string> {
  const merged = new Map<string, string>();

  walk(ast, (node) => {
    // VariableDeclaration: const ROUTES = { … }
    if (node.type === 'VariableDeclaration') {
      for (const decl of (node.declarations as ASTNode[])) {
        if (
          decl.type === 'VariableDeclarator' &&
          decl.init?.type === 'ObjectExpression'
        ) {
          for (const [k, v] of extractObjectRoutes(decl.init)) merged.set(k, v);
        }
      }
    }
    // ExportDefaultDeclaration: export default { … }
    if (
      node.type === 'ExportDefaultDeclaration' &&
      node.declaration?.type === 'ObjectExpression'
    ) {
      for (const [k, v] of extractObjectRoutes(node.declaration)) merged.set(k, v);
    }
  });

  return merged;
}

/**
 * Parse every route-config file and merge their key→path maps.
 */
function buildRouteKeyMap(files: CategorizedFile[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const file of files) {
    if (file.isBinary || !file.content) continue;
    if (!ROUTE_FILE_RE.test(file.path)) continue;
    const ast = tryParse(file.content, file.path);
    if (!ast) continue;
    for (const [k, v] of extractRouteMap(ast)) merged.set(k, v);
  }
  return merged;
}

// ─── Prop-value extraction (JSX attribute `to` / `href`) ─────────────────────

/** Resolve a JSX prop value to a route string (or null when unresolvable). */
function resolveJSXPropValue(
  valueNode: ASTNode | null | undefined,
  routeKeyMap: Map<string, string>,
): string | null {
  if (!valueNode) return null;

  // to="/route"  (JSXAttribute value is a StringLiteral directly)
  if (valueNode.type === 'StringLiteral') {
    return (valueNode.value as string) || null;
  }

  // to={...}  (JSXExpressionContainer wrapping an expression)
  if (valueNode.type === 'JSXExpressionContainer') {
    const expr: ASTNode = valueNode.expression;
    if (!expr || expr.type === 'JSXEmptyExpression') return null;

    // to={"/route"}  — StringLiteral inside container
    if (expr.type === 'StringLiteral') {
      return (expr.value as string) || null;
    }

    // to={ROUTES.login}  — MemberExpression: resolve from routeKeyMap
    if (
      expr.type === 'MemberExpression' &&
      !expr.computed &&
      expr.property?.type === 'Identifier'
    ) {
      return routeKeyMap.get(expr.property.name as string) ?? null;
    }

    // to={`/static`}  — TemplateLiteral with no expressions (pure static)
    if (expr.type === 'TemplateLiteral' && (expr.expressions as any[]).length === 0) {
      const raw = (expr.quasis as ASTNode[])[0]?.value?.cooked as string ?? '';
      return raw || null;
    }
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True only for internal app paths. Rejects external URLs, hashes, etc. */
function isInternalRoute(route: string | null): route is string {
  if (!route || route === '#') return false;
  if (/^https?:\/\/|^\/\/|^mailto:|^tel:|^#/.test(route)) return false;
  return route.startsWith('/');
}

/** Extract visible text from JSX children (JSXText + nested JSX text, capped). */
function extractJSXLabel(children: ASTNode[]): string {
  const parts: string[] = [];
  for (const child of children) {
    if (child.type === 'JSXText') {
      const t = (child.value as string).replace(/\s+/g, ' ').trim();
      if (t) parts.push(t);
    }
  }
  return parts.join(' ').slice(0, 60);
}

/** Derive top-level module from file path (mirrors mapper.ts logic). */
function moduleOf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const skip = new Set([
    'src', 'app', 'lib', 'features', 'pages', 'components',
    'hooks', 'screens', 'views', 'ui', 'layouts', 'providers',
  ]);
  for (const part of parts.slice(0, 4)) {
    if (!skip.has(part.toLowerCase())) return part;
  }
  return parts[0] ?? 'root';
}

/** JSX component names that represent navigation links. */
const LINK_COMPONENTS = new Set(['Link', 'NavLink']);

/** Get the string name of a JSX element. */
function jsxTagName(nameNode: ASTNode): string {
  if (nameNode.type === 'JSXIdentifier') return nameNode.name as string;
  if (nameNode.type === 'JSXMemberExpression') {
    return `${jsxTagName(nameNode.object)}.${(nameNode.property as ASTNode).name}`;
  }
  return '';
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

export class InteractionAnalyzer {
  /**
   * Analyze categorized source files and return a list of detected interactions.
   * Synchronous — @babel/parser.parse() is synchronous.
   */
  analyze(files: CategorizedFile[]): InteractionEntry[] {
    // Phase 1: Build ROUTES key→path map from route-config files
    const routeKeyMap = buildRouteKeyMap(files);

    const result: InteractionEntry[] = [];
    // Deduplicate by (filePath, apiHint)
    const seen = new Set<string>();

    const relevant = files.filter(
      (f) =>
        (f.category === 'page' || f.category === 'component' || f.category === 'layout') &&
        !f.isBinary &&
        !!f.content,
    );

    for (const file of relevant) {
      const ast = tryParse(file.content, file.path);
      if (!ast) continue;   // skip files that fail to parse

      const mod = moduleOf(file.path);
      let nodeIndex = 0;

      const addNav = (
        suffix: string,
        label: string,
        route: string,
        description?: string,
      ): void => {
        const apiHint = `navega para ${route}`;
        const key = `${file.path}⟹${apiHint}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push({
          id:          `${file.path}:${suffix}:${nodeIndex++}`,
          filePath:    file.path,
          module:      mod,
          handlerName: '',
          label:       label || route,
          callsApi:    false,
          apiHint,
          description: description ?? `Link '${label || route}' → ${apiHint}`,
        });
      };

      const addBack = (): void => {
        const key = `${file.path}⟹volta para a tela anterior`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push({
          id:          `${file.path}:navback:${nodeIndex++}`,
          filePath:    file.path,
          module:      mod,
          handlerName: '',
          label:       'voltar',
          callsApi:    false,
          apiHint:     'volta para a tela anterior',
          description: 'navigate(-1) → volta para a tela anterior',
        });
      };

      walk(ast, (node) => {
        // ── JSX elements: <Link to>, <NavLink to>, <a href> ────────────────
        if (node.type === 'JSXOpeningElement') {
          const tag = jsxTagName(node.name);
          const isLink = LINK_COMPONENTS.has(tag);
          const isAnchor = tag === 'a';

          if (!isLink && !isAnchor) return;

          for (const attr of (node.attributes as ASTNode[])) {
            if (attr.type !== 'JSXAttribute') continue;
            const attrName = (attr.name as ASTNode)?.name as string;

            if (isLink && attrName === 'to') {
              const route = resolveJSXPropValue(attr.value as ASTNode, routeKeyMap);
              if (isInternalRoute(route)) {
                // Get inner text from the parent JSXElement's children
                const parent: ASTNode | undefined = (node as any).__parent;
                const label = parent?.children
                  ? extractJSXLabel(parent.children as ASTNode[])
                  : '';
                addNav(`${tag.toLowerCase()}:to`, label, route);
              }
            }

            if (isAnchor && attrName === 'href') {
              const route = resolveJSXPropValue(attr.value as ASTNode, routeKeyMap);
              if (isInternalRoute(route) && route.length <= 100) {
                const parent: ASTNode | undefined = (node as any).__parent;
                const label = parent?.children
                  ? extractJSXLabel(parent.children as ASTNode[])
                  : '';
                addNav(`anchor:href`, label, route);
              }
            }
          }
          return;
        }

        // ── CallExpression: navigate('/…') / router.push('/…') ─────────────
        if (node.type === 'CallExpression') {
          const callee = node.callee as ASTNode;
          const args   = node.arguments as ASTNode[];

          // navigate(…)
          const isNavigate =
            callee.type === 'Identifier' && callee.name === 'navigate';

          // router.push(…)
          const isRouterPush =
            callee.type === 'MemberExpression' &&
            !callee.computed &&
            (callee.object as ASTNode)?.type === 'Identifier' &&
            ((callee.object as ASTNode).name === 'router' || (callee.object as ASTNode).name === 'history') &&
            (callee.property as ASTNode)?.name === 'push';

          if ((isNavigate || isRouterPush) && args.length > 0) {
            const firstArg = args[0];

            // navigate('/route')
            if (firstArg.type === 'StringLiteral') {
              const route = firstArg.value as string;
              if (isInternalRoute(route)) {
                addNav('navigate', route, route,
                  `navigate('${route}') → navega para ${route}`);
              }
            }

            // navigate(-1) — go back
            if (
              firstArg.type === 'UnaryExpression' &&
              firstArg.operator === '-' &&
              (firstArg.argument as ASTNode)?.type === 'NumericLiteral' &&
              (firstArg.argument as ASTNode)?.value === 1
            ) {
              addBack();
            }
            if (
              firstArg.type === 'NumericLiteral' &&
              firstArg.value === -1
            ) {
              addBack();
            }

            // navigate(ROUTES.key)
            if (
              firstArg.type === 'MemberExpression' &&
              !firstArg.computed &&
              (firstArg.property as ASTNode)?.type === 'Identifier'
            ) {
              const route = routeKeyMap.get((firstArg.property as ASTNode).name as string);
              if (route && isInternalRoute(route)) {
                addNav('navigate:const', route, route,
                  `navigate(ROUTES.${(firstArg.property as ASTNode).name}) → navega para ${route}`);
              }
            }
          }
          return;
        }

        // ── onClick → fetch / axios API calls (retained from v1) ───────────
        if (node.type === 'JSXAttribute') {
          const attrName = (node.name as ASTNode)?.name as string;
          if (attrName !== 'onClick') return;

          // Inline arrow: onClick={() => someHandler()}
          const valueExpr: ASTNode | null =
            node.value?.type === 'JSXExpressionContainer'
              ? (node.value as ASTNode).expression
              : null;
          if (!valueExpr || valueExpr.type === 'JSXEmptyExpression') return;

          // Walk into the onClick body to find fetch/axios calls
          walk(valueExpr, (inner) => {
            if (inner.type !== 'CallExpression') return;
            const innerCallee = inner.callee as ASTNode;
            const innerArgs   = inner.arguments as ASTNode[];

            // fetch('/path', { method: '…' })
            if (
              innerCallee.type === 'Identifier' &&
              innerCallee.name === 'fetch' &&
              innerArgs[0]?.type === 'StringLiteral'
            ) {
              const path = innerArgs[0].value as string;
              // Try to find method in second arg object
              let method = 'POST';
              const optionsNode = innerArgs[1];
              if (optionsNode?.type === 'ObjectExpression') {
                for (const prop of (optionsNode.properties as ASTNode[])) {
                  if (
                    prop.type === 'ObjectProperty' &&
                    (prop.key as ASTNode)?.name === 'method' &&
                    (prop.value as ASTNode)?.type === 'StringLiteral'
                  ) {
                    method = ((prop.value as ASTNode).value as string).toUpperCase();
                  }
                }
              }
              const hint = `${method} ${path}`;
              const key = `${file.path}⟹${hint}`;
              if (!seen.has(key)) {
                seen.add(key);
                result.push({
                  id:          `${file.path}:fetch:${nodeIndex++}`,
                  filePath:    file.path,
                  module:      mod,
                  handlerName: '',
                  label:       '',
                  callsApi:    true,
                  apiHint:     hint,
                  description: `Envia dados para ${hint}`,
                });
              }
            }

            // axios.verb('/path') / apiClient.verb('/path')
            if (
              innerCallee.type === 'MemberExpression' &&
              !innerCallee.computed &&
              innerArgs[0]?.type === 'StringLiteral'
            ) {
              const obj  = (innerCallee.object as ASTNode)?.name as string;
              const verb = (innerCallee.property as ASTNode)?.name as string;
              if (
                (obj === 'axios' || obj === 'apiClient') &&
                ['get', 'post', 'put', 'patch', 'delete'].includes(verb)
              ) {
                const path = innerArgs[0].value as string;
                const hint = `${verb.toUpperCase()} ${path}`;
                const key = `${file.path}⟹${hint}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  result.push({
                    id:          `${file.path}:axios:${nodeIndex++}`,
                    filePath:    file.path,
                    module:      mod,
                    handlerName: '',
                    label:       '',
                    callsApi:    true,
                    apiHint:     hint,
                    description: `${obj}.${verb}('${path}') → envia dados para ${hint}`,
                  });
                }
              }
            }
          });
        }
      });
    }

    return result;
  }
}
