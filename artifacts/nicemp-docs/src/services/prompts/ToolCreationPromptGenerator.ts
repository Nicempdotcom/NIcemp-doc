// ─── Gerador de Prompt para Criação de Ferramenta no nicemp.com (EPIC 09) ─────
//
// Builds a structured, copy-pasteable prompt that a developer can hand to the
// Replit Agent when they need a NEW calculator/tool added to the nicemp.com
// site (a separate project — artifacts/nicemp/ — not the NicEmp Docs app
// itself). This generator only produces TEXT — it never creates files or
// edits routes/catalogs by itself.
//
// IMPORTANTE — o catálogo de ferramentas do nicemp.com NÃO é centralizado:
// `allTools` (ToolsHome.tsx), `ToolsSection.tsx` (destaques da home) e
// `ToolsCarousel.tsx` (carrossel da home) são listas manuais e separadas,
// cada uma com sua própria estrutura de dados.

export type ToolCategory = 'Financeiro' | 'Tributário' | 'Matemática' | 'Gestão';

export interface ToolCreationPromptInput {
  /** Nome de exibição da ferramenta, ex: "Calculadora de Depreciação". */
  toolName: string;
  /** Chave em routes.ts, ex: "depreciacao". */
  routeKey: string;
  /** Caminho da rota, ex: "/ferramentas/calculadora-de-depreciacao". */
  routePath: string;
  category: ToolCategory;
  /** Nome de um ícone de lucide-react, ex: "Calculator". */
  iconName: string;
  /** Se true, inclui o passo de destacar na home (ToolsSection + ToolsCarousel). */
  featureOnHome: boolean;
  /** O que a ferramenta calcula/faz. */
  objective: string;
}

function toPascalCase(routeKey: string): string {
  return routeKey
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function buildObjectiveSection(input: ToolCreationPromptInput): string {
  const objective = input.objective.trim() || 'Descreva aqui o que a ferramenta calcula/faz.';
  return [
    `Criar a nova ferramenta "${input.toolName}", no caminho \`${input.routePath}\`.`,
    '',
    objective,
  ].join('\n');
}

function buildStepsSection(input: ToolCreationPromptInput, pascalName: string): string {
  const componentName = `${pascalName}Calculator`;
  const lines = [
    `a) Adicionar a chave em \`src/constants/routes.ts\`: \`${input.routeKey}: '${input.routePath}',\``,
    '',
    `b) Criar \`src/pages/${componentName}.tsx\` seguindo o padrão já usado pelas ferramentas` +
      ' existentes (ver `src/pages/PorcentagemCalculator.tsx` ou `src/pages/AreaPerimetroCalculator.tsx`' +
      ' como referência de estrutura/estilo — não copiar conteúdo): `<Header />` + `<main>` com' +
      ' `useSeo({ title, description, canonicalPath })` no topo do componente + conteúdo da calculadora' +
      ' + `<FaqSection items={faqs} />` (opcional, se fizer sentido pro tema) + `<Footer />`.',
    '',
    `c) Importar e adicionar UMA linha \`<Route path={routes.${input.routeKey}} component={${componentName}} />\`` +
      ' em `src/App.tsx` (roteador wouter), sem remover ou reordenar as rotas existentes.',
    '',
    `d) Adicionar UM objeto novo no array \`allTools\` de \`src/pages/ToolsHome.tsx\`, com os campos` +
      ` title/description/href/icon/category ("${input.category}")` +
      ' e popular/comingSoon se fizer sentido, sem remover nem reordenar os itens já existentes.',
  ];

  if (input.featureOnHome) {
    lines.push(
      '',
      'e) Como featureOnHome = true: adicionar também UMA entrada em `src/components/ToolsSection.tsx`' +
        ' e UMA em `src/components/ToolsCarousel.tsx`, seguindo exatamente o formato de dado que cada' +
        ' um já usa (são estruturas diferentes entre si — não tentar unificar).',
    );
  } else {
    lines.push(
      '',
      'e) Como featureOnHome = false: NÃO adicionar nada em `ToolsSection.tsx` nem em `ToolsCarousel.tsx`.' +
        ' ⚠️ Aviso: a ferramenta ficará visível apenas em `/ferramentas`, não vai aparecer nos destaques' +
        ' nem no carrossel da home.',
    );
  }

  return lines.join('\n');
}

function buildAllowedFilesSection(input: ToolCreationPromptInput, componentName: string): string {
  const lines = [
    '- `src/constants/routes.ts`',
    '- `src/App.tsx`',
    '- `src/pages/ToolsHome.tsx`',
    `- \`src/pages/${componentName}.tsx\` (novo arquivo)`,
  ];
  if (input.featureOnHome) {
    lines.push('- `src/components/ToolsSection.tsx`', '- `src/components/ToolsCarousel.tsx`');
  }
  lines.push('', 'Nada além disso.');
  return lines.join('\n');
}

function buildForbiddenFilesSection(): string {
  return [
    '- Qualquer outro arquivo, especialmente `Footer.tsx` e `Header.tsx`, a menos que pedido explicitamente.',
    '',
    '⚠️ Não reescreva os arrays `allTools`/`ToolsSection`/`ToolsCarousel` inteiros — adicione apenas o' +
      ' item novo, mantendo todos os itens existentes exatamente como estão.',
  ].join('\n');
}

function buildChecklistSection(input: ToolCreationPromptInput): string {
  const lines = [
    `- [ ] A rota abre em \`${input.routePath}\` sem erro de console`,
    '- [ ] A ferramenta aparece em `/ferramentas`, na categoria certa, e é encontrada pela busca',
    '- [ ] Todas as ferramentas que já existiam antes continuam aparecendo em `/ferramentas` (conferir a lista completa, uma por uma)',
  ];
  if (input.featureOnHome) {
    lines.push('- [ ] A ferramenta aparece na home (destaques em ToolsSection e/ou carrossel em ToolsCarousel)');
  }
  return lines.join('\n');
}

/**
 * Builds the full "criar ferramenta" prompt text for nicemp.com. Meant to be
 * pasted directly into the Replit Agent chat on the nicemp.com project — it
 * does not create any file, route, or catalog entry itself.
 */
export function buildToolCreationPrompt(input: ToolCreationPromptInput): string {
  const pascalName = toPascalCase(input.routeKey);
  const componentName = `${pascalName}Calculator`;

  return [
    `# Prompt para Replit — Criar Ferramenta: ${input.toolName}`,
    '',
    '## 1. Objetivo',
    buildObjectiveSection(input),
    '',
    '## 2. Passo a passo obrigatório',
    buildStepsSection(input, pascalName),
    '',
    '## 3. Arquivos permitidos',
    buildAllowedFilesSection(input, componentName),
    '',
    '## 4. Arquivos proibidos',
    buildForbiddenFilesSection(),
    '',
    '## 5. Checklist final',
    buildChecklistSection(input),
    '',
    '## 6. Ao concluir',
    '⚠️ Obrigatório: liste todos os arquivos que foram criados/modificados.',
  ].join('\n');
}
