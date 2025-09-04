-- Inserir mais POPs de exemplo para testar o sistema
INSERT INTO public.documentos (
  titulo, tipo, conteudo, categoria_documento, tags, autor, icone, 
  link_publico_ativo, created_by
) VALUES 
(
  'Criação de Campanhas no Facebook Ads',
  'Procedimento',
  '# Criação de Campanhas no Facebook Ads

## 📋 Objetivo
Padronizar o processo de criação de campanhas no Facebook Ads para garantir configurações otimizadas desde o início.

## 🎯 Estrutura da Campanha

### 1. Configurações da Campanha
- **Objetivo:** Conversões (para e-commerce) ou Geração de Leads
- **Orçamento:** Definir com base no investimento mensal do cliente
- **Programação:** 24h (ajustar conforme necessário)

### 2. Configurações do Conjunto de Anúncios
- **Audiência:** Definir conforme persona do cliente
- **Posicionamentos:** Feeds do Facebook e Instagram (inicialmente)
- **Otimização:** Conversões ou Leads

### 3. Configurações do Anúncio
- **Formato:** Single Image, Carousel ou Video
- **Texto principal:** Máximo 125 caracteres
- **Título:** Máximo 40 caracteres
- **Descrição:** Máximo 30 caracteres

## ✅ Checklist de Validação
- [ ] Pixel do Facebook instalado
- [ ] Eventos de conversão configurados
- [ ] Audiências personalizadas criadas
- [ ] Criativos aprovados pelo cliente
- [ ] Teste A/B definido

## 📊 Métricas de Acompanhamento
- CPM
- CTR
- CPC
- ROAS
- Taxa de Conversão',
  'pop',
  ARRAY['facebook-ads', 'campanhas', 'configuração', 'social-media'],
  'Equipe Social Media',
  '📱',
  true,
  '08dd8de6-3fef-4561-9fed-c0656eeef9b4'
),
(
  'Atendimento ao Cliente via WhatsApp',
  'Procedimento',
  '# Atendimento ao Cliente via WhatsApp

## 📋 Objetivo
Estabelecer padrões para atendimento ao cliente via WhatsApp, garantindo qualidade e agilidade nas respostas.

## ⏰ Horários de Atendimento
- **Segunda a Sexta:** 8h às 18h
- **Sábado:** 8h às 12h
- **Domingo:** Apenas emergências

## 📝 Script de Atendimento

### Saudação Inicial
"Olá! Sou [Nome] da equipe BNOads. Como posso ajudá-lo hoje?"

### Identificação do Cliente
"Para que eu possa ajudá-lo melhor, poderia me informar o nome da sua empresa ou conta?"

### Resolução de Dúvidas
1. Ouvir atentamente a solicitação
2. Fazer perguntas clarificadoras se necessário
3. Oferecer soluções práticas
4. Agendar reunião se necessário

### Encerramento
"Fico feliz em ter ajudado! Se precisar de mais alguma coisa, estarei aqui."

## 🚨 Escalation
- Reclamações → CS Manager
- Problemas técnicos → Suporte Técnico
- Cancelamentos → CS Manager + Comercial

## 📊 Métricas
- Tempo de primeira resposta: < 2 minutos
- Tempo de resolução: < 30 minutos
- Satisfação do cliente: > 95%',
  'pop',
  ARRAY['atendimento', 'whatsapp', 'customer-success', 'comunicação'],
  'Equipe Customer Success',
  '💬',
  true,
  '08dd8de6-3fef-4561-9fed-c0656eeef9b4'
),
(
  'Onboarding de Novos Clientes',
  'Procedimento',
  '# Onboarding de Novos Clientes

## 📋 Objetivo
Garantir que novos clientes tenham uma experiência excepcional desde o primeiro contato até a ativação das campanhas.

## 📅 Timeline do Onboarding

### Dia 1 - Boas-vindas
- [ ] E-mail de boas-vindas
- [ ] Criação do grupo no WhatsApp
- [ ] Agendamento do kick-off meeting
- [ ] Envio do questionário de briefing

### Dias 2-3 - Kick-off Meeting
- [ ] Apresentação da equipe
- [ ] Alinhamento de expectativas
- [ ] Definição de objetivos e metas
- [ ] Cronograma de atividades

### Dias 4-7 - Setup Inicial
- [ ] Configuração das contas publicitárias
- [ ] Instalação de pixels e códigos
- [ ] Criação das primeiras campanhas
- [ ] Setup do dashboard personalizado

### Dias 8-14 - Primeiras Campanhas
- [ ] Aprovação dos primeiros criativos
- [ ] Ativação das campanhas
- [ ] Monitoramento intensivo
- [ ] Reunião de review da primeira semana

## 📋 Documentos Necessários
- Briefing completo
- Acessos às contas
- Assets visuais
- Informações bancárias (se aplicável)

## ✅ Critérios de Sucesso
- Cliente satisfeito com o atendimento
- Campanhas ativas em até 7 dias
- Dashboard configurado
- Primeira reunião de resultados agendada',
  'pop',
  ARRAY['onboarding', 'clientes', 'processo', 'customer-success'],
  'Equipe Customer Success',
  '🚀',
  true,
  '08dd8de6-3fef-4561-9fed-c0656eeef9b4'
),
(
  'Criação de Relatórios Mensais',
  'Procedimento',
  '# Criação de Relatórios Mensais

## 📋 Objetivo
Padronizar a criação de relatórios mensais para clientes, garantindo informações relevantes e apresentação profissional.

## 📊 Estrutura do Relatório

### 1. Capa
- Logo da BNOads
- Nome do cliente
- Período do relatório
- Data de criação

### 2. Resumo Executivo
- Principais resultados do mês
- Comparativo com mês anterior
- Principais insights

### 3. Métricas Gerais
- Investimento total
- ROAS geral
- Volume de conversões
- CPL/CPA médio

### 4. Performance por Canal
- Facebook/Instagram Ads
- Google Ads
- Outros canais

### 5. Análise de Criativos
- Criativos com melhor performance
- Testes realizados
- Recomendações

### 6. Próximos Passos
- Estratégias para o próximo mês
- Testes planejados
- Melhorias sugeridas

## ⏰ Cronograma
- **Dia 28:** Início da coleta de dados
- **Dia 3:** Envio do relatório preliminar
- **Dia 5:** Reunião de apresentação
- **Dia 7:** Relatório final

## 🔧 Ferramentas
- Looker Studio para dashboards
- PowerPoint para apresentação
- Google Sheets para cálculos

## ✅ Checklist Final
- [ ] Dados conferidos
- [ ] Gráficos atualizados
- [ ] Insights relevantes incluídos
- [ ] Próximos passos definidos
- [ ] Apresentação revisada',
  'pop',
  ARRAY['relatórios', 'análise', 'clientes', 'dados'],
  'Equipe Analytics',
  '📊',
  true,
  '08dd8de6-3fef-4561-9fed-c0656eeef9b4'
),
(
  'Backup e Segurança de Dados',
  'Procedimento',
  '# Backup e Segurança de Dados

## 📋 Objetivo
Garantir a segurança e integridade dos dados dos clientes através de procedimentos de backup e medidas de segurança.

## 🔒 Políticas de Segurança

### Controle de Acesso
- Autenticação de dois fatores obrigatória
- Senhas com mínimo de 12 caracteres
- Revisão trimestral de permissões
- Acesso baseado em função (RBAC)

### Classificação de Dados
- **Públicos:** Materiais de marketing
- **Internos:** Estratégias e processos
- **Confidenciais:** Dados de performance
- **Críticos:** Informações pessoais de clientes

## 💾 Procedimentos de Backup

### Backup Diário
- **Horário:** 02:00 (horário de Brasília)
- **Dados:** Campanhas, relatórios, configurações
- **Retenção:** 30 dias

### Backup Semanal
- **Horário:** Domingo às 03:00
- **Dados:** Backup completo do sistema
- **Retenção:** 12 semanas

### Backup Mensal
- **Horário:** Primeiro domingo do mês às 01:00
- **Dados:** Archive completo
- **Retenção:** 12 meses

## 🚨 Plano de Contingência

### Em caso de perda de dados:
1. Ativar protocolo de emergência
2. Comunicar equipe de TI
3. Iniciar restauração do backup
4. Comunicar clientes afetados (se necessário)
5. Documentar incidente

### Testes de Restauração
- **Frequência:** Trimestral
- **Responsável:** Equipe de TI
- **Documentação:** Obrigatória

## 📞 Contatos de Emergência
- TI: +55 11 99999-9999
- Gerência: +55 11 88888-8888
- Suporte: suporte@bnoads.com',
  'pop',
  ARRAY['segurança', 'backup', 'dados', 'ti', 'contingência'],
  'Equipe TI',
  '🔐',
  true,
  '08dd8de6-3fef-4561-9fed-c0656eeef9b4'
);