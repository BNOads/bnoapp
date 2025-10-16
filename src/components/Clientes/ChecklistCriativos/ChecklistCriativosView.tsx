import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChecklistCard } from "./ChecklistCard";
import { NovoChecklistModal } from "./NovoChecklistModal";

interface ChecklistCriativosViewProps {
  clienteId: string;
  isPublicView?: boolean;
}

export interface Checklist {
  id: string;
  cliente_id: string;
  funil: string;
  responsavel_id?: string;
  progresso_percentual: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  ativo: boolean;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  titulo: string;
  tipo: string;
  formato: string | null;
  especificacoes: string | null;
  referencias: any;
  concluido: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export const ChecklistCriativosView = ({ clienteId, isPublicView = false }: ChecklistCriativosViewProps) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isPublicView) {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
    loadChecklists();
  }, [clienteId, isPublicView]);

  const loadChecklists = async () => {
    try {
      let clientInstance = supabase;
      
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }

      const { data, error } = await clientInstance
        .from('checklist_criativos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChecklists(data || []);
    } catch (error) {
      console.error('Erro ao carregar checklists:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar checklists de criativos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistCreated = () => {
    setShowModal(false);
    loadChecklists();
  };

  if (loading) {
    return <div className="text-center py-4">Carregando checklists...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Checklist de Criativos</CardTitle>
          {isAuthenticated && (
            <Button size="sm" variant="outline" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Checklist
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {checklists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum checklist encontrado</p>
            {isAuthenticated && (
              <p className="text-sm mt-2">Crie um checklist para organizar os criativos</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {checklists.map((checklist) => (
              <ChecklistCard
                key={checklist.id}
                checklist={checklist}
                onUpdate={loadChecklists}
                isPublicView={isPublicView}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}
      </CardContent>

      <NovoChecklistModal
        open={showModal}
        onOpenChange={setShowModal}
        clienteId={clienteId}
        onSuccess={handleChecklistCreated}
      />
    </Card>
  );
};
