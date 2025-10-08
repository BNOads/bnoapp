import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Users, Calendar, DollarSign, Target, Megaphone, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InformacoesBasicasProps {
  lancamento: {
    nome_lancamento: string;
    status_lancamento: string;
    tipo_aulas: string;
    tipo_lancamento: string;
    promessa: string | null;
    publico_alvo: string | null;
    observacoes: string | null;
    ticket_produto: number | null;
    leads_desejados: number | null;
    meta_custo_lead: number | null;
    data_inicio_captacao: string;
    data_fim_captacao: string | null;
    data_inicio_aquecimento: string | null;
    data_fim_aquecimento: string | null;
    data_inicio_cpl: string | null;
    data_fim_cpl: string | null;
    data_inicio_lembrete: string | null;
    data_fim_lembrete: string | null;
    data_inicio_carrinho: string | null;
    data_fim_carrinho: string | null;
    data_fechamento: string | null;
    clientes?: { nome: string } | null;
    gestor?: { nome: string } | null;
  };
}

const statusCores: Record<string, string> = {
  em_captacao: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  em_cpl: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  em_carrinho: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  finalizado: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
};

const statusLabels: Record<string, string> = {
  em_captacao: "Em Captação",
  em_cpl: "Em CPL",
  em_carrinho: "Em Carrinho",
  finalizado: "Finalizado",
  cancelado: "Cancelado"
};

export default function InformacoesBasicas({ lancamento }: InformacoesBasicasProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(valor);
  };

  const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
        <div className="text-sm font-medium truncate">{value || "Não informado"}</div>
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Informações Básicas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome e Status */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="text-xs font-medium text-muted-foreground mb-1">Nome do Lançamento</div>
              <h3 className="text-lg font-bold">{lancamento.nome_lancamento}</h3>
            </div>
            <Badge className={statusCores[lancamento.status_lancamento]}>
              {statusLabels[lancamento.status_lancamento] || lancamento.status_lancamento}
            </Badge>
          </div>
        </div>

        {/* Grid de informações - 2 colunas */}
        <div className="grid grid-cols-2 gap-3">
          <InfoItem 
            icon={Calendar}
            label="Tipo de Aulas" 
            value={lancamento.tipo_aulas === 'ao_vivo' ? 'Ao Vivo' : lancamento.tipo_aulas}
          />
          <InfoItem 
            icon={Megaphone}
            label="Tipo de Lançamento" 
            value={lancamento.tipo_lancamento === 'tradicional' ? 'Tradicional' : lancamento.tipo_lancamento}
          />
          <InfoItem 
            icon={User}
            label="Gestor" 
            value={lancamento.gestor?.nome}
          />
          <InfoItem 
            icon={Users}
            label="Cliente" 
            value={lancamento.clientes?.nome}
          />
        </div>

        {/* Promessa */}
        {lancamento.promessa && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs font-medium text-muted-foreground mb-1">Promessa</div>
            <p className="text-sm">{lancamento.promessa}</p>
          </div>
        )}

        {/* Metas e Valores */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Metas e Valores</div>
          <div className="grid grid-cols-2 gap-3">
            {lancamento.ticket_produto && (
              <div className="p-2 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">Ticket Produto</div>
                <div className="text-sm font-bold">{formatarMoeda(lancamento.ticket_produto)}</div>
              </div>
            )}
            {lancamento.leads_desejados && (
              <div className="p-2 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">Leads Desejados</div>
                <div className="text-sm font-bold">{lancamento.leads_desejados.toLocaleString('pt-BR')}</div>
              </div>
            )}
            {lancamento.meta_custo_lead && (
              <div className="p-2 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">Meta CPL</div>
                <div className="text-sm font-bold">{formatarMoeda(lancamento.meta_custo_lead)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Público-alvo */}
        {lancamento.publico_alvo && (
          <InfoItem 
            icon={Target}
            label="Público-Alvo" 
            value={lancamento.publico_alvo}
          />
        )}

        {/* Datas do Lançamento */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Datas do Lançamento
          </div>
          <div className="space-y-2">
            {lancamento.data_inicio_captacao && (
              <div className="flex justify-between items-center p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <span className="text-xs text-muted-foreground">Início Captação</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_captacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_fim_captacao && (
              <div className="flex justify-between items-center p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <span className="text-xs text-muted-foreground">Fim Captação</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_fim_captacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_inicio_aquecimento && (
              <div className="flex justify-between items-center p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <span className="text-xs text-muted-foreground">Início Aquecimento</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_aquecimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_fim_aquecimento && (
              <div className="flex justify-between items-center p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <span className="text-xs text-muted-foreground">Fim Aquecimento</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_fim_aquecimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_inicio_cpl && (
              <div className="flex justify-between items-center p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <span className="text-xs text-muted-foreground">Início CPL</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_cpl), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_fim_cpl && (
              <div className="flex justify-between items-center p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <span className="text-xs text-muted-foreground">Fim CPL</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_fim_cpl), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_inicio_lembrete && (
              <div className="flex justify-between items-center p-2 rounded bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                <span className="text-xs text-muted-foreground">Início Lembrete</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_lembrete), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_fim_lembrete && (
              <div className="flex justify-between items-center p-2 rounded bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                <span className="text-xs text-muted-foreground">Fim Lembrete</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_fim_lembrete), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_inicio_carrinho && (
              <div className="flex justify-between items-center p-2 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <span className="text-xs text-muted-foreground">Início Carrinho</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_inicio_carrinho), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_fim_carrinho && (
              <div className="flex justify-between items-center p-2 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <span className="text-xs text-muted-foreground">Fim Carrinho</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_fim_carrinho), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
            {lancamento.data_fechamento && (
              <div className="flex justify-between items-center p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <span className="text-xs text-muted-foreground">Data Fechamento</span>
                <span className="text-xs font-medium">{format(parseISO(lancamento.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Observações */}
        {lancamento.observacoes && (
          <div className="p-3 rounded-lg bg-muted/30 border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Observações</div>
            <p className="text-sm text-muted-foreground">{lancamento.observacoes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
