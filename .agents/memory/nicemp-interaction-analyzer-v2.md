---
name: InteractionAnalyzer v3 — AST-based navigation detection
description: Uses @babel/parser for real AST parsing; how ROUTES resolution works; what patterns are and aren't handled.
---

# InteractionAnalyzer v3 (AST-based)

## The rule
Use `@babel/parser` (top-level import, not dynamic) to parse each source file into a full AST, then walk with a custom depth-first `walk()` function. No `@babel/traverse` — the manual walker is lighter and sufficient.

**Why:** Regex broke on multi-line attributes, nested JSX, and string literals that looked like code. AST parsing is structurally correct.

## ROUTES resolution
1. Find route-config files via `ROUTE_FILE_RE` (`routes.ts`, `navigation.ts`, etc.)
2. Parse each with `@babel/parser`
3. Walk AST for `VariableDeclaration` / `ExportDefaultDeclaration` with `ObjectExpression`
4. Extract `key: '/path'` ObjectProperty pairs into a `Map<string, string>`
5. Use this map when walking page/component files to resolve `<Link to={ROUTES.key}>`

## Patterns detected
- `<Link to="…">` / `<NavLink to="…">` — JSXOpeningElement + `to` StringLiteral attr
- `<Link to={ROUTES.key}>` — `to` JSXExpressionContainer with MemberExpression → resolved via routeKeyMap
- `<Link to={`/static`}>` — TemplateLiteral with 0 expressions
- `<a href="/internal">` — JSXOpeningElement `href` StringLiteral
- `navigate('/route')` — CallExpression with Identifier callee
- `navigate(ROUTES.key)` — CallExpression with MemberExpression arg → resolved
- `navigate(-1)` — UnaryExpression(-1) or NumericLiteral(-1)
- `router.push('/route')` / `history.push('/route')` — MemberExpression callee
- onClick → `fetch`/`axios` — API interaction detection (walk into JSXAttribute onClick)

## What's NOT detected
- `to={someVariable}` — runtime variable (unresolvable without execution)
- Template literals with interpolation: `to={`${ROUTES.users}/${id}`}`
- Custom route helper functions: `to={routeFor('dashboard')}`
- These are tracked in follow-up task #3 (dynamic routes)

## "Build-time" clarification
The user's "build-time" means "statically when the ZIP is uploaded, not from accumulated runtime user clicks." The analysis pipeline in `runAnalysisPipeline.ts` already achieves this — it runs synchronously on upload. A separate CI script would break the core use case (analyzing arbitrary user-uploaded ZIPs).
