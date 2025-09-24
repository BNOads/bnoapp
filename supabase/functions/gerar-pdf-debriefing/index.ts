import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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

    // Gerar um PDF simples usando pdf-lib e salvar no Storage
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const title = `Debriefing: ${debriefing.nome_lancamento || ''}`;
    const cliente = `Cliente: ${debriefing.cliente_nome || ''}`;
    const periodo = `Período: ${debriefing.periodo_inicio || ''} a ${debriefing.periodo_fim || ''}`;

    page.drawText(title, { x: 50, y: 790, size: 20, font, color: rgb(0, 0, 0) });
    page.drawText(cliente, { x: 50, y: 760, size: 12, font });
    page.drawText(periodo, { x: 50, y: 740, size: 12, font });
    page.drawText('Resumo (valores podem ser aproximados):', { x: 50, y: 710, size: 12, font });

    const resumo = [
      `Leads: ${debriefing.leads_total ?? '-'}`,
      `Vendas: ${debriefing.vendas_total ?? '-'}`,
      `Investimento: R$ ${(debriefing.investimento_total ?? 0).toFixed(2)}`,
      `Faturamento: R$ ${(debriefing.faturamento_total ?? 0).toFixed(2)}`,
      `ROAS: ${(debriefing.roas ?? 0).toFixed(2)}x`,
    ];
    resumo.forEach((t, i) => page.drawText(t, { x: 70, y: 690 - i * 18, size: 11, font }));

    const pdfBytes = await pdfDoc.save();

    // Garantir bucket e fazer upload
    const bucket = 'debriefings-pdf';
    try {
      // Tenta criar o bucket (ignora erro se já existir)
      // @ts-ignore - método existe no client de service role
      await supabase.storage.createBucket(bucket, { public: false });
    } catch (_) {}

    const filename = `${debriefing.cliente_nome || 'Cliente'}_${debriefing.nome_lancamento || 'Lancamento'}_Debriefing.pdf`;
    const path = `debriefings/${debriefing_id}/${filename}`;

    const uploadRes = await supabase.storage
      .from(bucket)
      .upload(path, pdfBytes, { upsert: true, contentType: 'application/pdf' });

    if (uploadRes.error) {
      throw uploadRes.error;
    }

    const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60); // 1h
    if (signed.error) {
      throw signed.error;
    }

    const pdfData = {
      filename,
      url: signed.data.signedUrl,
      generated_at: new Date().toISOString(),
    };

    console.log(`PDF gerado com sucesso: ${pdfData.filename}`);

    return new Response(
      JSON.stringify({ success: true, message: 'PDF gerado com sucesso', data: pdfData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na geração do PDF:', error);
    
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