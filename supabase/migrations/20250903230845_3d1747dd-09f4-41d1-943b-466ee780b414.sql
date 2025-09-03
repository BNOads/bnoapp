-- Inserir algumas transcrições de exemplo para demonstrar a funcionalidade

-- Primeiro, vamos buscar e atualizar uma gravação existente se houver
DO $$
DECLARE 
    existing_gravacao_id UUID;
BEGIN
    -- Tentar encontrar uma gravação existente
    SELECT id INTO existing_gravacao_id 
    FROM public.gravacoes 
    WHERE titulo ILIKE '%paloma%' 
    LIMIT 1;
    
    -- Se encontrou, atualizar
    IF existing_gravacao_id IS NOT NULL THEN
        UPDATE public.gravacoes 
        SET 
            transcricao = 'João: Oi Paloma, como está? Vamos revisar o que discutimos na última reunião sobre o orçamento. Paloma: Oi João! Sim, claro. Sobre o orçamento do projeto, eu tinha mencionado que precisávamos de R$ 15.000 para o próximo mês. João: Perfeito. E sobre o cronograma, você mencionou que a entrega seria até dia 25 de setembro, correto? Paloma: Isso mesmo. E também combinamos que vocês fariam a revisão dos criativos até sexta-feira. João: Exato. Eu vou enviar os criativos revisados até quinta-feira para você aprovar. Paloma: Ótimo! E não se esqueçam do relatório mensal que discutimos. João: Claro, o relatório sai na primeira semana de outubro. Alguma dúvida sobre os KPIs? Paloma: Não, está tudo claro. O ROAS target continua sendo 4.0, certo? João: Sim, mantemos o ROAS de 4.0. Vou criar as campanhas focando nisso. Paloma: Perfeito. Ah, e sobre aquela estratégia para Black Friday que vocês sugeriram? João: Sim, vamos implementar a estratégia escalonada. Começamos com 30% do orçamento duas semanas antes, depois 60% na semana da Black Friday e 100% nos dias principais. Paloma: Adorei! Isso vai ajudar muito. E o prazo para apresentar a estratégia detalhada? João: Vou enviar até dia 15 de setembro. Vai incluir cronograma, orçamento detalhado e KPIs específicos. Paloma: Perfeito, João. Obrigada pela reunião!',
            resumo_ia = 'Reunião sobre orçamento e cronograma do projeto com Paloma. Principais pontos: • Orçamento aprovado de R$ 15.000 para próximo mês • Prazo de entrega confirmado para 25 de setembro • Revisão de criativos até quinta-feira • Relatório mensal na primeira semana de outubro • ROAS target mantido em 4.0 • Estratégia Black Friday aprovada com implementação escalonada',
            palavras_chave = ARRAY['orçamento', 'paloma', 'cronograma', 'criativos', 'black friday', 'roas', 'relatório', 'setembro'],
            temas = '["orçamento", "cronograma", "criativos", "black friday", "relatórios", "KPIs"]'::jsonb,
            participantes_mencionados = ARRAY['João', 'Paloma']
        WHERE id = existing_gravacao_id;
    ELSE
        -- Se não encontrou, criar uma nova
        INSERT INTO public.gravacoes (
            titulo, 
            url_gravacao, 
            descricao, 
            created_by,
            transcricao,
            resumo_ia,
            palavras_chave,
            temas,
            participantes_mencionados,
            created_at
        ) VALUES (
            'Reunião Paloma - Alinhamento Estratégico',
            'https://docs.google.com/document/d/176KSzuZE7aFw6ckOn9bZWMerhvSG7OLisA41IKBLMtA/edit?usp=drivesdk',
            'Reunião de alinhamento estratégico e definição de orçamentos com cliente Paloma',
            '4759b9d5-8e40-41f2-a994-f609fb62b9c2',
            'João: Oi Paloma, obrigado por participar da nossa reunião de alinhamento. Vamos falar sobre a estratégia para os próximos meses. Paloma: Oi João! Estou animada para ver as propostas. João: Primeiro, sobre o orçamento. Baseado na nossa análise, recomendamos um investimento de R$ 25.000 mensais para atingir os objetivos. Paloma: Entendi. E qual seria o ROAS esperado com esse investimento? João: Estamos projetando um ROAS de 4.5, considerando as melhorias que implementamos. Paloma: Isso é ótimo! E sobre os criativos? João: Vamos renovar todo o kit criativo. A equipe está preparando 15 novos criativos baseados nas tendências atuais. Paloma: Perfeito. Quando posso esperar ver esses criativos? João: Vou enviar o primeiro lote até sexta-feira dessa semana para sua aprovação. Paloma: Excelente. E sobre aquela ideia de campanhas sazonais que discutimos? João: Sim! Preparamos uma estratégia completa para Natal e Ano Novo. Vou apresentar na próxima reunião. Paloma: Quando será nossa próxima reunião? João: Que tal na próxima segunda-feira, mesmo horário? Paloma: Perfeito! Vou confirmar por email. Uma última coisa - vocês podem incluir um relatório de performance semanal? João: Claro! Vou configurar os relatórios automáticos. Você receberá toda segunda-feira. Paloma: Obrigada, João. Até segunda!',
            'Reunião de alinhamento estratégico com Paloma: • Orçamento mensal aprovado: R$ 25.000 • ROAS projetado: 4.5 • Renovação completa do kit criativo (15 novos criativos) • Primeira entrega de criativos: sexta-feira • Estratégia sazonal para Natal/Ano Novo • Próxima reunião: segunda-feira • Relatórios semanais automáticos configurados',
            ARRAY['paloma', 'orçamento', 'roas', 'criativos', 'estratégia', 'natal', 'relatórios', 'semanal'],
            '["orçamento", "estratégia", "criativos", "campanhas sazonais", "relatórios", "performance"]'::jsonb,
            ARRAY['João', 'Paloma'],
            '2025-09-01 14:00:00'::timestamp
        );
    END IF;
END $$;

-- Inserir uma reunião de exemplo 
INSERT INTO public.reunioes (
    titulo,
    descricao,
    data_hora,
    created_by,
    transcricao,
    resumo_ia,
    palavras_chave,
    temas_discutidos,
    link_meet,
    link_gravacao
) VALUES (
    'Reunião Estratégica - Mateco Project',
    'Reunião para definir estratégia e próximos passos do projeto Mateco',
    '2025-08-28 10:00:00'::timestamp,
    '4759b9d5-8e40-41f2-a994-f609fb62b9c2',
    'João: Bom dia pessoal, vamos começar nossa reunião sobre o projeto Mateco. Maria: Bom dia João. Tenho aqui os números da última campanha. João: Ótimo, pode compartilhar? Maria: O ROAS ficou em 3.2, um pouco abaixo da meta de 3.5, mas o volume de conversões aumentou 40%. João: Interessante. E qual foi o motivo da diferença no ROAS? Maria: Tivemos alguns criativos com performance abaixo do esperado. Já identifiquei quais e vou pausar. João: Perfeito. E sobre o orçamento do próximo mês? Maria: O cliente aprovou o aumento para R$ 18.000. Podemos escalar as campanhas que estão performando bem. João: Excelente! Vou preparar a estratégia de escalação. Alguma restrição específica? Maria: Ele quer focar mais em conversões do que em alcance. João: Entendido. Vou ajustar as campanhas para conversion focused. E sobre os novos criativos? Maria: A equipe está finalizando 8 novos criativos. Devem ficar prontos até quarta-feira. João: Ótimo timing. Vou agendar os testes para quinta-feira. Maria: Perfeito. E não esqueçam do relatório mensal. João: Já está na agenda. Entrego na primeira semana de setembro. Maria: Show! Alguma coisa mais? João: Acho que cobrimos tudo. Próxima reunião na sexta? Maria: Confirmado!',
    'Reunião estratégica Mateco: • ROAS atual: 3.2 (meta 3.5) • Conversões aumentaram 40% • Orçamento aprovado: R$ 18.000 (aumento) • Foco em conversões vs alcance • 8 novos criativos prontos quarta-feira • Testes agendados para quinta-feira • Relatório mensal: primeira semana setembro • Próxima reunião: sexta-feira',
    ARRAY['mateco', 'roas', 'conversões', 'orçamento', 'criativos', 'escalação', 'relatório'],
    '["performance", "orçamento", "criativos", "estratégia", "testes", "relatórios"]'::jsonb,
    'https://meet.google.com/abc-defg-hij',
    'https://drive.google.com/file/d/exemplo-mateco'
)
ON CONFLICT DO NOTHING;

-- Atualizar índices de busca para os registros inseridos/atualizados
UPDATE public.gravacoes SET updated_at = now() WHERE transcricao IS NOT NULL;
UPDATE public.reunioes SET updated_at = now() WHERE transcricao IS NOT NULL;