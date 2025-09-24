import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessDebriefingRequest {
  debriefing_id: string;
  dados_leads?: any[];
  dados_compradores?: any[];
  dados_trafego?: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { debriefing_id, dados_leads, dados_compradores, dados_trafego }: ProcessDebriefingRequest = await req.json();

    if (!debriefing_id) {
      return new Response(
        JSON.stringify({ error: 'Debriefing ID é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando debriefing ${debriefing_id}`);

    // Atualizar status para processando
    await supabase
      .from('debriefings')
      .update({ status: 'processando' })
      .eq('id', debriefing_id);

    // Inicializar métricas
    let metricas = {
      leads_total: 0,
      vendas_total: 0,
      investimento_total: 0,
      faturamento_total: 0,
      roas: 0,
      cpl: 0,
      ticket_medio: 0,
      conversao_lead_venda: 0,
    };

    // Processar dados de leads
    if (dados_leads && dados_leads.length > 0) {
      metricas.leads_total = dados_leads.length;
      console.log(`Processados ${metricas.leads_total} leads`);
    }

    // Processar dados de compradores (cruzamento por email)
    if (dados_compradores && dados_compradores.length > 0) {
      // Cross-reference buyers with leads by email
      const compradores_validados = dados_compradores.filter(comprador => {
        if (!dados_leads || dados_leads.length === 0) return true;
        return dados_leads.some(lead => lead.email === comprador.email);
      });
      
      metricas.vendas_total = compradores_validados.length;
      metricas.faturamento_total = compradores_validados.reduce((sum, comprador) => {
        return sum + (parseFloat(comprador.valor) || 0);
      }, 0);
      
      if (metricas.vendas_total > 0) {
        metricas.ticket_medio = metricas.faturamento_total / metricas.vendas_total;
      }
      
      console.log(`Processados ${metricas.vendas_total} compradores (${dados_compradores.length - compradores_validados.length} descartados por não ter lead correspondente), faturamento: ${metricas.faturamento_total}`);
    }

    // Processar dados de tráfego
    if (dados_trafego && dados_trafego.length > 0) {
      metricas.investimento_total = dados_trafego.reduce((sum, trafego) => {
        return sum + (parseFloat(trafego.investimento) || 0);
      }, 0);
      
      console.log(`Processados ${dados_trafego.length} registros de tráfego, investimento: ${metricas.investimento_total}`);
    }

    // Calcular métricas derivadas
    if (metricas.leads_total > 0 && metricas.investimento_total > 0) {
      metricas.cpl = metricas.investimento_total / metricas.leads_total;
    }

    if (metricas.vendas_total > 0 && metricas.leads_total > 0) {
      metricas.conversao_lead_venda = metricas.vendas_total / metricas.leads_total;
    }

    if (metricas.faturamento_total > 0 && metricas.investimento_total > 0) {
      metricas.roas = metricas.faturamento_total / metricas.investimento_total;
    }

    // Gerar insights automáticos
    const insights = [];
    
    if (metricas.roas > 3) {
      insights.push("ROAS acima de 3x - Performance excelente!");
    } else if (metricas.roas > 2) {
      insights.push("ROAS entre 2x e 3x - Performance boa");
    } else if (metricas.roas > 1) {
      insights.push("ROAS entre 1x e 2x - Performance pode ser melhorada");
    }

    if (metricas.conversao_lead_venda > 0.05) {
      insights.push("Taxa de conversão lead→venda acima de 5% - Qualidade de leads boa");
    } else if (metricas.conversao_lead_venda > 0.02) {
      insights.push("Taxa de conversão lead→venda entre 2% e 5% - Padrão do mercado");
    } else {
      insights.push("Taxa de conversão lead→venda abaixo de 2% - Revisar qualidade dos leads");
    }

    // Atualizar debriefing com os resultados
    const { error: updateError } = await supabase
      .from('debriefings')
      .update({
        status: 'concluido',
        dados_leads: dados_leads || null,
        dados_compradores: dados_compradores || null,
        dados_trafego: dados_trafego || null,
        ...metricas,
        insights_automaticos: insights
      })
      .eq('id', debriefing_id);

    if (updateError) {
      console.error('Erro ao atualizar debriefing:', updateError);
      throw updateError;
    }

    console.log(`Debriefing ${debriefing_id} processado com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Debriefing processado com sucesso',
        metricas
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});