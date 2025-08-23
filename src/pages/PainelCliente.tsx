import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  ExternalLink, 
  BarChart3, 
  TrendingUp, 
  Users,
  Eye,
  Target
} from "lucide-react";

const PainelCliente = () => {
  const { clienteId } = useParams();

  // Dados mock - em uma aplicação real, você carregaria os dados do cliente específico
  const clienteData = {
    nome: clienteId?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Cliente",
    categoria: "E-commerce",
    nicho: "Moda Feminina",
    status: "Ativo",
    ultimaAtualizacao: "2h atrás"
  };

  const metricas = [
    {
      titulo: "Impressões",
      valor: "124.5K",
      variacao: "+15.2%",
      icon: Eye,
      cor: "text-blue-600"
    },
    {
      titulo: "Cliques",
      valor: "3.2K",
      variacao: "+8.5%",
      icon: Target,
      cor: "text-green-600"
    },
    {
      titulo: "CTR",
      valor: "2.58%",
      variacao: "+0.3%",
      icon: TrendingUp,
      cor: "text-purple-600"
    },
    {
      titulo: "Conversões",
      valor: "89",
      variacao: "+12.1%",
      icon: BarChart3,
      cor: "text-orange-600"
    }
  ];

  const campanhas = [
    {
      nome: "Black Friday 2024",
      status: "Ativa",
      orcamento: "R$ 5.000",
      gasto: "R$ 3.247",
      conversoes: 45,
      ctr: "3.2%"
    },
    {
      nome: "Coleção Verão",
      status: "Ativa",
      orcamento: "R$ 3.000",
      gasto: "R$ 2.890",
      conversoes: 32,
      ctr: "2.8%"
    },
    {
      nome: "Remarketing",
      status: "Pausada",
      orcamento: "R$ 1.500",
      gasto: "R$ 892",
      conversoes: 12,
      ctr: "1.9%"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-subtle border-b border-border shadow-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Painel - {clienteData.nome}
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="outline">{clienteData.categoria}</Badge>
                <Badge variant="outline">{clienteData.nicho}</Badge>
                <span className="text-sm text-muted-foreground">
                  Última atualização: {clienteData.ultimaAtualizacao}
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Relatórios
              </Button>
              <Button variant="default">
                <ExternalLink className="h-4 w-4 mr-2" />
                Gerenciador de Anúncios
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricas.map((metrica, index) => {
            const Icon = metrica.icon;
            return (
              <Card key={index} className="p-6 bg-card border border-border hover:shadow-card transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {metrica.titulo}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {metrica.valor}
                    </p>
                    <p className={`text-sm font-medium mt-1 text-green-600`}>
                      {metrica.variacao} vs. mês anterior
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-subtle">
                    <Icon className={`h-6 w-6 ${metrica.cor}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Campanhas Ativas */}
          <Card className="p-6 bg-card border border-border shadow-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">
                Campanhas em Execução
              </h3>
              <Button variant="outline" size="sm">
                Ver Todas
              </Button>
            </div>
            <div className="space-y-4">
              {campanhas.map((campanha, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">
                        {campanha.nome}
                      </h4>
                      <Badge 
                        variant={campanha.status === 'Ativa' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {campanha.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Orçamento: </span>
                        <span className="font-medium">{campanha.orcamento}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gasto: </span>
                        <span className="font-medium">{campanha.gasto}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conversões: </span>
                        <span className="font-medium">{campanha.conversoes}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CTR: </span>
                        <span className="font-medium">{campanha.ctr}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progresso do Orçamento</span>
                        <span>
                          {Math.round((parseFloat(campanha.gasto.replace('R$ ', '').replace('.', '')) / 
                            parseFloat(campanha.orcamento.replace('R$ ', '').replace('.', ''))) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.round((parseFloat(campanha.gasto.replace('R$ ', '').replace('.', '')) / 
                          parseFloat(campanha.orcamento.replace('R$ ', '').replace('.', ''))) * 100)}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Insights e Recomendações */}
          <Card className="p-6 bg-card border border-border shadow-card">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Insights & Recomendações
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    Performance em Alta
                  </span>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Sua campanha "Black Friday 2024" está performando 23% acima da média. 
                  Considere aumentar o orçamento para maximizar resultados.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Ação Recomendada
                  </span>
                </div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  A campanha de remarketing está pausada há 3 dias. 
                  Reative para recuperar usuários que não converteram.
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-900 dark:text-green-100">
                    Meta Atingida
                  </span>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Parabéns! Você atingiu 112% da meta de conversões para este mês.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Próximos Passos */}
        <Card className="p-6 bg-card border border-border shadow-card">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            Próximos Passos Sugeridos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Otimização de Criativos</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Teste novos formatos de anúncio para a coleção de verão.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Iniciar Teste A/B
              </Button>
            </div>
            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Expansão de Audiência</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Criar lookalike baseado nos melhores compradores.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Criar Audiência
              </Button>
            </div>
            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Análise Sazonal</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Preparar estratégia para o período natalino.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Ver Relatório
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default PainelCliente;