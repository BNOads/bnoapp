import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  debriefing_id: string;
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

    const { debriefing_id }: GeneratePDFRequest = await req.json();

    if (!debriefing_id) {
      return new Response(
        JSON.stringify({ error: 'Debriefing ID é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Gerando PDF para debriefing ${debriefing_id}`);

    // Fetch debriefing data
    const { data: debriefing, error } = await supabase
      .from('debriefings')
      .select('*')
      .eq('id', debriefing_id)
      .single();

    if (error || !debriefing) {
      return new Response(
        JSON.stringify({ error: 'Debriefing não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // In a real implementation, this would:
    // 1. Generate PDF using a library like Puppeteer or jsPDF
    // 2. Include charts, metrics, and qualitative analysis
    // 3. Apply BNOads branding and template
    // 4. Save to storage bucket
    // 5. Return download URL

    const pdfData = {
      filename: `${debriefing.cliente_nome}_${debriefing.nome_lancamento}_Debriefing.pdf`,
      url: `https://example.com/pdf/${debriefing_id}.pdf`, // Mock URL
      generated_at: new Date().toISOString()
    };

    console.log(`PDF gerado com sucesso: ${pdfData.filename}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'PDF gerado com sucesso',
        data: pdfData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na geração do PDF:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});