import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Cliente {
  id: string;
  nome: string;
  categoria?: string;
  serie?: string;
  status_cliente?: string;
  situacao_cliente?: string;
  etapa_onboarding?: string;
  etapa_trafego?: string;
  etapa_atual?: string;
  funis_trabalhando?: string[];
  primary_gestor_user_id?: string;
  primary_cs_user_id?: string;
  catalogo_criativos_url?: string;
  primary_gestor?: {
    id: string;
    nome: string;
    avatar_url?: string;
    user_id?: string;
  };
  primary_cs?: {
    id: string;
    nome: string;
    avatar_url?: string;
  };
  client_roles?: Array<{
    user_id: string;
    role: 'gestor' | 'cs';
    is_primary: boolean;
  }>;
}

interface Colaborador {
  user_id: string;
  nome: string;
  avatar_url?: string;
}

interface ClientesGroupedViewProps {
  clientes: Cliente[];
  colaboradores: Colaborador[];
  groupBy: 'gestor' | 'cs';
  onClienteClick?: (cliente: Cliente) => void;
}

// Opções para classificações
const situacaoClienteOptions = [
  { value: 'nao_iniciado', label: 'Não Iniciado', color: 'bg-gray-500' },
  { value: 'alerta', label: 'Alerta', color: 'bg-red-500' },
  { value: 'ponto_de_atencao', label: 'Ponto de Atenção', color: 'bg-yellow-500' },
  { value: 'resultados_normais', label: 'Resultados Normais', color: 'bg-blue-500' },
  { value: 'indo_bem', label: 'Indo bem', color: 'bg-green-500' },
];

const etapaOnboardingOptions = [
  { value: 'onboarding', label: 'Onboarding', color: 'bg-orange-500' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-green-500' },
  { value: 'pausa_temporaria', label: 'Pausa Temporária', color: 'bg-red-500' },
];

const etapaTrafegoOptions = [
  { value: 'estrategia', label: 'Estratégia', color: 'bg-gray-500' },
  { value: 'distribuicao_criativos', label: 'Distribuição', color: 'bg-blue-500' },
  { value: 'conversao_iniciada', label: 'Conversão', color: 'bg-yellow-500' },
  { value: 'voo_de_cruzeiro', label: 'Cruzeiro', color: 'bg-green-500' },
  { value: 'campanhas_pausadas', label: 'Pausadas', color: 'bg-red-500' },
];

const getStatusOption = (options: typeof situacaoClienteOptions, value: string | null | undefined) => {
  return options.find(o => o.value === value) || options[0];
};

const getSerieColor = (serie: string) => {
  switch (serie) {
    case 'Serie A':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'Serie B':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Serie C':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'Serie D':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const ClientesGroupedView = ({ 
  clientes, 
  colaboradores, 
  groupBy,
  onClienteClick 
}: ClientesGroupedViewProps) => {
  const navigate = useNavigate();

  // Agrupar clientes por responsável
  const groupedClientes = useMemo(() => {
    return clientes.reduce((acc, cliente) => {
      let responsavel: { id: string; nome: string; avatar_url?: string } | null = null;
      
      if (groupBy === 'gestor') {
        responsavel = cliente.primary_gestor || null;
      } else {
        responsavel = cliente.primary_cs || null;
      }
      
      const groupKey = (responsavel as any)?.user_id || responsavel?.nome || 'sem_responsavel';
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          responsavel: responsavel || { id: 'sem_responsavel', nome: 'Sem Responsável' },
          clientes: []
        };
      }
      
      acc[groupKey].clientes.push(cliente);
      return acc;
    }, {} as Record<string, { responsavel: { id?: string; nome: string; avatar_url?: string; user_id?: string }; clientes: Cliente[] }>);
  }, [clientes, groupBy]);

  // Ordenar grupos por nome do responsável
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedClientes).sort((a, b) => {
      if (a[0] === 'sem_responsavel') return 1;
      if (b[0] === 'sem_responsavel') return -1;
      return a[1].responsavel.nome.localeCompare(b[1].responsavel.nome);
    });
  }, [groupedClientes]);

  // Inicializar com todos os grupos expandidos
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    return new Set(Object.keys(groupedClientes));
  });

  // Atualizar grupos expandidos quando os grupos mudarem
  useEffect(() => {
    setExpandedGroups(new Set(Object.keys(groupedClientes)));
  }, [groupedClientes]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(sortedGroups.map(([key]) => key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  return (
    <div className="space-y-2">
      {/* Controles de expansão */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expandir todos
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Recolher todos
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          {clientes.length} clientes em {sortedGroups.length} grupos
        </span>
      </div>

      {sortedGroups.map(([groupKey, group]) => {
        const isExpanded = expandedGroups.has(groupKey);
        
        return (
          <Collapsible
            key={groupKey}
            open={isExpanded}
            onOpenChange={() => toggleGroup(groupKey)}
          >
            <div className="border rounded-lg bg-card">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    
                    <Avatar className="h-8 w-8">
                      {group.responsavel.avatar_url ? (
                        <AvatarImage src={group.responsavel.avatar_url} />
                      ) : null}
                      <AvatarFallback className="text-xs bg-primary/10">
                        {group.responsavel.nome === 'Sem Responsável' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          group.responsavel.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <span className="font-medium text-foreground">
                        {group.responsavel.nome}
                      </span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {group.clientes.length}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-center">Categoria</TableHead>
                        <TableHead className="text-center">Série</TableHead>
                        <TableHead className="text-center">Situação</TableHead>
                        <TableHead className="text-center">Onboarding</TableHead>
                        <TableHead className="text-center">Tráfego</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.clientes.map((cliente) => (
                        <TableRow 
                          key={cliente.id} 
                          className="hover:bg-muted/50 cursor-pointer h-14"
                          onClick={() => {
                            if (onClienteClick) {
                              onClienteClick(cliente);
                            } else {
                              navigate(`/painel/${cliente.id}`);
                            }
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{cliente.nome}</span>
                              {cliente.funis_trabalhando && cliente.funis_trabalhando.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {cliente.funis_trabalhando[0]}
                                  {cliente.funis_trabalhando.length > 1 && ` +${cliente.funis_trabalhando.length - 1}`}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Categoria */}
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs ${cliente.categoria === 'negocio_local' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                              {cliente.categoria === 'negocio_local' ? 'Local' : 'Info'}
                            </Badge>
                          </TableCell>
                          
                          {/* Série */}
                          <TableCell className="text-center">
                            {cliente.serie ? (
                              <Badge className={`${getSerieColor(cliente.serie)} text-xs`}>
                                {cliente.serie.replace('Serie ', '')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          
                          {/* Situação */}
                          <TableCell className="text-center">
                            <Badge className={`${getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).color} text-white text-xs px-2 py-0.5`}>
                              {getStatusOption(situacaoClienteOptions, cliente.situacao_cliente).label}
                            </Badge>
                          </TableCell>
                          
                          {/* Onboarding */}
                          <TableCell className="text-center">
                            <Badge className={`${getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).color} text-white text-xs px-2 py-0.5`}>
                              {getStatusOption(etapaOnboardingOptions, cliente.etapa_onboarding).label}
                            </Badge>
                          </TableCell>
                          
                          {/* Tráfego */}
                          <TableCell className="text-center">
                            <Badge className={`${getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).color} text-white text-xs px-2 py-0.5`}>
                              {getStatusOption(etapaTrafegoOptions, cliente.etapa_trafego).label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
      
      {sortedGroups.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum cliente encontrado.
        </div>
      )}
    </div>
  );
};
