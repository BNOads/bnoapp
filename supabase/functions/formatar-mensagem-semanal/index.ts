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
        const { cliente_nome, rascunho } = await req.json();

        console.log('✨ Formatando mensagem semanal para:', cliente_nome);

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

        const systemPrompt = `Você é um gestor de tráfego sênior e Customer Success prestando contas semanais para o seu cliente. Seu objetivo é pegar o rascunho de informações do usuário e formatá-lo em uma Mensagem Semanal amigável, clara e persuasiva.

**REGRA DE OURO:**
Você NÃO PODE inventar, alterar, omitir ou modificar nenhum NÚMERO, PREÇO, QUANTIDADE DE LEADS, MÉTRICAS ou DADOS DE CAMPANHAS fornecidos no rascunho. Preservar a exatidão dos dados é a prioridade zero.

**DIRETRIZES DE FORMATAÇÃO E TOM:**
1. A mensagem deve começar de forma calorosa (ex: "Olá! Tudo bem? Segue o nosso resumo da semana para a conta de...").
2. Liste os números principais em *bullet points* para facilitar a leitura. Use emojis profissionais.
3. Corrige e aprimora todo e qualquer erro ortográfico, gramatical ou de pontuação do rascunho original.
4. Mantenha os termos técnicos compreensíveis ou explicados de forma leve, se possível.
5. Em todas as mensagens, você DEVE gerar uma mini-seção "🎯 **Próximos Passos:**" no final da mensagem, na qual você sugere (com base no contexto do rascunho fornecido) como impulsionar ou resolver o cenário atual.

**INFORMAÇÃO IMPORTANTE:**
Retorne APENAS o texto livre finalizado da mensagem semanal (sem blocos de código markdown como \`\`\` ou aspas duplas de string). A sua resposta direta será o novo conteúdo usado pelo gestor na caixa de texto. Evite ser excessivamente robótico. Respire e seja agradável.`;

        const userPrompt = `Cliente: **${cliente_nome}**

Texto rascunho fornecido pelo gestor:
---
${rascunho}
---

Por favor, reescreva este rascunho aplicando a formatação, melhorando o português e inserindo os "Próximos Passos". Preservando absolutamente todos os valores e solicitações informadas no rascunho inicial.`;

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

        textoGerado = textoGerado.trim();

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
