import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { cliente_nome, rascunho, tipo_resumo, prompt_customizado } = await req.json();

        console.log(`✨ Formatando mensagem semanal (tipo: ${tipo_resumo || 'trafego'}) para:`, cliente_nome);

        if (!rascunho || rascunho.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Nenhum rascunho fornecido para formatação' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
            throw new Error('LOVABLE_API_KEY não configurada');
        }

        const isSistema = tipo_resumo === 'sistema';

        const systemPromptTrafego = `Você é um gestor de tráfego sênior e Customer Success prestando contas semanais para o seu cliente. Seu objetivo é pegar o rascunho de informações do usuário e formatá-lo em uma Mensagem Semanal amigável, clara e persuasiva.

**REGRA DE OURO:**
Você NÃO PODE inventar, alterar, omitir ou modificar nenhum NÚMERO, PREÇO, QUANTIDADE DE LEADS, MÉTRICAS ou DADOS DE CAMPANHAS fornecidos no rascunho. Preservar a exatidão dos dados é a prioridade zero.

**DIRETRIZES DE FORMATAÇÃO E TOM:**
1. A mensagem deve começar de forma calorosa (ex: "Olá! Tudo bem? Segue o nosso resumo da semana para a conta de...").
2. IMPORTANTE PARA WHATSAPP: Use o símbolo "-" (hífen) para listas/tópicos (bullet points). Para negrito, use UM asterisco colado de cada lado da palavra (exemplo: - *Investimento:* R$ 100). NUNCA inicie um tópico da lista com asterisco (ex: de "* *Texto:*" ou "* 📈") pois isso se confunde com o negrito e quebra a formatação do WhatsApp. 
3. Corrige e aprimora todo e qualquer erro ortográfico, gramatical ou de pontuação do rascunho original.
4. Mantenha os termos técnicos compreensíveis ou explicados de forma leve, se possível.
5. Em todas as mensagens, você DEVE gerar uma mini-seção "🎯 *Próximos Passos:*" no final da mensagem. REGRA CRÍTICA PARA PRÓXIMOS PASSOS: NÃO invente estratégias operacionais, ideias de copies novas ou campanhas inovadoras que não foram citadas. Foco ESTRITAMENTE em como otimizar as campanhas e focar em melhorar as MÉTRICAS que vieram no rascunho (ex: custo do lead, conversão, cliques) e o que melhorar no que JÁ existe. Não faça promessas infundadas.

**INFORMAÇÃO IMPORTANTE:**
Retorne APENAS o texto livre finalizado da mensagem semanal (sem blocos de código markdown como \`\`\` ou aspas duplas de string). A sua resposta direta será o novo conteúdo usado pelo gestor na caixa de texto. Evite ser excessivamente robótico. Respire e seja agradável.`;

        const systemPromptSistema = `Você é um Customer Success e Gerente de Projetos sênior prestando contas semanais para o seu cliente sobre as atividades executadas pela agência. Seu objetivo é transformar o rascunho de atividades do sistema em uma Mensagem Semanal humanizada, clara e que faça o cliente sentir que está sendo muito bem assistido.

**REGRA DE OURO:**
Você DEVE focar EXCLUSIVAMENTE nas atividades listadas no rascunho. NÃO invente dados, campanhas, métricas ou atividades que não constem no rascunho.

**ESTRUTURA ESPERADA DA MENSAGEM:**
1. Saudação calorosa e personalizada (ex: "Olá! Tudo bem? Aqui está o resumo das atividades da semana na conta de [Cliente]...")
2. Seção de *O que fizemos esta semana* — agrupe tarefas concluídas, reuniões realizadas e atualizações relevantes
3. Seção de *Em andamento* — tarefas e funis ativos que estão progredindo
4. Seção obrigatória *🎯 Próximos Passos* — baseie-se nas pautas de reuniões (decisões e ações registradas), nas tarefas em andamento e nos funis ativos. Liste ações concretas e realistas que fluam naturalmente do que foi feito. NUNCA invente ações fora do escopo informado.

**FORMATAÇÃO WHATSAPP:**
- Use hífen "-" para bullet points, NUNCA asterisco no início de linha
- Para negrito: *texto* (um asterisco de cada lado, colado na palavra)
- Para itálico (uso esparso): _texto_
- Emojis contextuais ajudam a tornar a mensagem mais amigável e visual

**IMPORTANTE:**
Retorne APENAS o texto final da mensagem (sem blocos de código markdown como \`\`\` ou aspas). A mensagem deve ser calorosa, profissional e fazer o cliente sentir que a equipe está 100% dedicada ao projeto dele.`;

        const systemPrompt = isSistema ? systemPromptSistema : systemPromptTrafego;

        const instrucaoExtra = prompt_customizado?.trim()
            ? `\n\n**Instrução adicional do usuário:** ${prompt_customizado.trim()}`
            : '';

        const userPromptTráfego = `Cliente: **${cliente_nome}**

Texto rascunho fornecido pelo gestor:
---
${rascunho}
---

Por favor, reescreva este rascunho aplicando a formatação correta para WhatsApp, melhorando o português e inserindo os "Próximos Passos" focado estritamente em otimização de métricas (sem criar falsas promessas ou campanhas novas). Preserve absolutamente todos os valores e dados numéricos informados no rascunho inicial.${instrucaoExtra}`;

        const userPromptSistema = `Cliente: **${cliente_nome}**

Relatório de atividades do sistema desta semana:
---
${rascunho}
---

Transforme este relatório em uma mensagem de WhatsApp humanizada, bem formatada e que valorize o trabalho realizado. Baseie os "🎯 Próximos Passos" principalmente nas pautas e anotações de reuniões listadas e nas tarefas em andamento. O cliente deve sentir que está sendo muito bem assistido e que tudo está evoluindo.${instrucaoExtra}`;

        const userPrompt = isSistema ? userPromptSistema : userPromptTráfego;

        console.log('🤖 Chamando Lovable AI (Gemini Flash)...');

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na API do Lovable AI:', response.status, errorText);
            throw new Error(`Erro ao chamar API de IA: ${response.status}`);
        }

        const data = await response.json();
        let textoGerado = data.choices?.[0]?.message?.content || '';

        textoGerado = textoGerado.trim().replace(/\*\*/g, '*');

        console.log('✅ Mensagem formatada com sucesso.');

        return new Response(
            JSON.stringify({ mensagemFormato: textoGerado }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Erro Formatar Mensagem:', error);

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Erro desconhecido ao formatar mensagem'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
