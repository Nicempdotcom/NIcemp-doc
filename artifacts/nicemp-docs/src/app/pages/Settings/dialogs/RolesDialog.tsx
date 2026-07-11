import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { InfoBox } from '@/app/components/docs';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RolesDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Papéis & Permissões</DialogTitle>
          <DialogDescription>
            Ainda não existe um sistema de papéis no NicEmp Docs.
          </DialogDescription>
        </DialogHeader>

        <InfoBox variant="warning" title="Todos os usuários autenticados têm acesso total">
          Hoje qualquer conta com login válido no Supabase enxerga e edita todos os dados do portal — não há distinção
          entre administrador, editor ou leitor. Implementar isso exigiria uma tabela <code className="font-mono">user_roles</code>{' '}
          em <code className="font-mono">lib/db/src/schema</code> e políticas de RLS no Supabase, o que ainda não foi feito.
        </InfoBox>
      </DialogContent>
    </Dialog>
  );
}
