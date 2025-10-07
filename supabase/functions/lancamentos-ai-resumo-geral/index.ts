import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar lançamentos ativos
    const { data: lancamentos, error: lancError } = await supabase
      .from("lancamentos")
      .select(`
        *,
        clientes:cliente_id(nome)
      `)
      .eq("ativo", true)
      .in("status_lancamento", ["em_captacao", "cpl", "remarketing", "pausado"])
      .order("updated_at", { ascending: false })
      .limit(20);

    if (lancError) {
      throw new Error("Erro ao buscar lançamentos");
    }

    const hoje = new Date();
    
    // Agrupar por status
    const porStatus = {
      em_captacao: 0,
      cpl: 0,
      remarketing: 0,
      pausado: 0,
    };

    const acoesPrioritarias: Array<{nome: string, dias: number, fase: string}> = [];

    lancamentos?.forEach(lanc => {
      const status = lanc.status_lancamento as keyof typeof porStatus;
      if (porStatus[status] !== undefined) {
        porStatus[status]++;
      }

      // Calcular dias restantes
      const dataFim = new Date(lanc.data_fim_captacao || lanc.data_fechamento || hoje);
      const diasRestantes = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Adicionar a prioritários se <5 dias
      if (diasRestantes > 0 && diasRestantes <= 5) {
        acoesPrioritarias.push({
          nome: lanc.nome_lancamento,
          dias: diasRestantes,
          fase: status
        });
      }
    });

    // Ordenar por dias restantes
    acoesPrioritarias.sort((a, b) => a.dias - b.dias);

    const totalAtivos = lancamentos?.length || 0;

    const prompt = `Gere um resumo do dia para ${totalAtivos} lançamentos ativos:

**Por Status**:
- Em Captação: ${porStatus.em_captacao}
- CPL: ${porStatus.cpl}
- Remarketing: ${porStatus.remarketing}
- Pausados: ${porStatus.pausado}

**Lançamentos Urgentes** (próximos 5 dias):
${acoesPrioritarias.slice(0, 5).map(a => `- ${a.nome}: ${a.dias} dias (${a.fase})`).join("\n")}

Gere um resumo em português com:
1. **Status Geral** (1 frase sobre o panorama do dia)
2. **Ações Prioritárias** (3-5 bullet points dos lançamentos mais urgentes)

Seja direto, frases curtas, sem enrolação.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um assistente de planejamento de lançamentos. Seja direto e conciso."
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro Lovable AI:", aiResponse.status, errorText);
      throw new Error(`Erro ao gerar resumo geral: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Resumo não disponível";

    return new Response(
      JSON.stringify({
        resumo,
        stats: {
          totalAtivos,
          porStatus,
          urgentes: acoesPrioritarias.length
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro em lancamentos-ai-resumo-geral:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});