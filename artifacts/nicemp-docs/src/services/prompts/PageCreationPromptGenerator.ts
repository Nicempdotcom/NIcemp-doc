// ─── Gerador de Prompt para Criação de Página (EPIC 09) ───────────────────────
//
// Builds a structured, copy-pasteable prompt that a developer can hand to the
// Replit Agent when they need a NEW page added to NicEmp Docs. This generator
// only produces TEXT — it never creates files or edits routes by itself. It
// exists because App.tsx and Sidebar.tsx have been rewritten wholesale during
// feature work before and silently dropped existing routes/menu items more
// than once, so the generated prompt is deliberately explicit about touching
// only one line at a time.

import { PROMPT_GENERAL_RULES } from './promptRules';

export type NavGroupName = 'Plataforma' | 'Documentação' | 'Sistema';

export interface PageCreationPromptInput {
  /** Nome de exibição da página, ex: "Relatórios". */
  pageName: string;
  /** Chave em ROUTES (src/routes.tsx), ex: "relatorios". */
  routeKey: string;
  /** Caminho da rota, ex: "/relatorios". */
  routePath: string;
  /** Grupo do menu onde o item deve ser adicionado. */
  navGroup: NavGroupName;
  /** Nome de um ícone de lucide-react, ex: "FileText". */
  iconName: string;
  /** Descrição livre do que a página deve mostrar/fazer. */
  objective: string;
}

function toPascalCase(routeKey: string): string {
  return routeKey
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function buildObjectiveSection(input: PageCreationPromptInput): string {
  const objective = input.objective.trim() || 'Descreva aqui o que a página deve mostrar/fazer.';
  return [
    `Criar a nova página "${input.pageName}", no caminho \`${input.routePath}\`.`,
    '',
    objective,
  ].join('\n');
}

function buildStepsSection(input: PageCreationPromptInput, pascalName: string): string {
  return [
    `a) Adicionar a chave em ROUTES (\`src/routes.tsx\`): \`${input.routeKey}: '${input.routePath}',\``,
    '',
    `b) Criar \`src/app/pages/${pascalName}/index.tsx\` com \`<PageHeader />\` + conteúdo mínimo` +
      ' (pode usar placeholder "Conteúdo em construção" se o objetivo não detalhar o conteúdo).',
    '',
    `c) Importar o componente e adicionar UMA linha \`<Route path={ROUTES.${input.routeKey}} element={<${pascalName} />} />\`` +
      ' em `src/App.tsx`, SEM remover ou reordenar nenhuma das rotas já existentes.',
    '',
    `d) Adicionar UM item em NAV_GROUPS, no grupo "${input.navGroup}", com o ícone lucide-react` +
      ` "${input.iconName}" (importar do pacote \`lucide-react\`), SEM remover nem reordenar os itens já existentes do grupo.`,
  ].join('\n');
}

function buildAllowedFilesSection(pascalName: string): string {
  return [
    '- `src/routes.tsx`',
    '- `src/App.tsx`',
    '- `src/app/layouts/Sidebar.tsx`',
    `- A nova pasta \`src/app/pages/${pascalName}/\``,
    '',
    'Nada além disso.',
  ].join('\n');
}

function buildForbiddenFilesSection(): string {
  return [
    '- Qualquer outro arquivo.',
    '',
    "⚠️ App.tsx e Sidebar.tsx já perderam rotas/itens de menu existentes quando reescritos por " +
      'inteiro. Adicione APENAS a linha nova — não reescreva o arquivo, não reordene, não resuma.',
  ].join('\n');
}

function buildChecklistSection(input: PageCreationPromptInput): string {
  return [
    '- [ ] `pnpm --filter @workspace/nicemp-docs run check:routes` passa sem erro',
    '- [ ] A nova rota abre no navegador sem erro de console',
    `- [ ] O item aparece no grupo "${input.navGroup}" do menu, na posição em que foi adicionado`,
    '- [ ] TODAS as rotas e itens de menu que já existiam antes continuam presentes (conferir a lista completa, um por um, não só "parece que sim")',
  ].join('\n');
}

/**
 * Builds the full "criar página" prompt text. Meant to be pasted directly
 * into the Replit Agent chat — it does not create any file or route itself.
 */
export function buildPageCreationPrompt(input: PageCreationPromptInput): string {
  const pascalName = toPascalCase(input.routeKey);

  return [
    `# Prompt para Replit — Criar Página: ${input.pageName}`,
    '',
    '## 1. Objetivo',
    buildObjectiveSection(input),
    '',
    '## 2. Passo a passo obrigatório',
    buildStepsSection(input, pascalName),
    '',
    '## 3. Arquivos permitidos',
    buildAllowedFilesSection(pascalName),
    '',
    '## 4. Arquivos proibidos',
    buildForbiddenFilesSection(),
    '',
    '## 5. Checklist final',
    buildChecklistSection(input),
    '',
    '## 6. Ao concluir',
    '⚠️ Obrigatório: liste todos os arquivos que foram criados/modificados.',
    '',
    PROMPT_GENERAL_RULES,
  ].join('\n');
}
