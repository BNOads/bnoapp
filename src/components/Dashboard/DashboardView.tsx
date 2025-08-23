import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, BookOpen, BarChart3, TrendingUp, Clock } from "lucide-react";

export const DashboardView = () => {
  const stats = [
    { 
      title: "Colaboradores Ativos", 
      value: "47", 
      change: "+12%", 
      icon: Users,
      color: "text-primary"
    },
    { 
      title: "Clientes Ativos", 
      value: "89", 
      change: "+23%", 
      icon: Calendar,
      color: "text-primary-glow"
    },
    { 
      title: "Treinamentos Concluídos", 
      value: "156", 
      change: "+8%", 
      icon: BookOpen,
      color: "text-secondary"
    },
    { 
      title: "Taxa de Progresso", 
      value: "94%", 
      change: "+5%", 
      icon: TrendingUp,
      color: "text-primary"
    },
  ];

  const recentActivities = [
    { user: "Maria Silva", action: "Concluiu módulo de Facebook Ads", time: "2h atrás" },
    { user: "João Santos", action: "Acessou painel do cliente XYZ", time: "4h atrás" },
    { user: "Ana Costa", action: "Iniciou curso de Google Analytics", time: "6h atrás" },
    { user: "Pedro Lima", action: "Completou avaliação mensal", time: "1d atrás" },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-primary rounded-2xl p-8 text-primary-foreground shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Bem-vindo à BNOads</h2>
            <p className="text-primary-foreground/80 text-lg">
              Gerencie sua equipe e acompanhe o progresso dos treinamentos
            </p>
          </div>
          <BarChart3 className="h-16 w-16 opacity-80" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 bg-card border border-border hover:shadow-card transition-all duration-300 hover:border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                  <p className={`text-sm font-medium mt-1 ${stat.color}`}>
                    {stat.change} este mês
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-subtle`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <Card className="p-6 bg-card border border-border shadow-card">
          <h3 className="text-xl font-semibold mb-6 text-foreground">
            Ações Rápidas
          </h3>
          <div className="space-y-4">
            <Button variant="card" className="w-full justify-start h-auto p-4">
              <Users className="h-5 w-5 text-primary mr-3" />
              <div className="text-left">
                <p className="font-medium">Cadastrar Colaborador</p>
                <p className="text-sm text-muted-foreground">Adicionar novo membro à equipe</p>
              </div>
            </Button>
            <Button variant="card" className="w-full justify-start h-auto p-4">
              <Calendar className="h-5 w-5 text-primary mr-3" />
              <div className="text-left">
                <p className="font-medium">Criar Painel Cliente</p>
                <p className="text-sm text-muted-foreground">Gerar novo painel personalizado</p>
              </div>
            </Button>
            <Button variant="card" className="w-full justify-start h-auto p-4">
              <BookOpen className="h-5 w-5 text-primary mr-3" />
              <div className="text-left">
                <p className="font-medium">Adicionar Treinamento</p>
                <p className="text-sm text-muted-foreground">Criar novo curso ou material</p>
              </div>
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-card border border-border shadow-card">
          <h3 className="text-xl font-semibold mb-6 text-foreground">
            Atividade Recente
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {activity.user}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};