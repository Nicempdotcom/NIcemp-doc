import React from 'react';
import PageHeader from '@/app/layouts/PageHeader';
import { InfoBox } from '@/app/components/docs';
import UploadProject from '@/app/components/upload/UploadProject';
import { UploadProvider } from '@/features/upload';

export default function Upload() {
  return (
    <div className="w-full">
      <PageHeader
        title="Upload de Projeto"
        description="Envie um arquivo ZIP contendo seu projeto para análise e geração de documentação."
        badge="Novo"
        badgeVariant="info"
      />

      <InfoBox variant="tip" title="Como funciona">
        Selecione ou arraste um arquivo <strong>.zip</strong> com seu projeto. O arquivo é
        carregado apenas em memória — nada é salvo permanentemente nesta etapa.
        A análise do código acontecerá na próxima etapa.
      </InfoBox>

      <div className="mt-8">
        <UploadProvider>
          <UploadProject />
        </UploadProvider>
      </div>
    </div>
  );
}
