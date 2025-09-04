import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, BarChart3, Calendar, FileText, Import, Filter } from 'lucide-react';
import NovoLancamentoModal from './NovoLancamentoModal';
import ImportarLancamentosModal from './ImportarLancamentosModal';
import LancamentosTable from './LancamentosTable';
import GanttChart from './GanttChart';
import DashboardLancamentos from './DashboardLancamentos';

interface Lancamento {
  id: string;
  nome_lancamento: string;
  descricao?: string;
  gestor_responsavel: string;
  status_lancamento: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao?: string;
  datas_cpls?: string[];
  data_inicio_remarketing?: string;
  data_fim_remarketing?: string;
  investimento_total: number;
  link_dashboard?: string;
  link_briefing?: string;
  observacoes?: string;
  meta_investimento?: number;
  resultado_obtido?: number;
  roi_percentual?: number;
  created_at: string;
  updated_at: string;
  colaboradores?: {
    nome: string;
    avatar_url?: string;
  };
}

const LancamentosView: React.FC = () => {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('lista');
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    gestor: ''
  });
  const { toast } = useToast();

  const statusColors = {
    'em_captacao': 'bg-blue-500',
    'cpl': 'bg-orange-500',
    'remarketing': 'bg-purple-500',
    'finalizado': 'bg-green-500',
    'pausado': 'bg-yellow-500',
    'cancelado': 'bg-red-500'
  };

  const statusLabels = {
    'em_captacao': 'Em Captação',
    'cpl': 'CPL',
    'remarketing': 'Remarketing',
    'finalizado': 'Finalizado',
    'pausado': 'Pausado',
    'cancelado': 'Cancelado'
  };

  const tipoLabels = {
    'semente': 'Semente',
    'interno': 'Interno',
    'externo': 'Externo',
    'perpetuo': 'Perpétuo',
    'flash': 'Flash',
    'evento': 'Evento',
    'outro': 'Outro'
  };

  const fetchLancamentos = async () => {
    try {
      let query = supabase
        .from('lancamentos')
        .select(`
          *,
          colaboradores:gestor_responsavel (
            nome,
            avatar_url
          )
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.status) {
        query = query.eq('status_lancamento', filtros.status as any);
      }
      if (filtros.tipo) {
        query = query.eq('tipo_lancamento', filtros.tipo as any);
      }
      if (filtros.gestor) {
        query = query.eq('gestor_responsavel', filtros.gestor);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar lançamentos:', error);
        toast({
          title: "Erro ao carregar lançamentos",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setLancamentos(data as any || []);
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      toast({
        title: "Erro ao carregar lançamentos",
        description: "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLancamentos();
  }, [filtros]);

  const handleLancamentoCriado = () => {
    fetchLancamentos();
    setShowNovoModal(false);
    toast({
      title: "Lançamento criado",
      description: "O lançamento foi criado com sucesso.",
    });
  };

  const handleImportacaoConcluida = () => {
    fetchLancamentos();
    setShowImportModal(false);
    toast({
      title: "Importação concluída",
      description: "Os lançamentos foram importados com sucesso.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Lançamentos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os lançamentos e campanhas da sua equipe
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    total: lancamentos.length,
    ativos: lancamentos.filter(l => ['em_captacao', 'cpl', 'remarketing'].includes(l.status_lancamento)).length,
    investimentoTotal: lancamentos.reduce((sum, l) => sum + Number(l.investimento_total), 0),
    finalizados: lancamentos.filter(l => l.status_lancamento === 'finalizado').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Lançamentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os lançamentos e campanhas da sua equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="gap-2"
          >
            <Import className="h-4 w-4" />
            Importar
          </Button>
          <Button
            onClick={() => setShowNovoModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total de Lançamentos</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Lançamentos Ativos</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.ativos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Investimento Total</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              R$ {stats.investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Finalizados</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.finalizados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualização */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <LancamentosTable 
            lancamentos={lancamentos}
            onRefresh={fetchLancamentos}
            statusColors={statusColors}
            statusLabels={statusLabels}
            tipoLabels={tipoLabels}
          />
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <GanttChart 
            lancamentos={lancamentos}
            statusColors={statusColors}
            statusLabels={statusLabels}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <DashboardLancamentos 
            lancamentos={lancamentos}
            statusLabels={statusLabels}
            tipoLabels={tipoLabels}
          />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <NovoLancamentoModal
        open={showNovoModal}
        onOpenChange={setShowNovoModal}
        onLancamentoCriado={handleLancamentoCriado}
      />

      <ImportarLancamentosModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportacaoConcluida={handleImportacaoConcluida}
      />
    </div>
  );
};

export default LancamentosView;