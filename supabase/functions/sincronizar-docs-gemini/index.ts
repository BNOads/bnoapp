import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Sincronizar documentos Gemini function called');
    
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url: documentUrl } = await req.json();
    
    if (!documentUrl) {
      return new Response(
        JSON.stringify({ error: 'URL do documento é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processando documento:', documentUrl);

    // Extrair ID do documento da URL
    const docIdMatch = documentUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      throw new Error('URL do documento inválida');
    }
    
    const docId = docIdMatch[1];
    const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
    
    if (!API_KEY) {
      throw new Error('Google Drive API Key não configurada');
    }

    // Buscar metadados do documento
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}?key=${API_KEY}&fields=id,name,modifiedTime,owners`
    );
    
    if (!metadataResponse.ok) {
      throw new Error(`Erro ao acessar documento: ${metadataResponse.status}`);
    }
    
    const metadata = await metadataResponse.json();
    console.log('Metadados do documento:', metadata.name);

    // Tentar extrair conteúdo do documento (método público limitado)
    // Nota: Para acessar o conteúdo completo, seria necessário OAuth
    const exportResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain&key=${API_KEY}`
    );
    
    let conteudo = '';
    if (exportResponse.ok) {
      conteudo = await exportResponse.text();
      console.log('Conteúdo extraído com sucesso');
    } else {
      console.log('Não foi possível extrair conteúdo automaticamente. Usuário deve colar manualmente.');
      return new Response(JSON.stringify({
        success: false,
        requiresManualInput: true,
        documentName: metadata.name,
        documentUrl: documentUrl,
        message: 'Documento encontrado, mas é necessário colar o conteúdo manualmente por questões de permissão'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extrair nome do cliente do título do documento
    const titulo = metadata.name;
    let clienteNome = null;
    
    // Buscar padrões de nomes de clientes no título
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nome, aliases');
    
    for (const cliente of clientes || []) {
      const nomeUpper = cliente.nome.toUpperCase();
      const tituloUpper = titulo.toUpperCase();
      
      if (tituloUpper.includes(nomeUpper)) {
        clienteNome = cliente.nome;
        break;
      }
      
      // Verificar aliases
      if (cliente.aliases) {
        for (const alias of cliente.aliases) {
          if (tituloUpper.includes(alias.toUpperCase())) {
            clienteNome = cliente.nome;
            break;
          }
        }
        if (clienteNome) break;
      }
    }

    console.log('Cliente detectado:', clienteNome);

    // Verificar se já existe uma gravação para este cliente na data
    const hoje = new Date().toISOString().split('T')[0];
    const { data: gravacaoExistente } = await supabase
      .from('gravacoes')
      .select('id, titulo, cliente_id')
      .eq('cliente_id', clientes?.find(c => c.nome === clienteNome)?.id)
      .gte('created_at', hoje + 'T00:00:00')
      .lte('created_at', hoje + 'T23:59:59')
      .maybeSingle();

    if (gravacaoExistente) {
      // Atualizar gravação existente
      const { error: updateError } = await supabase
        .from('gravacoes')
        .update({
          transcricao: conteudo,
          url_gravacao: documentUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', gravacaoExistente.id);

      if (updateError) throw updateError;

      // Processar com IA
      await processarComIA(gravacaoExistente.id, 'gravacao', conteudo);

      return new Response(JSON.stringify({
        success: true,
        action: 'updated',
        gravacao: gravacaoExistente,
        message: 'Transcrição adicionada à gravação existente'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Criar nova gravação
      const clienteId = clientes?.find(c => c.nome === clienteNome)?.id;
      
      const { data: novaGravacao, error: insertError } = await supabase
        .from('gravacoes')
        .insert({
          titulo: `Anotações Gemini - ${titulo}`,
          transcricao: conteudo,
          url_gravacao: documentUrl,
          cliente_id: clienteId,
          created_by: user.id,
          descricao: 'Transcrição importada automaticamente do Google Docs',
          tags: ['gemini', 'google-docs', 'reuniao']
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Processar com IA
      await processarComIA(novaGravacao.id, 'gravacao', conteudo);

      return new Response(JSON.stringify({
        success: true,
        action: 'created',
        gravacao: novaGravacao,
        message: 'Nova gravação criada com transcrição do Gemini'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Erro ao sincronizar documento Gemini:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função auxiliar para processar com IA
async function processarComIA(id: string, tipo: string, transcricao: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    await fetch(`${supabaseUrl}/functions/v1/processar-transcricao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, tipo, transcricao })
    });
  } catch (error) {
    console.error('Erro ao processar com IA:', error);
  }
}