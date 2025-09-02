import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Star, 
  Download, 
  ExternalLink, 
  Calendar, 
  User, 
  FileText,
  Clock,
  Share,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface POPDocumentProps {
  documentId: string;
  onBack: () => void;
}

// Mock document content
const getDocumentContent = (id: string) => {
  const documents: Record<string, any> = {
    "1": {
      title: "Análise diária de Dashboard de Lançamento",
      category: "Dashboard",
      lastModified: "7 de Mai, 2025",
      author: "Equipe BNOads",
      type: "Procedimento",
      icon: "📊",
      content: `
# Análise diária de Dashboard de Lançamento

## 📋 Objetivo
Este procedimento estabelece a rotina diária para análise dos indicadores de lançamento, garantindo o monitoramento eficaz das campanhas.

## ⏰ Quando executar
- **Horário:** Diariamente às 9h00
- **Responsável:** Traffic Manager responsável pelo cliente
- **Duração estimada:** 15-20 minutos

## 📊 Métricas a analisar

### 1. Indicadores Primários
- **CPM (Custo por Mil Impressões)**
  - Meta: Abaixo de R$ 15,00
  - Ação se acima: Revisar segmentação
  
- **CTR (Taxa de Cliques)**
  - Meta: Acima de 1,5%
  - Ação se abaixo: Testar novos criativos

- **CPC (Custo por Clique)**
  - Meta: Abaixo de R$ 3,00
  - Ação se acima: Otimizar palavras-chave

### 2. Indicadores Secundários
- **Frequência**
  - Meta: Entre 1,5 e 3,0
  - Ação se acima: Expandir audiência

- **Alcance**
  - Monitorar crescimento diário
  - Comparar com dias anteriores

## 🔍 Processo de Análise

### Passo 1: Acesso ao Dashboard
1. Abrir o dashboard do cliente no Facebook Ads Manager
2. Selecionar o período: Últimas 24 horas
3. Aplicar filtros para campanhas de lançamento

### Passo 2: Coleta de Dados
1. Exportar dados para planilha de acompanhamento
2. Registrar todas as métricas principais
3. Calcular variações percentuais

### Passo 3: Identificação de Anomalias
- Quedas de performance acima de 20%
- Picos de custo acima da meta
- Redução significativa no volume

### Passo 4: Ações Corretivas
1. **Se CPM alto:** Revisar segmentação e creative fatigue
2. **Se CTR baixo:** Testar novos anúncios
3. **Se CPC alto:** Otimizar lances e palavras-chave

## 📝 Documentação
- Registrar todas as ações tomadas
- Anexar screenshots relevantes
- Comunicar alterações ao cliente

## 🚨 Escalation
Em caso de quedas críticas de performance (>30%), comunicar imediatamente:
- Team Leader
- Customer Success
- Cliente (se necessário)
      `
    },
    "2": {
      title: "Briefing, Debriefing e criação de estratégia de Lançamento",
      category: "Estratégia", 
      lastModified: "8 de Jun, 2025",
      author: "Equipe Estratégia",
      type: "Procedimento",
      icon: "🎯",
      content: `
# Briefing, Debriefing e criação de estratégia de Lançamento

## 📋 Visão Geral
Procedimento completo para condução de sessões de briefing e debriefing, essenciais para o desenvolvimento de estratégias de lançamento eficazes.

## 🎯 Briefing - Coleta de Informações

### Preparação da Reunião
- **Duração:** 60-90 minutos
- **Participantes:** Cliente, Traffic Manager, Estrategista, CS
- **Ferramentas:** Notion, Zoom, Miro

### Roteiro de Perguntas

#### 1. Produto/Serviço
- Qual é o produto/serviço que será lançado?
- Qual o preço e formato de venda?
- Quais são os diferenciais competitivos?
- Há materiais de apoio (vendas, demos, etc.)?

#### 2. Público-Alvo
- Quem é o cliente ideal (ICP)?
- Qual a faixa etária e gênero predominante?
- Localização geográfica?
- Comportamentos e interesses?
- Dores e objeções principais?

#### 3. Objetivos e Metas
- Qual o objetivo principal do lançamento?
- Meta de faturamento?
- Quantidade de vendas esperadas?
- Prazo para atingir os objetivos?

#### 4. Orçamento e Investimento
- Qual o orçamento total disponível?
- Divisão entre paid media e outros canais?
- Há flexibilidade para ajustes?

#### 5. Concorrência
- Quem são os principais concorrentes?
- Como eles se comunicam?
- Quais estratégias utilizam?

### 📊 Debriefing - Análise de Resultados

#### Métricas a Avaliar
- **Performance Geral**
  - ROI/ROAS alcançado
  - Volume de vendas
  - Ticket médio
  - Taxa de conversão

- **Performance por Canal**
  - Facebook/Instagram Ads
  - Google Ads
  - Orgânico
  - E-mail marketing

#### Pontos de Análise
1. **O que funcionou bem?**
   - Criativos com melhor performance
   - Audiências mais responsivas
   - Horários/dias de maior conversão

2. **O que não funcionou?**
   - Gargalos identificados
   - Criativos com baixo CTR
   - Audiências sem engajamento

3. **Oportunidades de melhoria**
   - Otimizações possíveis
   - Novos canais/estratégias
   - Ajustes na comunicação

## 🚀 Criação da Estratégia

### 1. Definição do Funil
- **ToFu (Topo do Funil):** Awareness
- **MoFu (Meio do Funil):** Consideração
- **BoFu (Fundo do Funil):** Conversão

### 2. Estratégia de Comunicação
- **Messaging principal**
- **Pilares de conteúdo**
- **Tom de voz**
- **CTAs principais**

### 3. Planejamento de Campanhas
- **Estrutura de campanhas**
- **Segmentação de audiências**
- **Cronograma de ativação**
- **Budget allocation**

### 4. KPIs e Métricas
- **Métricas primárias**
- **Métricas secundárias**
- **Frequência de análise**
- **Triggers de otimização**

## 📝 Documentação
- Gravar todas as reuniões
- Criar documento de estratégia
- Definir próximos passos
- Estabelecer cronograma de reuniões
      `
    }
  };

  return documents[id] || {
    title: "Documento não encontrado",
    content: "# Documento não encontrado\n\nO documento solicitado não foi encontrado.",
    category: "Erro",
    lastModified: "N/A",
    author: "Sistema",
    type: "Erro",
    icon: "❌"
  };
};

export const POPDocument = ({ documentId, onBack }: POPDocumentProps) => {
  const document = getDocumentContent(documentId);

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-foreground mb-6 mt-8 first:mt-0">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold text-foreground mb-4 mt-6">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold text-foreground mb-3 mt-4">{line.substring(4)}</h3>;
      } else if (line.startsWith('#### ')) {
        return <h4 key={index} className="text-lg font-medium text-foreground mb-2 mt-3">{line.substring(5)}</h4>;
      } else if (line.startsWith('- ')) {
        return <li key={index} className="text-foreground ml-4 mb-1">{line.substring(2)}</li>;
      } else if (line.match(/^\d+\./)) {
        return <li key={index} className="text-foreground ml-4 mb-1 list-decimal">{line.substring(line.indexOf('.') + 1)}</li>;
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-semibold text-foreground mb-2">{line.replace(/\*\*/g, '')}</p>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="text-foreground mb-2 leading-relaxed">{line}</p>;
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no Drive
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Sugerir edição
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Document Info */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <span className="text-2xl">{document.icon}</span>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {document.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {document.lastModified}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {document.author}
              </div>
              <Badge variant="outline">
                {document.type}
              </Badge>
              <Badge variant="outline">
                {document.category}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Document Content */}
      <Card className="p-8">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          {renderContent(document.content)}
        </div>
      </Card>
    </div>
  );
};