import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, Users, Clock, Search, Plus, Star, Award } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";

export const TreinamentosView = () => {
  const { canCreateContent } = useUserPermissions();
  const cursos = [
    {
      id: 1,
      titulo: "Facebook Ads Completo",
      descricao: "Aprenda a criar campanhas eficientes no Facebook e Instagram",
      duracao: "8h 30m",
      aulas: 24,
      categoria: "Facebook Ads",
      nivel: "Intermediário",
      inscritos: 32,
      conclusoes: 28,
      rating: 4.8,
      thumbnail: "🎯"
    },
    {
      id: 2,
      titulo: "Google Ads Fundamentals",
      descricao: "Domine os fundamentos do Google Ads para negócios locais",
      duracao: "6h 15m",
      aulas: 18,
      categoria: "Google Ads",
      nivel: "Básico",
      inscritos: 45,
      conclusoes: 41,
      rating: 4.9,
      thumbnail: "🚀"
    },
    {
      id: 3,
      titulo: "Criação de Criativos",
      descricao: "Design de anúncios que convertem para tráfego pago",
      duracao: "4h 45m",
      aulas: 12,
      categoria: "Design",
      nivel: "Intermediário",
      inscritos: 28,
      conclusoes: 25,
      rating: 4.7,
      thumbnail: "🎨"
    },
    {
      id: 4,
      titulo: "Analytics e Relatórios",
      descricao: "Como interpretar dados e gerar relatórios eficientes",
      duracao: "5h 20m",
      aulas: 15,
      categoria: "Analytics",
      nivel: "Avançado",
      inscritos: 22,
      conclusoes: 18,
      rating: 4.6,
      thumbnail: "📊"
    },
  ];

  const categorias = ["Todos", "Facebook Ads", "Google Ads", "Design", "Analytics"];
  
  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'Básico':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Intermediário':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'Avançado':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Centro de Treinamentos</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie cursos, aulas e acompanhe o progresso da equipe
          </p>
        </div>
        {canCreateContent && (
          <Button variant="hero" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Novo Curso
          </Button>
        )}
      </div>

      {/* Indicator para usuários não-admin */}
      {!canCreateContent && <ViewOnlyBadge />}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar treinamentos..."
            className="pl-10 bg-background border-border"
          />
        </div>
        <div className="flex gap-2">
          {categorias.map((categoria) => (
            <Button
              key={categoria}
              variant={categoria === "Todos" ? "default" : "outline"}
              size="sm"
            >
              {categoria}
            </Button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">24</p>
              <p className="text-sm text-muted-foreground">Cursos Ativos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-glow/10 p-3 rounded-xl">
              <Users className="h-6 w-6 text-primary-glow" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">127</p>
              <p className="text-sm text-muted-foreground">Inscrições</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-secondary/10 p-3 rounded-xl">
              <Award className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">112</p>
              <p className="text-sm text-muted-foreground">Conclusões</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border border-border shadow-card">
          <div className="flex items-center space-x-3">
            <div className="bg-accent/50 p-3 rounded-xl">
              <Clock className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">88%</p>
              <p className="text-sm text-muted-foreground">Taxa Conclusão</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {cursos.map((curso) => (
          <Card key={curso.id} className="bg-card border border-border shadow-card hover:shadow-elegant transition-all duration-300 group">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl bg-gradient-subtle p-3 rounded-xl">
                    {curso.thumbnail}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                      {curso.titulo}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getNivelColor(curso.nivel)}>
                        {curso.nivel}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-sm text-muted-foreground">{curso.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">
                {curso.descricao}
              </p>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Play className="h-4 w-4" />
                    <span>{curso.aulas} aulas</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{curso.duracao}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{curso.inscritos} inscritos</span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso da Equipe</span>
                  <span className="font-medium text-foreground">
                    {Math.round((curso.conclusoes / curso.inscritos) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(curso.conclusoes / curso.inscritos) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {curso.conclusoes} de {curso.inscritos} colaboradores concluíram
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button variant="default" className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                <Button variant="outline" className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  Relatório
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions - Visível apenas para admins */}
      {canCreateContent && (
        <Card className="bg-gradient-subtle border border-border shadow-card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Ações Rápidas
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="card" className="h-auto p-4 justify-start">
                <BookOpen className="h-5 w-5 text-primary mr-3" />
                <div className="text-left">
                  <p className="font-medium">Criar Novo Curso</p>
                  <p className="text-sm text-muted-foreground">Adicionar conteúdo de treinamento</p>
                </div>
              </Button>
              <Button variant="card" className="h-auto p-4 justify-start">
                <Users className="h-5 w-5 text-primary mr-3" />
                <div className="text-left">
                  <p className="font-medium">Relatório de Progresso</p>
                  <p className="text-sm text-muted-foreground">Visualizar desempenho da equipe</p>
                </div>
              </Button>
              <Button variant="card" className="h-auto p-4 justify-start">
                <Award className="h-5 w-5 text-primary mr-3" />
                <div className="text-left">
                  <p className="font-medium">Certificações</p>
                  <p className="text-sm text-muted-foreground">Gerenciar certificados</p>
                </div>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};