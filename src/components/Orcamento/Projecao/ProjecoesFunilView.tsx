import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus,
  Calculator,
  ArrowLeft,
  TrendingUp,
  Filter,
  Clock,
  CheckCircle2,
  DollarSign,
  User,
  Briefcase,
} from 'lucide-react';
import ProjecaoInterativa from './ProjecaoInterativa';

interface ProjecaoSalva {
  orcamento_funil_id: string;
  investimento: number;
  cpm: number;
  ctr: number;
  loading_rate: number;
  checkout_rate: number;
  conversion_rate: number;
  ticket_medio: number;
  updated_at: string;
}

interface Funil {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  cliente_id: string;
  cliente_nome?: string;
  gestor_id?: string;
  gestor_nome?: string;
  projecao_salva?: ProjecaoSalva | null;
}

export default function ProjecoesFunilView() {
  const [funis, setFunis] = useState<Funil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [selectedFunil, setSelectedFunil] = useState<Funil | null>(null);
  const [funilParaSelecionar, setFunilParaSelecionar] = useState<string>('');

  useEffect(() => {
    loadFunis();
  }, []);

  const loadFunis = async () => {
    try {
      setLoading(true);

      // Buscar funis ativos
      const { data: funisData, error: funisError } = await supabase
        .from('orcamentos_funil')
        .select('id, nome_funil, valor_investimento, cliente_id')
        .eq('ativo', true)
        .eq('active', true)
        .order('nome_funil');

      if (funisError) throw funisError;

      // Buscar clientes
      const clienteIds = Array.from(new Set((funisData || []).map(f => f.cliente_id).filter(Boolean)));
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, primary_gestor_user_id')
        .in('id', clienteIds.length > 0 ? clienteIds : ['00000000-0000-0000-0000-000000000000']);

      // Buscar gestores
      const gestorIds = Array.from(new Set((clientesData || []).map(c => c.primary_gestor_user_id).filter(Boolean)));
      const { data: gestoresData } = await supabase
        .from('colaboradores')
        .select('user_id, nome')
        .in('user_id', gestorIds.length > 0 ? gestorIds : ['00000000-0000-0000-0000-000000000000']);

      // Buscar projecoes salvas
      const funilIds = (funisData || []).map(f => f.id);
      let projecoesMap: Record<string, ProjecaoSalva> = {};

      if (funilIds.length > 0) {
        const { data: projecoesData } = await supabase
          .from('projecoes_funil')
          .select('orcamento_funil_id, investimento, cpm, ctr, loading_rate, checkout_rate, conversion_rate, ticket_medio, updated_at')
          .in('orcamento_funil_id', funilIds);

        projecoesData?.forEach(p => {
          projecoesMap[p.orcamento_funil_id] = p;
        });
      }

      // Mapear dados
      const clienteMap: Record<string, { nome: string; gestor_id: string | null }> = {};
      clientesData?.forEach(c => {
        clienteMap[c.id] = { nome: c.nome, gestor_id: c.primary_gestor_user_id };
      });

      const gestorMap: Record<string, string> = {};
      gestoresData?.forEach(g => {
        gestorMap[g.user_id] = g.nome;
      });

      const funisComDados: Funil[] = (funisData || []).map(f => ({
        ...f,
        cliente_nome: clienteMap[f.cliente_id]?.nome || 'Cliente nao encontrado',
        gestor_id: clienteMap[f.cliente_id]?.gestor_id || undefined,
        gestor_nome: clienteMap[f.cliente_id]?.gestor_id
          ? gestorMap[clienteMap[f.cliente_id].gestor_id!]
          : undefined,
        projecao_salva: projecoesMap[f.id] || null,
      }));

      setFunis(funisComDados);
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast.error('Erro ao carregar funis');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFunil = () => {
    const funil = funis.find(f => f.id === funilParaSelecionar);
    if (funil) {
      setSelectedFunil(funil);
      setShowSelectModal(false);
      setFunilParaSelecionar('');
    }
  };

  const handleVoltar = () => {
    setSelectedFunil(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando funis...</p>
        </div>
      </div>
    );
  }

  // Se um funil foi selecionado, mostrar a projeção interativa
  if (selectedFunil) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={handleVoltar}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Lista
        </Button>
        <ProjecaoInterativa
          funilId={selectedFunil.id}
          funilNome={selectedFunil.nome_funil}
          clienteNome={selectedFunil.cliente_nome || ''}
          clienteId={selectedFunil.cliente_id}
          investimentoBase={selectedFunil.valor_investimento}
          projecaoSalva={selectedFunil.projecao_salva ? {
            investimento: selectedFunil.projecao_salva.investimento,
            cpm: selectedFunil.projecao_salva.cpm,
            ctr: selectedFunil.projecao_salva.ctr,
            loadingRate: selectedFunil.projecao_salva.loading_rate,
            checkoutRate: selectedFunil.projecao_salva.checkout_rate,
            conversionRate: selectedFunil.projecao_salva.conversion_rate,
            ticketMedio: selectedFunil.projecao_salva.ticket_medio,
          } : null}
          onSave={() => loadFunis()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Projecoes de Funil
          </h2>
          <p className="text-muted-foreground">
            Simule cenarios e projete resultados para seus funis
          </p>
        </div>
        <Button onClick={() => setShowSelectModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Projecao
        </Button>
      </div>

      {/* Lista de Funis para Projeção */}
      {funis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum funil encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie um orcamento na aba "Orcamentos" para poder fazer projecoes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funis.map((funil) => (
            <Card
              key={funil.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary/30"
              onClick={() => setSelectedFunil(funil)}
            >
              {/* Faixa de Investimento no topo */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-white/80" />
                    <span className="text-white/80 text-sm font-medium">Investimento</span>
                  </div>
                  {funil.projecao_salva && (
                    <Badge className="bg-white/20 text-white border-0 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Projecao Salva
                    </Badge>
                  )}
                </div>
                <p className="text-white text-2xl font-bold mt-1">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(funil.valor_investimento)}
                </p>
              </div>

              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="truncate">{funil.nome_funil}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium truncate">{funil.cliente_nome}</span>
                  </div>
                  {funil.gestor_nome && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Gestor:</span>
                      <span className="font-medium">{funil.gestor_nome}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant={funil.projecao_salva ? "default" : "outline"}
                  className="w-full mt-4"
                  size="sm"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {funil.projecao_salva ? 'Ver Projecoes' : 'Criar Projecao'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para Selecionar Funil */}
      <Dialog open={showSelectModal} onOpenChange={setShowSelectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Projecao de Funil</DialogTitle>
            <DialogDescription>
              Selecione um funil existente para criar uma projecao e simular cenarios
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={funilParaSelecionar} onValueChange={setFunilParaSelecionar}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funil" />
              </SelectTrigger>
              <SelectContent>
                {funis.map((funil) => (
                  <SelectItem key={funil.id} value={funil.id}>
                    <div className="flex flex-col">
                      <span>{funil.nome_funil}</span>
                      <span className="text-xs text-muted-foreground">
                        {funil.cliente_nome} - {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(funil.valor_investimento)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSelectModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSelectFunil} disabled={!funilParaSelecionar}>
                Criar Projecao
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
