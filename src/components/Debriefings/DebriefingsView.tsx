import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, Calendar, Target, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Debriefing {
  id: string;
  cliente_nome: string;
  nome_lancamento: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: 'rascunho' | 'processando' | 'concluido';
  created_at: string;
  leads_total?: number;
  vendas_total?: number;
  investimento_total?: number;
  roas?: number;
}

export default function DebriefingsView() {
  const [debriefings, setDebriefings] = useState<Debriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDebriefings();
  }, []);

  const fetchDebriefings = async () => {
    try {
      // Temporariamente usando dados mockados até os tipos serem atualizados
      const mockData: Debriefing[] = [
        {
          id: '1',
          cliente_nome: 'Cliente Exemplo',
          nome_lancamento: 'Lançamento Agosto 2025',
          periodo_inicio: '2025-08-01',
          periodo_fim: '2025-08-31',
          status: 'concluido',
          created_at: '2025-08-01T00:00:00Z',
          leads_total: 1250,
          vendas_total: 85,
          investimento_total: 15000,
          roas: 3.2
        },
        {
          id: '2',
          cliente_nome: 'BNOads Digital',
          nome_lancamento: 'Campanha Black Friday',
          periodo_inicio: '2024-11-20',
          periodo_fim: '2024-11-30',
          status: 'processando',
          created_at: '2024-11-20T00:00:00Z',
          leads_total: 2100,
          vendas_total: 156,
          investimento_total: 25000,
          roas: 4.1
        }
      ];
      setDebriefings(mockData);
    } catch (error) {
      console.error('Erro ao buscar debriefings:', error);
      toast.error('Erro ao carregar debriefings');
    } finally {
      setLoading(false);
    }
  };

  const filteredDebriefings = debriefings.filter(debriefing =>
    debriefing.nome_lancamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    debriefing.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho': return 'bg-yellow-100 text-yellow-800';
      case 'processando': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rascunho': return 'Rascunho';
      case 'processando': return 'Processando';
      case 'concluido': return 'Concluído';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Debriefings</h1>
          <p className="text-muted-foreground">
            Geração automática de relatórios de lançamento
          </p>
        </div>
        <Button onClick={() => navigate('/debriefings/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Debriefing
        </Button>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lançamento ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          {filteredDebriefings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum debriefing encontrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm ? "Nenhum resultado encontrado para sua busca." : "Comece criando seu primeiro debriefing de lançamento."}
                </p>
                <Button onClick={() => navigate('/debriefings/novo')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Debriefing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredDebriefings.map((debriefing) => (
                <Card 
                  key={debriefing.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/debriefings/${debriefing.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{debriefing.nome_lancamento}</CardTitle>
                        <CardDescription>{debriefing.cliente_nome}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(debriefing.status)}>
                        {getStatusLabel(debriefing.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(debriefing.periodo_inicio).toLocaleDateString('pt-BR')} - {new Date(debriefing.periodo_fim).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {debriefing.leads_total && (
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{debriefing.leads_total} leads</span>
                        </div>
                      )}
                      {debriefing.vendas_total && (
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{debriefing.vendas_total} vendas</span>
                        </div>
                      )}
                      {debriefing.roas && (
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 font-medium">ROAS: {debriefing.roas.toFixed(2)}x</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="estatisticas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Debriefings</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{debriefings.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefings.filter(d => d.status === 'concluido').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Processamento</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {debriefings.filter(d => d.status === 'processando').length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}