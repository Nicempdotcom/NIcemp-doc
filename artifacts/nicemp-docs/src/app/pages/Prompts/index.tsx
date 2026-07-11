import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox } from '@/app/components/docs';
import CreatePagePromptDialog from '@/app/components/prompts/CreatePagePromptDialog';
import CreateToolPromptDialog from '@/app/components/prompts/CreateToolPromptDialog';
import CreateComponentPromptDialog from '@/app/components/prompts/CreateComponentPromptDialog';
import CreateModulePromptDialog from '@/app/components/prompts/CreateModulePromptDialog';
import EntityPickerPromptDialog from '@/app/components/prompts/EntityPickerPromptDialog';
import { Wrench, RefreshCcw, Bug, BookOpen, FileCode2 } from 'lucide-react';

export default function Prompts() {
  return (
    <div className="w-full">
      <PageHeader
        title="Prompts Replit"
        description="Biblioteca de prompts prontos para guiar o Replit Agent na criação, manutenção e documentação do sistema NicEmp."
        badge="EPIC 09"
        badgeVariant="info"
      />

      <Section title="Como usar" description="Entenda a diferença entre os tipos de prompt antes de escolher.">
        <InfoBox variant="tip" title="Prompts de Criação">
          Seguem convenções <strong>fixas</strong> de cada projeto (NicEmp Docs ou nicemp.com), porque a coisa ainda não existe — não há dados reais para consultar.
        </InfoBox>
        <div className="mt-3">
          <InfoBox variant="info" title="Prompts de Manutenção e Documentação">
            São gerados a partir dos <strong>dados da última análise</strong> feita (Dashboard → Upload). Se você subir um novo ZIP, da próxima vez que abrir qualquer um desses prompts ele já vai refletir o código atualizado automaticamente — sem precisar mexer em nada aqui.
          </InfoBox>
        </div>
        <div className="mt-3">
          <InfoBox variant="warning" title="Todo prompt é só texto">
            Nada aqui cria, edita ou apaga arquivos sozinho. É sempre você quem copia o prompt gerado e cola na conversa com o Replit Agent.
          </InfoBox>
        </div>
      </Section>

      <Section title="Prompts de Criação" description="Para adicionar algo novo que ainda não existe no projeto.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CreatePagePromptDialog />
          <CreateToolPromptDialog />
          <CreateComponentPromptDialog />
          <CreateModulePromptDialog />
        </div>
      </Section>

      <Section title="Prompts de Manutenção" description="Para alterar algo que já existe. Gerados automaticamente a partir dos dados da última análise do projeto.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <EntityPickerPromptDialog
            purpose="refactor"
            icon={Wrench}
            triggerTitle="Refatoração"
            triggerDescription="Melhore a estrutura interna do código sem mudar o comportamento externo. O prompt já inclui arquivo, módulo, risco e dependências reais."
          />
          <EntityPickerPromptDialog
            purpose="layout"
            icon={RefreshCcw}
            triggerTitle="Atualização de Layout"
            triggerDescription="Mude estilo e aparência de uma entidade existente, sem tocar em lógica ou dados. O prompt delimita exatamente o que pode e o que não pode ser alterado."
          />
          <EntityPickerPromptDialog
            purpose="bugfix"
            icon={Bug}
            triggerTitle="Correção de Bugs"
            triggerDescription="Descreva o comportamento errado e o esperado. O prompt instrui o Replit Agent a investigar a causa raiz, não apenas esconder o sintoma."
          />
        </div>
      </Section>

      <Section title="Prompts de Documentação" description="Para melhorar comentários, JSDoc ou criar especificações técnicas. Gerados a partir dos dados reais do projeto analisado.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <EntityPickerPromptDialog
            purpose="docs"
            icon={BookOpen}
            triggerTitle="Documentar Código"
            triggerDescription="Gere um prompt que pede ao Replit Agent adicionar JSDoc e comentários em uma entidade existente, sem alterar nenhum código funcional."
          />
          <EntityPickerPromptDialog
            purpose="spec"
            icon={FileCode2}
            triggerTitle="Gerar Specs"
            triggerDescription="Gere um prompt que pede ao Replit Agent criar um arquivo .md de especificação técnica descrevendo uma entidade existente, sem alterar nenhum código."
          />
        </div>
      </Section>
    </div>
  );
}
