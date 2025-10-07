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
    const { lancamentoId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do lançamento
    const { data: lancamento, error: lancError } = await supabase
      .from("lancamentos")
      .select(`
        *,
        clientes:cliente_id(nome),
        gestor:gestor_responsavel_id(nome)
      `)
      .eq("id", lancamentoId)
      .single();

    if (lancError || !lancamento) {
      throw new Error("Lançamento não encontrado");
    }

    // Calcular dias restantes e progresso
    const hoje = new Date();
    const dataFim = new Date(lancamento.data_fim_captacao || lancamento.data_fechamento || hoje);
    const diasRestantes = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    // Buscar alertas ativos
    const { data: alertas } = await supabase
      .from("alerts")
      .select("*")
      .eq("lancamento_id", lancamentoId)
      .eq("status", "open")
      .order("severity", { ascending: false });

    // Montar prompt para IA
    const prompt = `Analise este lançamento e gere um resumo executivo:

**Lançamento**: ${lancamento.nome_lancamento}
**Cliente**: ${lancamento.clientes?.nome || "Não definido"}
**Tipo**: ${lancamento.tipo_lancamento}
**Status**: ${lancamento.status_lancamento}
**Dias Restantes**: ${diasRestantes > 0 ? diasRestantes : "ENCERRADO"}
**Investimento Total**: R$ ${lancamento.investimento_total?.toLocaleString("pt-BR") || 0}
**Meta Investimento**: R$ ${lancamento.meta_investimento?.toLocaleString("pt-BR") || "Não definida"}
**Leads Desejados**: ${lancamento.leads_desejados || "Não definido"}
**Meta CPL**: R$ ${lancamento.meta_custo_lead || "Não definida"}

${alertas && alertas.length > 0 ? `**Alertas Ativos**: ${alertas.length}` : ""}

Gere um resumo em português com:
1. **Status Atual** (1 frase curta sobre a fase e prazo)
2. **Checklist Urgente** (3-5 ações prioritárias em bullet points)
3. **Alertas** (se houver riscos em metas ou prazos)

Seja direto, frases curtas, sem enrolação.`;

    // Chamar Lovable AI
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
      throw new Error(`Erro ao gerar resumo: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Resumo não disponível";

    return new Response(
      JSON.stringify({
        resumo,
        diasRestantes,
        alertasCount: alertas?.length || 0,
        lancamento: {
          nome: lancamento.nome_lancamento,
          cliente: lancamento.clientes?.nome,
          status: lancamento.status_lancamento,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro em lancamentos-ai-resumo:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});