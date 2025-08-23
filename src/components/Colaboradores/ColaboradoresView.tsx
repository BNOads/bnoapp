import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, User, Mail, Calendar, BookOpen, MoreVertical } from "lucide-react";

export const ColaboradoresView = () => {
  const colaboradores = [
    {
      id: 1,
      nome: "Maria Silva",
      email: "maria@bnoads.com",
      cargo: "Especialista em Facebook Ads",
      dataEntrada: "Jan 2024",
      progresso: 85,
      treinamentosCompletos: 12,
      status: "ativo"
    },
    {
      id: 2,
      nome: "João Santos",
      email: "joao@bnoads.com",
      cargo: "Analista de Google Ads",
      dataEntrada: "Fev 2024",
      progresso: 72,
      treinamentosCompletos: 8,
      status: "ativo"
    },
    {
      id: 3,
      nome: "Ana Costa",
      email: "ana@bnoads.com",
      cargo: "Designer de Criativos",
      dataEntrada: "Mar 2024",
      progresso: 94,
      treinamentosCompletos: 15,
      status: "ativo"
    },
    {
      id: 4,
      nome: "Pedro Lima",
      email: "pedro@bnoads.com",
      cargo: "Copywriter",
      dataEntrada: "Abr 2024",
      progresso: 56,
      treinamentosCompletos: 6,
      status: "em_treinamento"
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'em_treinamento':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'em_treinamento':
        return 'Em Treinamento';
      default:
        return 'Inativo';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Colaboradores</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie a equipe e acompanhe o progresso dos treinamentos
          </p>
        </div>
        <Button variant="hero" size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Novo Colaborador
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaboradores..."
            className="pl-10 bg-background border-border"
          />
        </div>
        <Button variant="outline" className="shrink-0">
          Filtros
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">47</p>
              <p className="text-sm text-muted-foreground">Total de Colaboradores</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-glow/10 p-3 rounded-xl">
              <BookOpen className="h-6 w-6 text-primary-glow" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">156</p>
              <p className="text-sm text-muted-foreground">Treinamentos Concluídos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-secondary/10 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">94%</p>
              <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Colaboradores List */}
      <Card className="bg-card border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Lista de Colaboradores
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {colaboradores.map((colaborador) => (
              <div
                key={colaborador.id}
                className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border hover:shadow-card transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                      {colaborador.nome.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {colaborador.nome}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {colaborador.cargo}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {colaborador.email}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Desde {colaborador.dataEntrada}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {colaborador.progresso}%
                    </p>
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <div className="w-16 bg-muted rounded-full h-2 mt-1">
                      <div
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${colaborador.progresso}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {colaborador.treinamentosCompletos}
                    </p>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>

                  <Badge className={getStatusColor(colaborador.status)}>
                    {getStatusLabel(colaborador.status)}
                  </Badge>

                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};