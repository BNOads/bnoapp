import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, Edit, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checklist, ChecklistItem } from "./ChecklistCriativosView";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { NovoItemModal } from "./NovoItemModal";
import { EditarChecklistModal } from "./EditarChecklistModal";
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

interface ChecklistCardProps {
  checklist: Checklist;
  onUpdate: () => void;
  isPublicView: boolean;
  isAuthenticated: boolean;
}

export const ChecklistCard = ({ checklist, onUpdate, isPublicView, isAuthenticated }: ChecklistCardProps) => {
  const [expanded, setExpanded] = useState(isPublicView); // Expandido por padrão na visualização pública
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState<string>("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (expanded) {
      loadItems();
    }
    if (checklist.responsavel_id) {
      loadResponsavel();
    }
  }, [expanded, checklist.responsavel_id]);

  const loadResponsavel = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('nome')
        .eq('user_id', checklist.responsavel_id)
        .single();

      if (error) throw error;
      setResponsavelNome(data?.nome || '');
    } catch (error) {
      console.error('Erro ao carregar responsável:', error);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      let clientInstance = supabase;
      
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }

      const { data, error } = await clientInstance
        .from('checklist_criativos_itens')
        .select('*')
        .eq('checklist_id', checklist.id)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setItems((data || []) as ChecklistItem[]);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar itens do checklist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('checklist_criativos')
        .delete()
        .eq('id', checklist.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Checklist excluído com sucesso"
      });
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir checklist:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir checklist",
        variant: "destructive"
      });
    }
  };

  const totalItems = items.length;
  const completedItems = items.filter(item => item.concluido).length;

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="p-0 h-auto"
              >
                {expanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
              
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">{checklist.funil}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {responsavelNome && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {responsavelNome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{responsavelNome}</span>
                    </div>
                  )}
                  <span>•</span>
                  <span>Criado em {new Date(checklist.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {isAuthenticated && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedItems} de {totalItems} concluídos
              </span>
              <Badge variant="outline">{Math.round(checklist.progresso_percentual)}%</Badge>
            </div>
            <Progress value={checklist.progresso_percentual} className="h-2" />
          </div>

          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowItemModal(true)}
              className="w-full mt-3"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          )}

          {expanded && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {loading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Carregando itens...
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Nenhum item adicionado ainda
                </div>
              ) : (
                items.map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    onUpdate={loadItems}
                    isAuthenticated={isAuthenticated}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      <NovoItemModal
        open={showItemModal}
        onOpenChange={setShowItemModal}
        checklistId={checklist.id}
        onSuccess={() => {
          setShowItemModal(false);
          loadItems();
          onUpdate(); // Atualizar progresso
        }}
      />

      <EditarChecklistModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        checklist={checklist}
        onSuccess={() => {
          setShowEditModal(false);
          onUpdate();
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este checklist? Esta ação não pode ser desfeita.
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
