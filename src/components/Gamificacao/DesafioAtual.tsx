import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Trophy, Target, Edit, Trash2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovoDesafioModal } from "./NovoDesafioModal";
import { RegistrarAcaoModal } from "./RegistrarAcaoModal";
import { EditarDesafioModal } from "./EditarDesafioModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Desafio {
  id: string;
  titulo: string;
  descricao: string;
  tipo_medicao: string;
  criterio_vitoria: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  finalizado: boolean;
}

interface DesafioAtualProps {
  isAdmin: boolean;
}

export const DesafioAtual = ({ isAdmin }: DesafioAtualProps) => {
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNovoDesafio, setShowNovoDesafio] = useState(false);
  const [showRegistrarAcao, setShowRegistrarAcao] = useState(false);
  const [showEditarDesafio, setShowEditarDesafio] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmFinalizarOpen, setConfirmFinalizarOpen] = useState(false);
  const [finalizandoDesafio, setFinalizandoDesafio] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDesafioAtual();
  }, []);

  const loadDesafioAtual = async () => {
    try {
      const { data, error } = await supabase
        .from('gamificacao_desafios')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDesafio(data);
    } catch (error) {
      console.error('Erro ao carregar desafio:', error);
      toast({
        title: "Erro ao carregar desafio",
        description: "Não foi possível carregar o desafio atual.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDesafio = async () => {
    if (!desafio) return;
    try {
      const { error } = await supabase
        .from('gamificacao_desafios')
        .delete()
        .eq('id', desafio.id);
      if (error) throw error;
      toast({ title: 'Desafio excluído', description: 'O desafio foi removido com sucesso.' });
      setConfirmDeleteOpen(false);
      await loadDesafioAtual();
    } catch (error) {
      console.error('Erro ao excluir desafio:', error);
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o desafio.', variant: 'destructive' });
    }
  };

  const handleFinalizarDesafio = async () => {
    if (!desafio) return;
    setFinalizandoDesafio(true);
    try {
      const { data, error } = await supabase.functions.invoke('finalizar-desafio', {
        body: { desafioId: desafio.id }
      });

      if (error) throw error;

      toast({ 
        title: 'Desafio finalizado!', 
        description: data.vencedor 
          ? `Vencedor: ${data.vencedor.nome}. Todos foram notificados!` 
          : 'Todos foram notificados sobre o fim do desafio.'
      });
      setConfirmFinalizarOpen(false);
      await loadDesafioAtual();
    } catch (error) {
      console.error('Erro ao finalizar desafio:', error);
      toast({ 
        title: 'Erro ao finalizar', 
        description: 'Não foi possível finalizar o desafio.', 
        variant: 'destructive' 
      });
    } finally {
      setFinalizandoDesafio(false);
    }
  };
  const getTipoMedicaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'quantidade_acoes': 'Quantidade de Ações',
      'pontuacao': 'Pontuação',
      'check_in_diario': 'Check-in Diário'
    };
    return labels[tipo] || tipo;
  };

  const getCriterioVitoriaLabel = (criterio: string) => {
    const labels: Record<string, string> = {
      'maior_numero_acoes': 'Maior Número de Ações',
      'maior_pontuacao': 'Maior Pontuação',
      'maior_consistencia': 'Maior Consistência'
    };
    return labels[criterio] || criterio;
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

  if (!desafio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Nenhum Desafio Ativo
          </CardTitle>
          <CardDescription>
            Aguarde o próximo desafio mensal ou crie um novo!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <Button onClick={() => setShowNovoDesafio(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Desafio
            </Button>
          )}
        </CardContent>
        <NovoDesafioModal 
          open={showNovoDesafio} 
          onOpenChange={setShowNovoDesafio}
          onSuccess={loadDesafioAtual}
        />
      </Card>
    );
  }

  const diasRestantes = differenceInDays(new Date(desafio.data_fim), new Date());
  const diasTotais = differenceInDays(new Date(desafio.data_fim), new Date(desafio.data_inicio));
  const progresso = Math.max(0, Math.min(100, ((diasTotais - diasRestantes) / diasTotais) * 100));

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                {desafio.titulo}
              </CardTitle>
              <CardDescription>{desafio.descricao}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={diasRestantes > 7 ? "default" : "destructive"}>
                {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Encerrado'}
              </Badge>
              {desafio.finalizado && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Finalizado
                </Badge>
              )}
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowEditarDesafio(true)} aria-label="Editar desafio">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteOpen(true)} aria-label="Excluir desafio">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Período</span>
                </div>
                <p className="text-sm">
                  {format(new Date(desafio.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(new Date(desafio.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Tipo de Medição</span>
                </div>
                <p className="text-sm">{getTipoMedicaoLabel(desafio.tipo_medicao)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">Critério de Vitória</span>
                </div>
                <p className="text-sm">{getCriterioVitoriaLabel(desafio.criterio_vitoria)}</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progresso do período</span>
              <span className="font-medium">{Math.round(progresso)}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => setShowRegistrarAcao(true)} 
              className="flex-1"
              size="lg"
              disabled={diasRestantes < 0 || desafio.finalizado}
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Ação
            </Button>
            {isAdmin && !desafio.finalizado && (
              <Button 
                onClick={() => setConfirmFinalizarOpen(true)} 
                variant="outline"
                size="lg"
                className="border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Finalizar Desafio
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RegistrarAcaoModal
        open={showRegistrarAcao}
        onOpenChange={setShowRegistrarAcao}
        desafioId={desafio.id}
        onSuccess={loadDesafioAtual}
      />

      {isAdmin && (
        <EditarDesafioModal
          open={showEditarDesafio}
          onOpenChange={setShowEditarDesafio}
          desafioId={desafio.id}
          onSuccess={loadDesafioAtual}
        />
      )}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir desafio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Tem certeza que deseja excluir o desafio atual?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteDesafio}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmFinalizarOpen} onOpenChange={setConfirmFinalizarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar desafio</AlertDialogTitle>
            <AlertDialogDescription>
              Ao finalizar o desafio, o vencedor será declarado e todos os colaboradores receberão uma notificação. Esta ação não pode ser desfeita. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalizandoDesafio}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-green-600 text-white hover:bg-green-700" 
              onClick={handleFinalizarDesafio}
              disabled={finalizandoDesafio}
            >
              {finalizandoDesafio ? 'Finalizando...' : 'Finalizar Desafio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
