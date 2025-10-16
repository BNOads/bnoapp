import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { EditarDesafioModal } from "./EditarDesafioModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DesafioHistorico {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

export const HistoricoDesafios = () => {
  const [desafios, setDesafios] = useState<DesafioHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDesafioId, setEditingDesafioId] = useState<string | null>(null);
  const [deletingDesafioId, setDeletingDesafioId] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAdmin, isMaster } = useUserPermissions();

  const canManageDesafios = isAdmin || isMaster;

  useEffect(() => {
    loadHistorico();
  }, []);

  const loadHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from('gamificacao_desafios')
        .select('*')
        .order('data_fim', { ascending: false });

      if (error) throw error;
      setDesafios(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de desafios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDesafioId) return;

    try {
      const { error } = await supabase
        .from('gamificacao_desafios')
        .delete()
        .eq('id', deletingDesafioId);

      if (error) throw error;

      toast({
        title: "Desafio excluído",
        description: "O desafio foi excluído com sucesso.",
      });

      setDeletingDesafioId(null);
      loadHistorico();
    } catch (error) {
      console.error('Erro ao excluir desafio:', error);
      toast({
        title: "Erro ao excluir desafio",
        description: "Não foi possível excluir o desafio. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Histórico de Desafios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {desafios.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum desafio encontrado no histórico.
            </p>
          ) : (
            <div className="space-y-3">
              {desafios.map((desafio) => (
                <div
                  key={desafio.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{desafio.titulo}</p>
                      {desafio.ativo && (
                        <Badge variant="default" className="text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {desafio.descricao}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(desafio.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(new Date(desafio.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  {canManageDesafios && (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingDesafioId(desafio.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setDeletingDesafioId(desafio.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingDesafioId && (
        <EditarDesafioModal
          open={!!editingDesafioId}
          onOpenChange={(open) => !open && setEditingDesafioId(null)}
          desafioId={editingDesafioId}
          onSuccess={loadHistorico}
        />
      )}

      <AlertDialog open={!!deletingDesafioId} onOpenChange={(open) => !open && setDeletingDesafioId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Desafio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este desafio? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
