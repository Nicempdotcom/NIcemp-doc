// ─── Gerador de Prompt para Criação de Componente (EPIC 09) ───────────────────
//
// Builds a structured, copy-pasteable prompt for creating a new reusable
// component in either NicEmp Docs or nicemp.com. Only produces TEXT — it
// never creates files by itself.

export type ComponentProject = 'NicEmp Docs' | 'nicemp.com';
export type ComponentCategory = 'ui' | 'layout' | 'forms' | 'outro';

export interface ComponentCreationPromptInput {
  componentName: string;
  project: ComponentProject;
  category: ComponentCategory;
  propsDescription: string;
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  ui:     'UI genérico (botões, badges, cards)',
  layout: 'Layout (cabeçalho, sidebar, wrappers)',
  forms:  'Formulários / inputs',
  outro:  'Outro',
};

function componentDir(input: ComponentCreationPromptInput): string {
  if (input.project === 'NicEmp Docs') {
    if (input.category === 'ui')     return 'src/app/components/ui/';
    if (input.category === 'layout') return 'src/app/layouts/';
    return 'src/app/components/docs/';
  }
  // nicemp.com
  if (input.category === 'ui')     return 'src/components/ui/';
  if (input.category === 'layout') return 'src/components/layout/';
  return 'src/components/';
}

function buildObjectiveSection(input: ComponentCreationPromptInput, dir: string): string {
  const props = input.propsDescription.trim() || 'Descreva aqui as props e o comportamento esperado.';
  return [
    `Criar o novo componente \`${input.componentName}\` em \`${dir}${input.componentName}.tsx\`.`,
    `Categoria: ${CATEGORY_LABELS[input.category]}.`,
    '',
    props,
  ].join('\n');
}

function buildStepsSection(input: ComponentCreationPromptInput, dir: string): string {
  const lines = [
    `a) Criar \`${dir}${input.componentName}.tsx\` seguindo o padrão de componentes já existentes na mesma pasta (importar cn/clsx, usar variantes de Tailwind — não inventar classes novas que não existam no projeto).`,
    '',
    `b) Exportar o componente de forma nomeada (não default) para manter o padrão de barrel exports do projeto.`,
  ];
  if (input.project === 'NicEmp Docs') {
    lines.push('', 'c) Se o componente for de uso global, adicionar a exportação no barrel de componentes da pasta (index.ts), sem remover as exportações existentes.');
  }
  return lines.join('\n');
}

function buildAllowedFilesSection(dir: string, input: ComponentCreationPromptInput): string {
  const lines = [
    `- \`${dir}${input.componentName}.tsx\` (novo arquivo)`,
  ];
  if (input.project === 'NicEmp Docs') {
    lines.push(`- \`${dir}index.ts\` — apenas para adicionar a nova exportação, se existir.`);
  }
  lines.push('', 'Nada além disso.');
  return lines.join('\n');
}

function buildChecklistSection(input: ComponentCreationPromptInput, dir: string): string {
  return [
    `- [ ] O componente renderiza corretamente sem erros de console.`,
    `- [ ] As props documentadas acima funcionam como esperado, inclusive casos de borda (vazio, loading, erro).`,
    `- [ ] O componente está em \`${dir}${input.componentName}.tsx\` e não foi alterado nenhum outro arquivo além dos listados em "Arquivos permitidos".`,
    `- [ ] O estilo é consistente com o restante do projeto (mesmas cores, fontes e espaçamentos).`,
  ].join('\n');
}

export function buildComponentCreationPrompt(input: ComponentCreationPromptInput): string {
  const dir = componentDir(input);

  return [
    `# Prompt para Replit — Criar Componente: ${input.componentName}`,
    `> Projeto de destino: **${input.project}**`,
    '',
    '## 1. Objetivo',
    buildObjectiveSection(input, dir),
    '',
    '## 2. Passo a passo obrigatório',
    buildStepsSection(input, dir),
    '',
    '## 3. Arquivos permitidos',
    buildAllowedFilesSection(dir, input),
    '',
    '## 4. Arquivos proibidos',
    '- Qualquer outro arquivo existente — em especial arquivos de rotas, App.tsx e Sidebar.tsx.',
    '',
    '## 5. Checklist final',
    buildChecklistSection(input, dir),
    '',
    '## 6. Ao concluir',
    '⚠️ Obrigatório: liste todos os arquivos que foram criados/modificados.',
  ].join('\n');
}
