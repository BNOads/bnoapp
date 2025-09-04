import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, ExternalLink, Edit, Trash2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface LancamentosTableProps {
  lancamentos: Lancamento[];
  onRefresh: () => void;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  tipoLabels: Record<string, string>;
}

const LancamentosTable: React.FC<LancamentosTableProps> = ({
  lancamentos,
  onRefresh,
  statusColors,
  statusLabels,
  tipoLabels
}) => {
  const [loading, setLoading] = useState(false);

  const formatarData = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const abrirLink = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lançamento</TableHead>
            <TableHead>Gestor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Data Início</TableHead>
            <TableHead>Investimento</TableHead>
            <TableHead>Links</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lancamentos.map((lancamento) => (
            <TableRow key={lancamento.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{lancamento.nome_lancamento}</div>
                  {lancamento.descricao && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {lancamento.descricao}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={lancamento.colaboradores?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(lancamento.colaboradores?.nome || 'N/A')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{lancamento.colaboradores?.nome || 'N/A'}</span>
                </div>
              </TableCell>
              
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`${statusColors[lancamento.status_lancamento]} text-white`}
                >
                  {statusLabels[lancamento.status_lancamento]}
                </Badge>
              </TableCell>
              
              <TableCell>
                <Badge variant="outline">
                  {tipoLabels[lancamento.tipo_lancamento]}
                </Badge>
              </TableCell>
              
              <TableCell>
                {formatarData(lancamento.data_inicio_captacao)}
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {formatarMoeda(lancamento.investimento_total)}
                  </div>
                  {lancamento.meta_investimento && (
                    <div className="text-xs text-muted-foreground">
                      Meta: {formatarMoeda(lancamento.meta_investimento)}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex gap-1">
                  {lancamento.link_dashboard && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirLink(lancamento.link_dashboard)}
                      title="Dashboard"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  {lancamento.link_briefing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirLink(lancamento.link_briefing)}
                      title="Briefing"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {lancamentos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum lançamento encontrado
        </div>
      )}
    </div>
  );
};

export default LancamentosTable;