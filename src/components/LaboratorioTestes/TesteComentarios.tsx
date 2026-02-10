import { useState } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTesteComentarios } from '@/hooks/useLaboratorioTestes';
import { format } from 'date-fns';

interface TesteComentariosProps {
  testeId: string;
}

export const TesteComentarios = ({ testeId }: TesteComentariosProps) => {
  const { comentarios, loading, addComentario } = useTesteComentarios(testeId);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    if (!novoComentario.trim()) return;
    setEnviando(true);
    await addComentario(novoComentario.trim());
    setNovoComentario('');
    setEnviando(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          Comentários
          {comentarios.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({comentarios.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments timeline */}
        {comentarios.length > 0 ? (
          <div className="space-y-4">
            {comentarios.map((c, i) => (
              <div key={c.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(c.autor?.nome)}
                    </AvatarFallback>
                  </Avatar>
                  {i < comentarios.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{c.autor?.nome || 'Usuário'}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">{c.comentario}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </p>
          )
        )}

        {/* Input area */}
        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
            value={novoComentario}
            onChange={e => setNovoComentario(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!novoComentario.trim() || enviando}
            className="self-end"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
