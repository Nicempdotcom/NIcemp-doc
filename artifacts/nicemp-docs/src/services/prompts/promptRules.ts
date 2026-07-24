/**
 * PROMPT_GENERAL_RULES
 *
 * Bloco de regras gerais obrigatórias adicionado ao final de todos os prompts
 * gerados pelo NicEmp Docs. Centralizado aqui para edição em um único lugar.
 */
export const PROMPT_GENERAL_RULES = [
  '## Regras gerais obrigatórias',
  '- Não alterar arquivos de configuração global (`.replit`, `vite.config.*`, `package.json`, `tsconfig*.json`) além do que foi pedido explicitamente acima.',
  '- Não alterar migrations ou schema de banco de dados.',
  '- Não remover nem alterar o comportamento de nenhuma funcionalidade existente.',
  '- Se algo der errado (erro, indisponibilidade, limite atingido), a aplicação deve continuar funcionando normalmente, só sem o recurso afetado naquele momento.',
  '- Ao final, liste todos os arquivos criados, modificados ou removidos — sem exceção.',
].join('\n');
