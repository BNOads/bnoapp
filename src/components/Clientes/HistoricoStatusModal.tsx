import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowRight } from "lucide-react";

interface HistoricoStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
}

interface HistoricoItem {
  id: string;
  created_at: string;
  user_id: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  colaborador?: {
    nome: string;
    avatar_url?: string;
  };
}

// Configuração de cores e labels para cada campo
const fieldConfig: Record<string, {
  label: string;
  options: Record<string, { label: string; color: string }>;
}> = {
  serie: {
    label: 'Série',
    options: {
      'Serie A': { label: 'Serie A', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'Serie B': { label: 'Serie B', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      'Serie C': { label: 'Serie C', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      'Serie D': { label: 'Serie D', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    }
  },
  situacao_cliente: {
    label: 'Situação do Cliente',
    options: {
      'nao_iniciado': { label: 'Não Iniciado', color: 'bg-gray-500 text-white' },
      'alerta': { label: 'Alerta', color: 'bg-red-500 text-white' },
      'ponto_de_atencao': { label: 'Ponto de Atenção', color: 'bg-yellow-500 text-white' },
      'resultados_normais': { label: 'Resultados Normais', color: 'bg-blue-500 text-white' },
      'indo_bem': { label: 'Indo bem', color: 'bg-green-500 text-white' },
    }
  },
  etapa_onboarding: {
    label: 'Etapa Onboarding',
    options: {
      'onboarding': { label: 'Onboarding', color: 'bg-orange-500 text-white' },
      'ongoing': { label: 'Ongoing', color: 'bg-green-500 text-white' },
      'pausa_temporaria': { label: 'Pausa Temporária', color: 'bg-red-500 text-white' },
    }
  },
  etapa_trafego: {
    label: 'Etapas de Tráfego',
    options: {
      'estrategia': { label: 'Estratégia', color: 'bg-gray-500 text-white' },
      'distribuicao_criativos': { label: 'Distribuição de Criativos', color: 'bg-blue-500 text-white' },
      'conversao_iniciada': { label: 'Conversão Iniciada', color: 'bg-yellow-500 text-white' },
      'voo_de_cruzeiro': { label: 'Voo de Cruzeiro', color: 'bg-green-500 text-white' },
      'campanhas_pausadas': { label: 'Campanhas Pausadas', color: 'bg-red-500 text-white' },
    }
  },
};

const getStatusDisplay = (campo: string, valor: string) => {
  const config = fieldConfig[campo];
  if (!config) return { label: valor, color: 'bg-gray-200 text-gray-700' };

  const option = config.options[valor];
  if (!option) return { label: valor, color: 'bg-gray-200 text-gray-700' };

  return option;
};

const getFieldLabel = (campo: string) => {
  return fieldConfig[campo]?.label || campo;
};

export const HistoricoStatusModal = ({
  isOpen,
  onClose,
  clienteId,
  clienteNome
}: HistoricoStatusModalProps) => {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && clienteId) {
      carregarHistorico();
    }
  }, [isOpen, clienteId]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      // Buscar histórico de alterações do audit log
      const { data, error } = await supabase
        .from('clientes_audit_log')
        .select(`
          id,
          created_at,
          user_id,
          acao,
          motivo
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }

      console.log('Dados do audit log:', data);

      // Buscar informações dos colaboradores
      const userIds = [...new Set((data || []).map(item => item.user_id))];

      let colaboradoresMap: Record<string, { nome: string; avatar_url?: string }> = {};

      if (userIds.length > 0) {
        const { data: colaboradores } = await supabase
          .from('colaboradores')
          .select('user_id, nome, avatar_url')
          .in('user_id', userIds);

        if (colaboradores) {
          colaboradoresMap = colaboradores.reduce((acc, col) => {
            acc[col.user_id] = { nome: col.nome, avatar_url: col.avatar_url };
            return acc;
          }, {} as Record<string, { nome: string; avatar_url?: string }>);
        }
      }

      // Processar dados - apenas entradas de alteração de status
      const historicoProcessado: HistoricoItem[] = (data || [])
        .filter(item => item.acao === 'alteracao_status')
        .map(item => {
          let motivo: { campo: string; valor_anterior: string; valor_novo: string } = { campo: '', valor_anterior: '', valor_novo: '' };
          try {
            if (item.motivo) {
              motivo = JSON.parse(item.motivo);
            }
          } catch (e) {
            console.error('Erro ao parsear motivo:', item.motivo, e);
          }

          return {
            id: item.id,
            created_at: item.created_at,
            user_id: item.user_id,
            campo: motivo.campo || '',
            valor_anterior: motivo.valor_anterior || '',
            valor_novo: motivo.valor_novo || '',
            colaborador: colaboradoresMap[item.user_id],
          };
        })
        .filter(item => item.campo); // Filtrar items sem campo

      console.log('Histórico processado:', historicoProcessado);
      setHistorico(historicoProcessado);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações - {clienteNome}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma alteração de status registrada.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((item) => {
                const statusAnterior = getStatusDisplay(item.campo, item.valor_anterior);
                const statusNovo = getStatusDisplay(item.campo, item.valor_novo);

                return (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {item.colaborador?.avatar_url && (
                            <AvatarImage src={item.colaborador.avatar_url} />
                          )}
                          <AvatarFallback className="text-xs bg-primary/10">
                            {item.colaborador?.nome
                              ? item.colaborador.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-sm">
                            {item.colaborador?.nome || 'Usuário desconhecido'}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getFieldLabel(item.campo)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={`${statusAnterior.color} text-sm px-3 py-1`}>
                        {statusAnterior.label}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Badge className={`${statusNovo.color} text-sm px-3 py-1`}>
                        {statusNovo.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
