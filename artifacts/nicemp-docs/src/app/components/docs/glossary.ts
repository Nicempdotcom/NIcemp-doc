/**
 * glossary.ts
 *
 * Central dictionary of technical terms used across NicEmp Docs, explained
 * in plain, jargon-free Portuguese for non-technical stakeholders.
 *
 * Add a term here once and reference it anywhere via <TermHint termo="..." />
 * or list every term at once on the "/glossario" page.
 */

export interface GlossaryEntry {
  termo: string;
  explicacao: string;
}

export const GLOSSARY: Record<string, string> = {
  'Página':
    'Uma tela do site — o que a pessoa vê quando acessa um endereço, como /login ou /dashboard.',
  'Componente':
    'Um pedaço reutilizável de tela, como um botão, um card ou um formulário, que pode aparecer em várias páginas diferentes.',
  'Hook':
    'Um pedaço de lógica reutilizável que várias telas usam por trás dos panos — não aparece visualmente, só faz o sistema funcionar.',
  'API':
    "A 'ponte' entre o site e o servidor — é por onde o site pede ou envia informações (ex.: salvar um pedido, buscar dados de um cliente).",
  'Banco de Dados':
    'Onde as informações ficam guardadas de forma permanente (clientes, pedidos, produtos etc.).',
  'Tabela':
    'Onde as informações ficam guardadas de forma permanente (clientes, pedidos, produtos etc.).',
  'Módulo':
    "Um grupo de páginas/componentes/APIs que trabalham juntos numa mesma parte do sistema (ex.: tudo relacionado a 'Pedidos').",
  'Dependência':
    'Uma ferramenta pronta, feita por outra empresa/pessoa, que o projeto usa em vez de reinventar (ex.: uma biblioteca de calendário).',
  'Interação':
    'Uma ação que o usuário faz clicando em algo (um botão, um link) e o que acontece como consequência.',
  'Rota':
    'O endereço de uma página dentro do site, como /login ou /dashboard — é o que aparece na barra do navegador.',
  'Arquitetura':
    'Como as partes do sistema (telas, lógica, servidor, banco de dados) se encaixam e conversam entre si.',
  'Frontend':
    'A parte do sistema que a pessoa vê e usa diretamente no navegador: telas, botões, formulários.',
  'Backend':
    'A parte do sistema que roda no servidor, fora da vista do usuário — recebe pedidos, processa regras e acessa o banco de dados.',
  'Fluxo de Navegação':
    'O caminho que a pessoa percorre clicando de uma tela para outra dentro do site.',
  'Arquitetura por trás':
    'Como as telas, a lógica e o banco de dados se conectam por trás das telas, sem o usuário ver.',
};

/** All glossary entries as a flat, alphabetically sorted list — for the "/glossario" page. */
export const GLOSSARY_TERMS: GlossaryEntry[] = Object.entries(GLOSSARY)
  .map(([termo, explicacao]) => ({ termo, explicacao }))
  .sort((a, b) => a.termo.localeCompare(b.termo, 'pt-BR'));
