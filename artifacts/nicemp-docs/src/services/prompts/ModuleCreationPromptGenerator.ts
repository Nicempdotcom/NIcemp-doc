// ─── Gerador de Prompt para Criação de Módulo (EPIC 09) ───────────────────────
//
// Builds a structured, copy-pasteable prompt for creating a new domain module
// in either NicEmp Docs or nicemp.com. Only produces TEXT — it never creates
// files or routes by itself.
//
// A "module" is a named domain grouping (e.g. "Pedidos", "Clientes") inferred
// from folder structure — see inferModule() in mapper.ts for how modules are
// currently derived. New modules must follow the same folder convention so
// they are correctly detected on the next ZIP upload.

export type ModuleProject = 'NicEmp Docs' | 'nicemp.com';

export interface ModuleCreationPromptInput {
  moduleName: string;
  project: ModuleProject;
  objective: string;
  hasPage: boolean;
  hasApi: boolean;
}

function moduleSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function buildObjectiveSection(input: ModuleCreationPromptInput): string {
  const obj = input.objective.trim() || 'Descreva aqui o propósito e as responsabilidades do módulo.';
  return [
    `Criar o novo módulo "${input.moduleName}" no projeto **${input.project}**.`,
    '',
    obj,
  ].join('\n');
}

function buildStepsSection(input: ModuleCreationPromptInput): string {
  const slug = moduleSlug(input.moduleName);
  const lines: string[] = [];

  if (input.project === 'NicEmp Docs') {
    lines.push(
      `a) Criar a pasta do módulo: \`src/services/${slug}/\` com pelo menos um arquivo de index (ex.: \`index.ts\`) que descreve as responsabilidades do módulo em comentário JSDoc.`,
    );
    if (input.hasPage) {
      lines.push(
        '',
        `b) Criar a página principal do módulo em \`src/app/pages/${input.moduleName}/index.tsx\` com \`<PageHeader />\` + conteúdo mínimo, e registrá-la conforme o processo padrão de criação de páginas (ROUTES → App.tsx → Sidebar.tsx, um arquivo por vez, sem remover itens existentes).`,
      );
    }
    if (input.hasApi) {
      lines.push(
        '',
        `${input.hasPage ? 'c' : 'b'}) Criar os endpoints de API do módulo em \`artifacts/api-server/src/routes/${slug}.ts\` e registrá-los em \`artifacts/api-server/src/index.ts\`, sem remover rotas existentes.`,
      );
    }
  } else {
    // nicemp.com
    lines.push(
      `a) Criar a pasta do módulo: \`src/features/${slug}/\` ou \`src/pages/${input.moduleName}/\`, seguindo a convenção já usada pelos módulos existentes no projeto (verificar qual padrão predomina antes de decidir).`,
    );
    if (input.hasPage) {
      lines.push(
        '',
        `b) Criar a página principal em \`src/pages/${input.moduleName}Calculator.tsx\` (ou o sufixo apropriado), registrar a rota em \`src/constants/routes.ts\` e em \`src/App.tsx\` — um item de cada vez, sem remover rotas existentes.`,
      );
    }
    if (input.hasApi) {
      lines.push(
        '',
        `${input.hasPage ? 'c' : 'b'}) Criar os hooks de comunicação com a API em \`src/hooks/use${input.moduleName}.ts\`, seguindo o padrão dos hooks existentes.`,
      );
    }
  }

  return lines.join('\n');
}

function buildAllowedFilesSection(input: ModuleCreationPromptInput): string {
  const slug = moduleSlug(input.moduleName);
  const lines: string[] = [];

  if (input.project === 'NicEmp Docs') {
    lines.push(`- Nova pasta \`src/services/${slug}/\` e seus arquivos`);
    if (input.hasPage) {
      lines.push(
        `- Nova pasta \`src/app/pages/${input.moduleName}/\` e seus arquivos`,
        '- `src/routes.tsx` (apenas a nova linha da rota)',
        '- `src/App.tsx` (apenas a nova linha de <Route />)',
        '- `src/app/layouts/Sidebar.tsx` (apenas o novo item de menu)',
      );
    }
    if (input.hasApi) {
      lines.push(
        `- \`artifacts/api-server/src/routes/${slug}.ts\` (novo arquivo)`,
        '- `artifacts/api-server/src/index.ts` (apenas a linha de registro da nova rota)',
      );
    }
  } else {
    lines.push(`- Nova pasta \`src/features/${slug}/\` ou \`src/pages/${input.moduleName}/\``);
    if (input.hasPage) {
      lines.push(
        '- `src/constants/routes.ts` (apenas a nova chave)',
        '- `src/App.tsx` (apenas a nova linha de <Route />)',
      );
    }
    if (input.hasApi) {
      lines.push(`- \`src/hooks/use${input.moduleName}.ts\` (novo arquivo)`);
    }
  }

  lines.push('', 'Nada além disso — especialmente App.tsx e arquivos de roteamento: adicione APENAS as linhas novas.');
  return lines.join('\n');
}

function buildChecklistSection(input: ModuleCreationPromptInput): string {
  const lines = [
    `- [ ] A pasta do módulo "${input.moduleName}" foi criada seguindo a convenção de nomenclatura do projeto.`,
  ];
  if (input.hasPage) {
    lines.push(
      `- [ ] A página do módulo abre no navegador sem erro de console.`,
      `- [ ] O item de menu aparece no grupo correto do sidebar, sem que nenhum item existente tenha sido removido.`,
    );
  }
  if (input.hasApi) {
    lines.push(`- [ ] Os endpoints de API respondem com o status esperado.`);
  }
  lines.push(
    `- [ ] Nenhum arquivo fora da lista de "Arquivos permitidos" foi alterado.`,
    `- [ ] Em um novo upload de ZIP, o módulo "${input.moduleName}" é detectado corretamente pelo NicEmp Docs.`,
  );
  return lines.join('\n');
}

export function buildModuleCreationPrompt(input: ModuleCreationPromptInput): string {
  return [
    `# Prompt para Replit — Criar Módulo: ${input.moduleName}`,
    `> Projeto de destino: **${input.project}**`,
    '',
    '## 1. Objetivo',
    buildObjectiveSection(input),
    '',
    '## 2. Passo a passo obrigatório',
    buildStepsSection(input),
    '',
    '## 3. Arquivos permitidos',
    buildAllowedFilesSection(input),
    '',
    '## 4. Arquivos proibidos',
    '- Qualquer outro arquivo não listado acima.',
    '- ⚠️ App.tsx e arquivos de roteamento: NÃO reescreva — adicione APENAS a linha nova.',
    '',
    '## 5. Checklist final',
    buildChecklistSection(input),
    '',
    '## 6. Ao concluir',
    '⚠️ Obrigatório: liste todos os arquivos que foram criados/modificados.',
  ].join('\n');
}
