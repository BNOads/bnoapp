import { useState } from 'react';
import { Camera, Link as LinkIcon, Plus, Trash2, ExternalLink, Loader2, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTesteEvidencias } from '@/hooks/useLaboratorioTestes';
import { uploadImage } from '@/lib/imageUpload';

interface TesteEvidenciasProps {
  testeId: string;
}

export const TesteEvidencias = ({ testeId }: TesteEvidenciasProps) => {
  const { evidencias, loading, addEvidencia, removeEvidencia } = useTesteEvidencias(testeId);
  const [uploading, setUploading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescricao, setLinkDescricao] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage({ file, context: 'laboratorio-testes', entityId: testeId });
      if (result?.url) {
        await addEvidencia('imagem', result.url);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    await addEvidencia('link', linkUrl.trim(), linkDescricao.trim() || undefined);
    setLinkUrl('');
    setLinkDescricao('');
    setShowLinkForm(false);
  };

  const imagens = evidencias.filter(e => e.tipo === 'imagem');
  const links = evidencias.filter(e => e.tipo === 'link');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-violet-500" />
            Evidências
            {evidencias.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({evidencias.length})</span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 relative" disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
              {uploading ? 'Enviando...' : 'Upload Imagem'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowLinkForm(!showLinkForm)}>
              <LinkIcon className="h-3.5 w-3.5" />
              Adicionar Link
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link add form */}
        {showLinkForm && (
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
            <Input
              placeholder="URL do link"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Descrição (opcional)"
              value={linkDescricao}
              onChange={e => setLinkDescricao(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Images grid */}
        {imagens.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Imagens</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {imagens.map(ev => (
                <div key={ev.id} className="group relative rounded-lg overflow-hidden border bg-muted/30 aspect-video">
                  <a href={ev.url} target="_blank" rel="noopener noreferrer">
                    <img src={ev.url} alt={ev.descricao || 'Evidência'} className="w-full h-full object-cover" />
                  </a>
                  <button
                    onClick={() => removeEvidencia(ev.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links list */}
        {links.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Links</p>
            <div className="space-y-2">
              {links.map(ev => (
                <div key={ev.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/20">
                  <a href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline truncate flex-1">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {ev.descricao || ev.url}
                  </a>
                  <button
                    onClick={() => removeEvidencia(ev.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && evidencias.length === 0 && !showLinkForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma evidência adicionada. Adicione imagens ou links para documentar o teste.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
