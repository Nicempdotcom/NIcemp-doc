/**
 * DescriptionAnalyzer
 *
 * Heuristic (regex-based, no AST parser) generation of plain-Portuguese
 * one-sentence descriptions for pages, components, hooks, APIs, and database
 * entities detected by the StructureAnalyzer.
 *
 * Priority:
 *   a) Leading JSDoc (/** *\/) or consecutive // comments near the top of the
 *      file → use the first sentence as description.
 *   b) Heuristics derived from folder path + file name → conservative generic
 *      phrase that is always honest (never invents domain-specific details).
 *
 * Deliberately conservative: prefers a generic-but-honest phrase over
 * asserting business logic not evident in name or comment — same philosophy
 * as InteractionAnalyzer.ts.
 */

import type { CategorizedFile } from './types';

// ─── useSeo extraction ───────────────────────────────────────────────────────

/**
 * Look for a `useSeo({ title: '…', description: '…' })` call near the top of
 * the file and return the description string when found. Returns '' otherwise.
 * Handles both single/double quotes and template literals. The search window
 * is limited to the first 3 000 characters so it stays fast on large files.
 */
function extractUseSeoDescription(content: string): string {
  const window = content.slice(0, 3_000);
  const blockMatch = window.match(/useSeo\s*\(\s*\{([\s\S]{0,600}?)\}/);
  if (!blockMatch) return '';
  const block = blockMatch[1];
  const descMatch = block.match(/description\s*:\s*(['"`])([\s\S]*?)\1/);
  if (descMatch && descMatch[2].trim().length > 3) return descMatch[2].trim();
  return '';
}

/**
 * Look for a `useSeo({ title: '…' … })` call and return the title string.
 * Returns '' when not found.
 */
export function extractUseSeoTitle(content: string): string {
  const window = content.slice(0, 3_000);
  const blockMatch = window.match(/useSeo\s*\(\s*\{([\s\S]{0,600}?)\}/);
  if (!blockMatch) return '';
  const block = blockMatch[1];
  const titleMatch = block.match(/title\s*:\s*(['"`])([\s\S]*?)\1/);
  if (titleMatch && titleMatch[2].trim().length > 1) return titleMatch[2].trim();
  return '';
}

// ─── Comment extraction ──────────────────────────────────────────────────────

/**
 * Try to extract the first sentence of the leading JSDoc block (/** ... *\/)
 * or a run of consecutive // comments near the start of the file.
 * Returns '' when nothing usable is found.
 */
function extractLeadingComment(content: string): string {
  if (!content) return '';

  // ── JSDoc block (/** ... */) ──────────────────────────────────────────────
  const jsdocMatch = content.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
  if (jsdocMatch) {
    const raw = jsdocMatch[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .filter(
        (l) =>
          l.length > 0 &&
          !l.startsWith('@') &&
          !l.startsWith('─') &&
          !l.startsWith('-'),
      )
      .join(' ');
    const first = raw.split(/[.!?]/)[0].trim();
    if (first.length > 8) return first;
  }

  // ── Consecutive // comments at top of file ────────────────────────────────
  const lineCommentBlock = content.match(/^([ \t]*\/\/[^\n]*\n)+/m);
  if (lineCommentBlock) {
    const raw = lineCommentBlock[0]
      .split('\n')
      .map((l) => l.replace(/^\s*\/\/\s?/, '').trim())
      .filter(
        (l) =>
          l.length > 0 &&
          !l.startsWith('─') &&
          !l.startsWith('=') &&
          !l.startsWith('@') &&
          !/^[A-Z\s]{4,}$/.test(l), // skip ALL-CAPS section headers
      )
      .join(' ');
    const first = raw.split(/[.!?]/)[0].trim();
    if (first.length > 8) return first;
  }

  return '';
}

// ─── Props interface extraction (components) ──────────────────────────────────

/**
 * Finds the first TypeScript `interface Props` or `type Props` near the top of
 * a component file and returns a Portuguese description of its key props.
 * E.g. `{ title: string; onClose: () => void }` → "Recebe title (string) e onClose".
 */
function extractPropsDescription(content: string): string {
  const window = content.slice(0, 4_000);
  // Match: interface XxxProps { ... } or type XxxProps = { ... }
  const blockMatch = window.match(/(?:interface|type)\s+\w*Props\w*\s*(?:=\s*)?\{([\s\S]{0,600}?)\}/);
  if (!blockMatch) return '';

  const body = blockMatch[1];
  // Extract each `propName: type` pair (ignore optional marker `?`)
  const propRe = /\b(\w+)\??\s*:\s*([^;,\n]+)/g;
  const props: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(body)) !== null && props.length < 4) {
    const propName = m[1];
    const propType = m[2].trim().replace(/\s+/g, ' ');
    // Skip internal-looking props (children, className, style)
    if (/^(children|className|style|ref|key)$/.test(propName)) continue;
    props.push(`${propName} (${propType.slice(0, 30)})`);
  }

  if (props.length === 0) return '';
  if (props.length === 1) return `Componente que recebe ${props[0]}`;
  const last = props[props.length - 1];
  const rest = props.slice(0, -1).join(', ');
  return `Componente que recebe ${rest} e ${last}`;
}

// ─── JSDoc tag extraction (hooks + APIs) ─────────────────────────────────────

/**
 * Extracts `@param` / `@returns` / `@description` tags from JSDoc blocks and
 * assembles a short plain-text sentence. Returns '' if nothing useful is found.
 */
function extractJsDocTags(content: string): string {
  const window = content.slice(0, 4_000);
  const jsdocMatch = window.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
  if (!jsdocMatch) return '';

  const lines = jsdocMatch[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);

  const descriptionLine = lines.find((l) => !l.startsWith('@') && l.length > 6);
  const returnsLine = lines.find((l) => /^@returns?\b/.test(l));
  const paramLines  = lines.filter((l) => /^@param\b/.test(l)).slice(0, 3);

  const parts: string[] = [];
  if (descriptionLine) parts.push(descriptionLine.split(/[.!?]/)[0].trim());

  if (paramLines.length > 0) {
    const paramNames = paramLines
      .map((l) => l.replace(/@param\s*(?:\{[^}]+\})?\s*/, '').split(/\s/)[0])
      .filter(Boolean)
      .join(', ');
    if (paramNames) parts.push(`Parâmetros: ${paramNames}`);
  }

  if (returnsLine) {
    const ret = returnsLine.replace(/@returns?\s*(?:\{[^}]+\})?\s*/, '').trim();
    if (ret.length > 2) parts.push(`Retorna ${ret.slice(0, 60)}`);
  }

  const result = parts.join('. ').trim();
  return result.length > 8 ? result : '';
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Splits a camelCase string into individual words lowercased. */
function splitCamel(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .trim();
}

/** Capitalise first letter. */
function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─── Per-category heuristics ─────────────────────────────────────────────────

function describePageByName(baseName: string, filePath: string): string {
  const lower = baseName.toLowerCase();
  const pathLower = filePath.toLowerCase();

  if (/login|signin|sign-in/.test(lower)) return 'Tela de login';
  if (/signup|sign-up|register|cadastro-usuario|novo-usuario/.test(lower))
    return 'Tela de cadastro de usuário';
  if (/dashboard/.test(lower)) return 'Tela inicial com resumo geral';
  if (/home|inicio|início/.test(pathLower) && !/home[a-z]/.test(lower))
    return 'Tela inicial com resumo geral';
  if (/list|listagem|listing/.test(lower)) return 'Tela de listagem';
  if (/form|new\b|create|criar|novo\b|cadastro/.test(lower)) return 'Tela de cadastro';
  if (/detail|detalhe/.test(lower)) return 'Tela de detalhes';
  if (/edit|editar|update|atualizar/.test(lower)) return 'Tela de edição';
  if (/settings|configurac|config/.test(lower)) return 'Tela de configurações';
  if (/profile|perfil/.test(lower)) return 'Tela de perfil do usuário';
  if (/not.?found|notfound|404/.test(lower)) return 'Tela de página não encontrada';
  if (/upload|envio/.test(lower)) return 'Tela de envio de arquivo';
  if (/history|historico|histórico/.test(lower)) return 'Tela de histórico';
  if (/report|relatorio|relatório/.test(lower)) return 'Tela de relatório';
  if (/search|busca/.test(lower)) return 'Tela de busca';
  if (/overview|resumo/.test(lower)) return 'Tela de visão geral';
  if (/compare|comparison|comparac/.test(lower)) return 'Tela de comparação';
  if (/glossary|glossario|glossário/.test(lower)) return 'Tela de glossário';
  if (/import|upload/.test(lower)) return 'Tela de importação';

  // Generic: derive from the file name
  const humanized = splitCamel(
    baseName.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'),
  );
  return `Tela de ${cap(humanized)}`;
}

function describeComponentByName(baseName: string): string {
  if (/Card$/i.test(baseName)) return 'Cartão de exibição de dados';
  if (/Modal|Dialog$/i.test(baseName)) return 'Janela modal';
  if (/Table|Grid$/i.test(baseName)) return 'Tabela de dados';
  if (/Form$/i.test(baseName)) return 'Formulário';
  if (/Button|Btn$/i.test(baseName)) return 'Botão de ação';
  if (/Header$/i.test(baseName)) return 'Cabeçalho';
  if (/Footer$/i.test(baseName)) return 'Rodapé';
  if (/Sidebar|Nav|Menu$/i.test(baseName)) return 'Menu de navegação';
  if (/Badge$/i.test(baseName)) return 'Etiqueta de status';
  if (/Tabs?$/i.test(baseName)) return 'Abas de navegação';
  if (/Input|Field$/i.test(baseName)) return 'Campo de entrada';
  if (/Select|Dropdown$/i.test(baseName)) return 'Lista de seleção';
  if (/Checkbox|Radio$/i.test(baseName)) return 'Opção de seleção';
  if (/Chart|Graph$/i.test(baseName)) return 'Gráfico de dados';
  if (/Icon$/i.test(baseName)) return 'Ícone';
  if (/Spinner|Loader|Loading$/i.test(baseName)) return 'Indicador de carregamento';
  if (/Toast|Alert|Notification|Snack$/i.test(baseName)) return 'Notificação';
  if (/Avatar$/i.test(baseName)) return 'Avatar do usuário';
  if (/Drawer$/i.test(baseName)) return 'Painel lateral deslizante';
  if (/Tooltip$/i.test(baseName)) return 'Dica flutuante';
  if (/Breadcrumb$/i.test(baseName)) return 'Trilha de navegação';
  if (/Pagination$/i.test(baseName)) return 'Componente de paginação';
  if (/Accordion$/i.test(baseName)) return 'Seção expansível';
  if (/Section$/i.test(baseName)) return 'Seção de conteúdo';
  if (/Layout$/i.test(baseName)) return 'Estrutura de layout';
  if (/Provider$/i.test(baseName)) return 'Provedor de contexto';
  if (/Container$/i.test(baseName)) return 'Contêiner de layout';
  if (/List$/i.test(baseName)) return 'Lista de itens';
  if (/Item$/i.test(baseName)) return 'Item de lista';

  // Generic: split camelCase into human-readable
  const humanized = splitCamel(baseName.replace(/[-_]/g, ' '));
  return `Componente de ${humanized}`;
}

function describeHookByName(baseName: string): string {
  // Strip the "use" prefix (case-insensitive to be safe)
  const withoutUse = baseName.replace(/^use/i, '');
  if (!withoutUse) return 'Hook de lógica reutilizável';
  const humanized = splitCamel(withoutUse.replace(/[-_]/g, ' '));
  return `Lógica reutilizável para ${humanized}`;
}

function describeApiByPathAndContent(filePath: string, content: string): string {
  // Try to detect HTTP method from the file content
  const methodMatch = content.match(
    /\b(?:router|app|server|route)\.(get|post|put|patch|delete)\s*\(/i,
  );
  const method = methodMatch ? methodMatch[1].toUpperCase() : null;

  // Derive a resource name from the file path (skip generic segment names)
  const skipSegments = new Set([
    'api', 'apis', 'routes', 'route', 'controllers', 'controller',
    'handlers', 'handler', 'endpoints', 'endpoint', 'src', 'app', 'server',
    'lib', 'index',
  ]);
  const segments = filePath
    .replace(/\.[^/.]+$/, '')
    .split('/')
    .filter(Boolean)
    .filter((p) => !skipSegments.has(p.toLowerCase()));

  const resourceRaw = segments[segments.length - 1] ?? 'dados';
  const resource = splitCamel(resourceRaw.replace(/[-_.]/g, ' '));

  if (method === 'GET')                      return `Busca ${resource}`;
  if (method === 'POST')                     return `Cria ${resource}`;
  if (method === 'PUT' || method === 'PATCH') return `Atualiza ${resource}`;
  if (method === 'DELETE')                   return `Remove ${resource}`;

  return `Endpoint de ${resource}`;
}

function describeTableByName(baseName: string): string {
  const humanized = splitCamel(
    baseName.replace(/[-_.]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'),
  );
  return `Tabela que guarda informações de ${humanized}`;
}

// ─── Analyzer ────────────────────────────────────────────────────────────────

const RELEVANT_CATEGORIES = new Set<string>(['page', 'component', 'hook', 'api', 'database']);

export class DescriptionAnalyzer {
  /**
   * Analyse the categorised file list and return a Map from file path to
   * plain-Portuguese description string. Files whose category is not in the
   * relevant set (page/component/hook/api/database) are skipped.
   */
  analyze(files: CategorizedFile[]): Map<string, string> {
    const result = new Map<string, string>();

    for (const file of files) {
      if (file.isBinary) continue;
      if (!RELEVANT_CATEGORIES.has(file.category)) continue;

      // ── Priority 0: useSeo({ description }) — only for pages ──────────────
      if (file.category === 'page') {
        const fromUseSeo = extractUseSeoDescription(file.content);
        if (fromUseSeo) {
          result.set(file.path, fromUseSeo);
          continue;
        }
      }

      // ── Priority a: leading JSDoc/comment ────────────────────────────────
      const fromComment = extractLeadingComment(file.content);
      if (fromComment) {
        result.set(file.path, fromComment);
        continue;
      }

      // ── Priority a2: TypeScript prop interface (components only) ──────────
      if (file.category === 'component') {
        const fromProps = extractPropsDescription(file.content);
        if (fromProps) {
          result.set(file.path, fromProps);
          continue;
        }
      }

      // ── Priority a3: JSDoc @param / @returns (hooks + APIs) ───────────────
      if (file.category === 'hook' || file.category === 'api') {
        const fromTags = extractJsDocTags(file.content);
        if (fromTags) {
          result.set(file.path, fromTags);
          continue;
        }
      }

      // ── Priority b: heuristic by category ─────────────────────────────────
      const baseName = file.name.replace(/\.(tsx?|jsx?|mts?|cts?)$/, '');
      let description = '';

      switch (file.category) {
        case 'page':
          description = describePageByName(baseName, file.path);
          break;
        case 'component':
          description = describeComponentByName(baseName);
          break;
        case 'hook':
          description = describeHookByName(baseName);
          break;
        case 'api':
          description = describeApiByPathAndContent(file.path, file.content);
          break;
        case 'database':
          description = describeTableByName(baseName);
          break;
      }

      if (description) {
        result.set(file.path, description);
      }
    }

    return result;
  }
}
