/**
 * glossary.ts
 *
 * Central dictionary of all terms and screens used across NicEmp Docs,
 * explained in plain, jargon-free Portuguese for non-technical stakeholders.
 *
 * Add a term here once and reference it anywhere via <TermHint termo="..." />
 * or browse every term on the "/glossario" page, grouped by category.
 */

export interface GlossaryEntry {
  termo: string;
  explicacao: string;
  categoria: 'conceito' | 'indicador' | 'tela' | 'documentacao';
}

export const GLOSSARY_ITEMS: GlossaryEntry[] = [
  // ── Conceitos gerais ──────────────────────────────────────────────
  { categoria: 'conceito', termo: 'Página',            explicacao: 'Uma tela do site — o que a pessoa vê quando acessa um endereço, como /login ou /dashboard.' },
  { categoria: 'conceito', termo: 'Componente',        explicacao: 'Um pedaço reutilizável de tela, como um botão, um card ou um formulário, que pode aparecer em várias páginas diferentes.' },
  { categoria: 'conceito', termo: 'Hook',              explicacao: 'Um pedaço de lógica reutilizável que várias telas usam por trás dos panos — não aparece visualmente, só faz o sistema funcionar.' },
  { categoria: 'conceito', termo: 'API',               explicacao: "A 'ponte' entre o site e o servidor — é por onde o site pede ou envia informações (ex.: salvar um pedido, buscar dados de um cliente)." },
  { categoria: 'conceito', termo: 'Banco de Dados',    explicacao: 'Onde as informações ficam guardadas de forma permanente (clientes, pedidos, produtos etc.).' },
  { categoria: 'conceito', termo: 'Tabela',            explicacao: "Uma \"gaveta\" dentro do banco de dados, onde um tipo específico de informação fica guardado (ex.: a tabela de clientes, a tabela de pedidos)." },
  { categoria: 'conceito', termo: 'Módulo',            explicacao: "Um grupo de páginas/componentes/APIs que trabalham juntos numa mesma parte do sistema (ex.: tudo relacionado a 'Pedidos')." },
  { categoria: 'conceito', termo: 'Dependência',       explicacao: 'Uma ferramenta pronta, feita por outra empresa/pessoa, que o projeto usa em vez de reinventar (ex.: uma biblioteca de calendário).' },
  { categoria: 'conceito', termo: 'Interação',         explicacao: 'Uma ação que o usuário faz clicando em algo (um botão, um link) e o que acontece como consequência.' },
  { categoria: 'conceito', termo: 'Rota',              explicacao: 'O endereço de uma página dentro do site, como /login ou /dashboard — é o que aparece na barra do navegador.' },
  { categoria: 'conceito', termo: 'Arquitetura',       explicacao: 'Como as partes do sistema (telas, lógica, servidor, banco de dados) se encaixam e conversam entre si.' },
  { categoria: 'conceito', termo: 'Frontend',          explicacao: 'A parte do sistema que a pessoa vê e usa diretamente no navegador: telas, botões, formulários.' },
  { categoria: 'conceito', termo: 'Backend',           explicacao: 'A parte do sistema que roda no servidor, fora da vista do usuário — recebe pedidos, processa regras e acessa o banco de dados.' },
  { categoria: 'conceito', termo: 'Fluxo de Navegação', explicacao: 'O caminho que a pessoa percorre clicando de uma tela para outra dentro do site.' },

  // ── Indicadores e status usados nas telas ────────────────────────
  { categoria: 'indicador', termo: 'Status (Estável / Instável / Depreciado)', explicacao: 'Mostra a "saúde" de uma página ou componente: Estável significa que está funcionando normalmente; Depreciado significa que ainda existe mas está sendo substituído; Instável indica risco de quebra.' },
  { categoria: 'indicador', termo: 'Nível de Risco',         explicacao: 'Uma estimativa de quão arriscado é mexer numa parte do código: Baixo (mudança segura), Médio (merece atenção) ou Alto (pode quebrar outras partes do sistema, como banco de dados e APIs).' },
  { categoria: 'indicador', termo: 'Versão',                 explicacao: 'Um retrato do projeto analisado em um determinado momento — toda vez que um novo ZIP é enviado, uma nova versão é criada, permitindo comparar o antes e o depois.' },
  { categoria: 'indicador', termo: 'Grafo de Dependências',  explicacao: 'Um "mapa" que mostra quais páginas, componentes, hooks e APIs estão conectados entre si dentro do mesmo módulo.' },
  { categoria: 'indicador', termo: 'Rota Inferida',          explicacao: 'O endereço (URL) que o sistema deduz automaticamente pra uma página, com base em onde o arquivo dela está guardado no projeto.' },
  { categoria: 'indicador', termo: 'Correspondência Exata',  explicacao: 'Quando a URL colada no Explorador ao vivo bate certinho com a rota inferida de uma página já detectada no projeto.' },
  { categoria: 'indicador', termo: 'Snapshot',               explicacao: 'Uma foto congelada de todos os dados de uma versão — usada internamente para comparar o que mudou entre duas análises.' },
  { categoria: 'indicador', termo: 'EPIC',                   explicacao: 'Um grande bloco de funcionalidade do NicEmp Docs (ex.: EPIC 10 = Explorador ao vivo). Aparece nas badges de cada tela para indicar a qual ciclo de desenvolvimento ela pertence.' },
  { categoria: 'indicador', termo: 'Categoria de Nó',        explicacao: 'O tipo de entidade num grafo de dependências: Página, Componente, Hook, API ou Tabela.' },

  // ── Telas da plataforma ───────────────────────────────────────────
  { categoria: 'tela', termo: 'Dashboard',           explicacao: 'Tela inicial com um resumo geral do projeto analisado: quantidade de páginas, componentes, APIs e outras estatísticas rápidas.' },
  { categoria: 'tela', termo: 'Upload',              explicacao: 'Onde você envia o arquivo ZIP do projeto pra ser analisado. É o ponto de partida — sem isso, as outras telas ficam vazias.' },
  { categoria: 'tela', termo: 'Projeto',             explicacao: 'Lista detalhada de tudo que foi encontrado na última análise: todas as páginas, componentes, hooks e APIs, um por um.' },
  { categoria: 'tela', termo: 'Histórico',           explicacao: 'Lista de todas as versões (análises) já feitas do projeto, permitindo ver e apagar versões antigas.' },
  { categoria: 'tela', termo: 'Comparação',          explicacao: 'Mostra o que mudou entre duas versões do projeto — o que foi adicionado, removido ou alterado.' },
  { categoria: 'tela', termo: 'Impacto',             explicacao: 'Ajuda a responder "se eu mexer nisso, o que mais pode quebrar?" — mostra tudo que depende de uma determinada parte do sistema.' },
  { categoria: 'tela', termo: 'Organograma',         explicacao: 'Visão visual de como os módulos do sistema se relacionam entre si, como um organograma de empresa, mas para o código.' },
  { categoria: 'tela', termo: 'Explorador ao vivo',  explicacao: 'Você cola a URL de uma tela em produção e o sistema descobre qual arquivo é essa página e tudo relacionado a ela (componentes, hooks, APIs).' },
  { categoria: 'tela', termo: 'Prompts Replit',      explicacao: 'Gera automaticamente um texto pronto (prompt) pra pedir uma mudança específica pro Replit Agent, já com contexto técnico da parte do sistema envolvida.' },
  { categoria: 'tela', termo: 'Glossário',           explicacao: 'Esta tela — explica em português simples todos os termos técnicos e os nomes das telas do NicEmp Docs.' },
  { categoria: 'tela', termo: 'Configurações',       explicacao: 'Ajustes gerais da própria ferramenta NicEmp Docs (não do projeto analisado).' },

  // ── Seções de documentação ────────────────────────────────────────
  { categoria: 'documentacao', termo: 'Arquitetura (seção)',    explicacao: 'Documentação de como as camadas do sistema se conectam de ponta a ponta.' },
  { categoria: 'documentacao', termo: 'Frontend (seção)',       explicacao: 'Lista e documentação de tudo que é tela/visual no projeto analisado.' },
  { categoria: 'documentacao', termo: 'Backend (seção)',        explicacao: 'Lista e documentação de tudo que roda no servidor no projeto analisado.' },
  { categoria: 'documentacao', termo: 'Banco de Dados (seção)', explicacao: 'Lista das tabelas e estrutura de dados encontradas no projeto analisado.' },
  { categoria: 'documentacao', termo: 'Componentes (seção)',    explicacao: 'Lista de todos os componentes de tela encontrados no projeto.' },
  { categoria: 'documentacao', termo: 'Hooks (seção)',          explicacao: 'Lista de toda a lógica reutilizável encontrada no projeto.' },
  { categoria: 'documentacao', termo: 'APIs (seção)',           explicacao: 'Lista de todos os pontos de comunicação com o servidor encontrados no projeto.' },
  { categoria: 'documentacao', termo: 'Dependências (seção)',   explicacao: 'Lista de todas as ferramentas prontas (bibliotecas) que o projeto usa.' },
  { categoria: 'documentacao', termo: 'Módulos (seção)',        explicacao: 'Lista de todos os grandes grupos/áreas em que o projeto está dividido.' },
];

/**
 * Compat: flat Record<string, string> used by <TermHint termo="..." />.
 * Derived from GLOSSARY_ITEMS so there's a single source of truth.
 */
export const GLOSSARY: Record<string, string> = Object.fromEntries(
  GLOSSARY_ITEMS.map(({ termo, explicacao }) => [termo, explicacao]),
);

/** Compat: alphabetically sorted flat list — for any code still importing GLOSSARY_TERMS. */
export const GLOSSARY_TERMS = [...GLOSSARY_ITEMS].sort((a, b) =>
  a.termo.localeCompare(b.termo, 'pt-BR'),
);
