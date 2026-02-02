import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Cliente {
  id: string;
  nome: string;
  categoria?: string;
  serie?: string;
  status_cliente?: string;
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

export const ClientesGroupedView = ({ 
  clientes, 
  colaboradores, 
  groupBy,
  onClienteClick 
}: ClientesGroupedViewProps) => {
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  // Agrupar clientes por responsável
  const groupedClientes = clientes.reduce((acc, cliente) => {
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

  // Ordenar grupos por nome do responsável
  const sortedGroups = Object.entries(groupedClientes).sort((a, b) => {
    if (a[0] === 'sem_responsavel') return 1;
    if (b[0] === 'sem_responsavel') return -1;
    return a[1].responsavel.nome.localeCompare(b[1].responsavel.nome);
  });

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
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-center">
                          {groupBy === 'gestor' ? 'Gestor' : 'CS'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.clientes.map((cliente) => (
                        <TableRow 
                          key={cliente.id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            if (onClienteClick) {
                              onClienteClick(cliente);
                            } else {
                              navigate(`/painel/${cliente.id}`);
                            }
                          }}
                        >
                          <TableCell className="w-8">
                            <User className="h-4 w-4 text-primary" />
                          </TableCell>
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
                          <TableCell className="text-center">
                            {groupBy === 'gestor' && cliente.primary_gestor ? (
                              <Avatar className="h-6 w-6 mx-auto">
                                <AvatarImage src={cliente.primary_gestor.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {cliente.primary_gestor.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ) : groupBy === 'cs' && cliente.primary_cs ? (
                              <Avatar className="h-6 w-6 mx-auto">
                                <AvatarImage src={cliente.primary_cs.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {cliente.primary_cs.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Linha para adicionar cliente */}
                      <TableRow className="hover:bg-muted/30">
                        <TableCell colSpan={3} className="text-center py-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Abrir modal de adicionar cliente com responsável pré-selecionado
                            }}
                          >
                            <span className="mr-2">+</span>
                            Adicionar Cliente
                          </Button>
                        </TableCell>
                      </TableRow>
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
