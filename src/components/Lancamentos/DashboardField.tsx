import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Copy, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardFieldProps {
  value: string;
  onSave: (url: string) => Promise<void>;
  editable?: boolean;
}

export default function DashboardField({ value, onSave, editable = true }: DashboardFieldProps) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('✔ Link copiado!', { duration: 2000 });
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(url);
      setEditing(false);
      toast.success('Dashboard atualizado');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const normalizeUrl = (rawUrl: string) => {
    if (!rawUrl) return rawUrl;
    if (!/^https?:\/\//i.test(rawUrl)) {
      return `https://${rawUrl}`;
    }
    return rawUrl;
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-primary">📊 Dashboard do Lançamento</h3>
            {editable && !editing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="h-9"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setUrl(value || '');
                  }}
                  disabled={saving}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-3 w-3 mr-1" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {url ? (
                <>
                  <div className="flex-1 text-sm truncate text-muted-foreground">
                    {url}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="h-8"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="h-8"
                  >
                    <a href={normalizeUrl(url)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir
                    </a>
                  </Button>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Nenhum dashboard configurado
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
