import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Users, Calendar, DollarSign, Target, Megaphone } from "lucide-react";

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
