-- Melhorias na tabela documentos para suporte a POPs com links públicos
ALTER TABLE public.documentos 
ADD COLUMN IF NOT EXISTS link_publico TEXT,
ADD COLUMN IF NOT EXISTS link_publico_ativo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS categoria_documento TEXT DEFAULT 'documento',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS autor TEXT,
ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT '📄',
ADD COLUMN IF NOT EXISTS tamanho_arquivo TEXT;

-- Função para gerar link público único
CREATE OR REPLACE FUNCTION public.generate_pop_public_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.link_publico IS NULL AND NEW.categoria_documento = 'pop' THEN
    NEW.link_publico = 'https://app.bnoads.com/pop/publico/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para gerar link público automaticamente para POPs
CREATE OR REPLACE TRIGGER trigger_generate_pop_public_link
  BEFORE INSERT OR UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_pop_public_link();

-- Inserir dados de exemplo para POPs
INSERT INTO public.documentos (
  titulo, 
  categoria_documento, 
  conteudo, 
  created_by, 
  tipo,
  icone,
  autor,
  tags,
  link_publico_ativo
) VALUES
-- POP 1
(
  'Análise diária de Dashboard de Lançamento',
  'pop',
  '# Análise diária de Dashboard de Lançamento

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
- Cliente (se necessário)',
  (SELECT id FROM auth.users LIMIT 1),
  'Procedimento',
  '📊',
  'Equipe BNOads',
  ARRAY['dashboard', 'análise', 'lançamento', 'métricas'],
  true
),
-- POP 2
(
  'Briefing, Debriefing e criação de estratégia de Lançamento',
  'pop',
  '# Briefing, Debriefing e criação de estratégia de Lançamento

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
- Estabelecer cronograma de reuniões',
  (SELECT id FROM auth.users LIMIT 1),
  'Procedimento',
  '🎯',
  'Equipe Estratégia',
  ARRAY['briefing', 'debriefing', 'estratégia', 'lançamento'],
  true
),
-- POP 3
(
  'Como verificar a média das métricas do cliente',
  'pop',
  '# Como verificar a média das métricas do cliente

## 📋 Objetivo
Estabelecer processo padronizado para análise e verificação das métricas médias de performance dos clientes.

## 🎯 Quando executar
- **Frequência:** Semanal (toda sexta-feira)
- **Responsável:** Traffic Manager + CS
- **Duração:** 30-45 minutos

## 📊 Métricas a Analisar

### 1. Métricas de Tráfego
- **Impressões médias**
- **Cliques médios**
- **CTR médio**
- **CPM médio**
- **CPC médio**

### 2. Métricas de Conversão
- **Taxa de conversão média**
- **CPA médio**
- **ROAS médio**
- **ROI médio**

### 3. Métricas de Engagement
- **Taxa de engajamento**
- **Compartilhamentos**
- **Comentários**
- **Reações**

## 🔍 Processo de Verificação

### Passo 1: Coleta de Dados
1. Acessar todas as contas de anúncios do cliente
2. Definir período de análise (últimos 30 dias)
3. Exportar dados consolidados

### Passo 2: Cálculo das Médias
1. **Média ponderada por investimento**
2. **Média simples por campanha**
3. **Comparação com período anterior**

### Passo 3: Benchmark
1. Comparar com médias do setor
2. Comparar com outros clientes similares
3. Identificar pontos de atenção

### Passo 4: Relatório
1. Criar dashboard visual
2. Destacar principais insights
3. Sugerir ações de melhoria

## 📈 Análise de Tendências
- Identificar padrões sazonais
- Avaliar impacto de otimizações
- Prever performance futura

## 📝 Documentação
- Registrar todas as médias calculadas
- Anexar gráficos e dashboards
- Comunicar insights ao cliente',
  (SELECT id FROM auth.users LIMIT 1),
  'Tutorial',
  '📈',
  'Equipe Analytics',
  ARRAY['métricas', 'análise', 'performance', 'cliente'],
  true
);

-- Política RLS para acesso público aos POPs
CREATE POLICY "Acesso público a POPs com link ativo" ON public.documentos
FOR SELECT
USING (categoria_documento = 'pop' AND link_publico_ativo = true);

-- Atualizar política existente para documentos
DROP POLICY IF EXISTS "Usuarios autenticados podem ver documentos" ON public.documentos;
CREATE POLICY "Usuarios autenticados podem ver documentos" ON public.documentos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ) OR 
  (categoria_documento = 'pop' AND link_publico_ativo = true)
);