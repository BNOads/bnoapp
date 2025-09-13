import { useState, useEffect } from "react";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSearch } from "@/hooks/useSearch";
import { Plus, Search, Edit, Trash2, Save, X, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Nota {
  id: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  updated_at: string;
}

export const BlocoNotasView = () => {
  const { user } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Nota | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(notas, ['titulo', 'conteudo']);

  useEffect(() => {
    fetchNotas();
  }, [user]);

  const fetchNotas = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotas(data || []);
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      toast.error('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  const saveNota = async () => {
    if (!user || !titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      if (editingNote) {
        const { error } = await supabase
          .from('notas')
          .update({
            titulo: titulo.trim(),
            conteudo: conteudo.trim()
          })
          .eq('id', editingNote.id);

        if (error) throw error;
        toast.success('Nota atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('notas')
          .insert({
            user_id: user.id,
            titulo: titulo.trim(),
            conteudo: conteudo.trim()
          });

        if (error) throw error;
        toast.success('Nota criada com sucesso');
      }

      await fetchNotas();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      toast.error('Erro ao salvar nota');
    }
  };

  const deleteNota = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

    try {
      const { error } = await supabase
        .from('notas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Nota excluída com sucesso');
      await fetchNotas();
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      toast.error('Erro ao excluir nota');
    }
  };

  const editNota = (nota: Nota) => {
    setEditingNote(nota);
    setTitulo(nota.titulo);
    setConteudo(nota.conteudo);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingNote(null);
    setTitulo("");
    setConteudo("");
    setIsDialogOpen(false);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando notas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Meu Bloco de Notas</h2>
          <p className="text-muted-foreground">
            Suas anotações pessoais e lembretes
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'Editar Nota' : 'Nova Nota'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título da nota"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <Textarea
                placeholder="Conteúdo da nota..."
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={10}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={saveNota}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar notas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <NotebookPen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? 'Nenhuma nota encontrada' : 'Nenhuma nota criada ainda'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? 'Tente ajustar os termos de busca'
              : 'Comece criando sua primeira nota'
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Nota
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((nota) => (
            <Card key={nota.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">
                    {nota.titulo}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editNota(nota)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNota(nota.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atualizada {formatDistanceToNow(parseISO(nota.updated_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {nota.conteudo || "Sem conteúdo"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};