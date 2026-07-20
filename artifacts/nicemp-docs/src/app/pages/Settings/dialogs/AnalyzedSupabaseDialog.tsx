import { useState, useEffect } from 'react';
import { Copy, Check, Eye, EyeOff, Database } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { InfoBox } from '@/app/components/docs';
import { useToast } from '@/hooks/use-toast';
import {
  getAnalyzedSupabaseConfig,
  saveAnalyzedSupabaseConfig,
  clearAnalyzedSupabaseConfig,
  isAnalyzedSupabaseConfigured,
  maskSecret,
} from '@/lib/analyzedProjectSupabase';
import { createClient } from '@supabase/supabase-js';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AnalyzedSupabaseDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();

  // Existing config state
  const [configured, setConfigured] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [savedKeyMasked, setSavedKeyMasked] = useState<string | null>(null);

  // Form fields
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Actions state
  const [testing, setTesting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Load saved config when dialog opens
  useEffect(() => {
    if (!open) return;
    const isConfigured = isAnalyzedSupabaseConfigured();
    setConfigured(isConfigured);
    if (isConfigured) {
      const config = getAnalyzedSupabaseConfig();
      setSavedUrl(config?.url ?? null);
      setSavedKeyMasked(config ? maskSecret(config.anonKey) : null);
    }
    // Reset form fields
    setUrl('');
    setAnonKey('');
    setShowKey(false);
  }, [open]);

  async function handleTest() {
    const trimUrl = url.trim();
    const trimKey = anonKey.trim();
    if (!trimUrl || !trimKey) {
      toast({ title: 'Preencha os dois campos antes de testar.', variant: 'destructive' });
      return;
    }

    // Best-effort: block service_role key
    try {
      const parts = trimKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload?.role === 'service_role') {
          toast({
            title: 'Chave service_role detectada',
            description: 'Use apenas a anon/public key. A service_role key concede acesso irrestrito e não deve ser usada aqui.',
            variant: 'destructive',
          });
          return;
        }
      }
    } catch {
      // JWT parse failed — not a service_role key or non-JWT; proceed normally
    }

    setTesting(true);
    try {
      const client = createClient(trimUrl, trimKey);
      const { data, error } = await client
        .from('cms_categories')
        .select('id')
        .limit(100);

      if (error) {
        toast({
          title: 'Falha na conexão',
          description: 'Verifique a URL e a anon key. Se o projeto usa RLS, confirme que a política permite leitura anônima.',
          variant: 'destructive',
        });
      } else {
        const count = (data ?? []).length;
        toast({
          title: 'Conectado com sucesso',
          description: `${count} categoria${count !== 1 ? 's' : ''} encontrada${count !== 1 ? 's' : ''} em cms_categories.`,
        });
      }
    } catch {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar. Verifique a URL do projeto.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    const trimUrl = url.trim();
    const trimKey = anonKey.trim();
    if (!trimUrl || !trimKey) {
      toast({ title: 'Preencha a URL e a anon key antes de salvar.', variant: 'destructive' });
      return;
    }

    // Best-effort: block service_role key
    try {
      const parts = trimKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload?.role === 'service_role') {
          toast({
            title: 'Chave service_role bloqueada',
            description: 'Use apenas a anon/public key. A service_role key não pode ser salva aqui.',
            variant: 'destructive',
          });
          return;
        }
      }
    } catch {
      // Non-JWT or parse error — proceed
    }

    saveAnalyzedSupabaseConfig(trimUrl, trimKey);
    setConfigured(true);
    setSavedUrl(trimUrl);
    setSavedKeyMasked(maskSecret(trimKey));
    setUrl('');
    setAnonKey('');
    toast({ title: 'Conexão salva', description: 'As categorias do nicemp.com serão carregadas a partir desta conexão.' });
  }

  function handleRemove() {
    clearAnalyzedSupabaseConfig();
    setConfigured(false);
    setSavedUrl(null);
    setSavedKeyMasked(null);
    toast({ title: 'Conexão removida', description: 'O dropdown de categorias voltará ao comportamento padrão.' });
  }

  async function copyUrl() {
    if (!savedUrl) return;
    await navigator.clipboard.writeText(savedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Supabase do projeto analisado
          </DialogTitle>
          <DialogDescription>
            Conecte o NIcemp-doc ao Supabase do nicemp.com para carregar as categorias reais no
            dropdown "Criar Ferramenta". Conexão somente leitura — nenhum dado é gravado.
          </DialogDescription>
        </DialogHeader>

        {/* Fixed security warning */}
        <InfoBox variant="warning" title="Atenção — segurança">
          Use apenas a <strong>anon/public key</strong> do Supabase — nunca a{' '}
          <strong>service_role key</strong>. Essa chave fica salva neste navegador (localStorage).
        </InfoBox>

        {configured && savedUrl ? (
          /* ── Connected state ── */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">URL do projeto</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  {savedUrl}
                </code>
                <Button variant="outline" size="sm" onClick={copyUrl} className="gap-1.5 shrink-0">
                  {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedUrl ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Anon key</span>
              <code className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                {savedKeyMasked}
              </code>
              <p className="text-xs text-muted-foreground">
                Exibida parcialmente por segurança.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="destructive" size="sm" onClick={handleRemove}>
                Remover conexão
              </Button>
            </div>
          </div>
        ) : (
          /* ── Configuration form ── */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="analyzed-url">URL do projeto Supabase</Label>
              <Input
                id="analyzed-url"
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="analyzed-key">Anon key</Label>
              <div className="flex gap-2">
                <Input
                  id="analyzed-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !url.trim() || !anonKey.trim()}
              >
                {testing ? 'Testando…' : 'Testar conexão'}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!url.trim() || !anonKey.trim()}
              >
                Salvar conexão
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
