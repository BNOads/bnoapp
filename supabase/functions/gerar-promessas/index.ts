import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Recebendo requisição para gerar promessas...');
    
    const body = await req.json();
    console.log('📋 Body recebido:', JSON.stringify(body));
    
    const { cliente, nomeProduto, avatar, goal, interval, container, tom } = body;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cliente || !nomeProduto || !goal) {
      console.error('❌ Campos obrigatórios faltando:', { cliente: !!cliente, nomeProduto: !!nomeProduto, goal: !!goal });
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando: cliente, nomeProduto e goal são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar informações do cliente
    const clienteInfo = `
NOME DO CLIENTE: ${cliente.nome}
    `.trim();

    const prompt = `Você é uma IA especialista em copywriting e naming de ofertas, usando o método MAGIC de Alex Hormozi.

Com base nas informações do cliente abaixo, gere 3 ideias de nome e promessa para um novo lançamento.

CLIENTE:
${clienteInfo}

DADOS DO LANÇAMENTO:
Produto: ${nomeProduto}
Público-alvo: ${avatar || 'Não especificado'}
Meta/resultado desejado: ${goal}
Prazo/tempo de entrega: ${interval || 'Não especificado'}
Formato do produto: ${container}
Tom de comunicação: ${tom}

Sistema MAGIC:
M = Magnet (Razão Magnética): algo atrativo, exclusivo ou de impacto.
A = Avatar (Público-Alvo): quem é o público principal.
G = Goal (Meta): o resultado final prometido.
I = Interval (Intervalo de Tempo): em quanto tempo o resultado será alcançado.
C = Container (Formato): a embalagem da oferta (mentoria, curso, desafio, etc.).

Responda no formato:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ OPÇÃO 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Nome da oferta:**
[Nome aqui]

**Promessa:**
[Promessa aqui]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ OPÇÃO 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Nome da oferta:**
[Nome aqui]

**Promessa:**
[Promessa aqui]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ OPÇÃO 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Nome da oferta:**
[Nome aqui]

**Promessa:**
[Promessa aqui]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ANÁLISE DO SISTEMA MAGIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Explique em 2-3 linhas como os 5 elementos do MAGIC foram aplicados em cada opção]

Seja direto, use linguagem impactante e adaptada ao tom de comunicação solicitado.`;

    console.log('🤖 Chamando Lovable AI para gerar promessas...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em copywriting e naming de ofertas usando o método MAGIC. Seja criativo e impactante.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Lovable:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes no Lovable AI. Adicione créditos na sua conta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erro na API de IA: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const resultado = data.choices?.[0]?.message?.content || '';

    console.log('✅ Promessas geradas com sucesso');

    return new Response(
      JSON.stringify({ resultado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao gerar promessas:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao gerar promessas' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
