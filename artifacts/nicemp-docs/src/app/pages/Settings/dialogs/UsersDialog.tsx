import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { InfoBox } from '@/app/components/docs';
import { useAuth } from '@/app/providers/AuthProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatDate } from '@/utils/formatDate';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UsersDialog({ open, onOpenChange }: Props) {
  const { session, signOut } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestão de Usuários</DialogTitle>
          <DialogDescription>
            Não há um painel de usuários no portal — novos acessos são criados diretamente no Supabase.
          </DialogDescription>
        </DialogHeader>

        {isSupabaseConfigured && session?.user ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3 flex flex-col gap-1.5 text-sm">
              <div><span className="text-muted-foreground">E-mail: </span><span className="font-medium text-foreground">{session.user.email}</span></div>
              <div><span className="text-muted-foreground">ID: </span><span className="font-mono text-xs text-foreground">{session.user.id}</span></div>
              <div>
                <span className="text-muted-foreground">Conta criada em: </span>
                <span className="font-medium text-foreground">
                  {session.user.created_at ? formatDate(session.user.created_at) : '—'}
                </span>
              </div>
            </div>

            <InfoBox variant="tip" title="Como adicionar novos usuários">
              Novos usuários são criados pelo painel do Supabase, em Authentication &gt; Users — não existe cadastro
              próprio dentro do NicEmp Docs.{' '}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                Abrir painel do Supabase
              </a>
            </InfoBox>
          </div>
        ) : (
          <InfoBox variant="warning" title="Modo localStorage — sem login">
            O Supabase não está configurado, então não há sessão de usuário. O portal funciona localmente, sem autenticação.
          </InfoBox>
        )}

        {isSupabaseConfigured && session && (
          <DialogFooter>
            <Button variant="destructive" onClick={() => { signOut(); onOpenChange(false); }}>Sair</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
