import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportarPOPsRequest {
  folder_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('=== INÍCIO DA FUNÇÃO importar-pops-drive ===');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { folder_url }: ImportarPOPsRequest = await req.json();
    
    console.log('Importando POPs da pasta:', folder_url);

    if (!folder_url) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'URL da pasta é obrigatória' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Extrair o ID da pasta da URL
    const folderMatch = folder_url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (!folderMatch) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'URL de pasta do Google Drive inválida' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const folderId = folderMatch[1];
    console.log('ID da pasta extraído:', folderId);

    const apiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'API key do Google Drive não configurada' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Buscar documentos do Google na pasta
    const driveUrl = `https://www.googleapis.com/drive/v3/files?key=${apiKey}&q='${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false&fields=files(id,name,modifiedTime,webViewLink)`;
    
    console.log('Buscando documentos do Google Drive...');
    const driveResponse = await fetch(driveUrl);
    
    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('Erro ao buscar documentos:', driveResponse.status, errorText);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Erro ao acessar Google Drive: ${driveResponse.status}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const driveData = await driveResponse.json();
    const documents = driveData.files || [];
    console.log(`Encontrados ${documents.length} documentos do Google`);

    if (documents.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        imported_count: 0,
        message: 'Nenhum documento do Google encontrado na pasta' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Como esta função será usada internamente pelo sistema, vamos usar um user_id fixo do service role
    // Em produção, pode implementar verificação JWT adequada se necessário
    const DEFAULT_SYSTEM_USER = '00000000-0000-0000-0000-000000000000';
    console.log('Processando importação com usuário do sistema');

    let importedCount = 0;

    // Processar cada documento
    for (const doc of documents) {
      try {
        console.log(`Processando documento: ${doc.name}`);

        // Extrair conteúdo do documento usando Google Docs API
        const docUrl = `https://docs.google.com/document/d/${doc.id}/export?format=txt`;
        const docResponse = await fetch(docUrl);
        
        let content = 'Conteúdo não disponível para visualização pública.';
        if (docResponse.ok) {
          content = await docResponse.text();
        } else {
          console.log(`Não foi possível acessar conteúdo do documento ${doc.name} - usando placeholder`);
        }

        // Determinar categoria baseada no nome do documento
        const category = determineCategory(doc.name);
        
        // Criar POP no banco de dados
        const { error: insertError } = await supabaseClient
          .from('documentos')
          .insert({
            titulo: doc.name,
            conteudo: content,
            categoria_documento: 'pop',
            tipo: 'POP',
            created_by: DEFAULT_SYSTEM_USER,
            tags: [category],
            link_publico_ativo: false,
            autor: 'Importado do Google Drive',
            icone: getIconForCategory(category)
          });

        if (insertError) {
          console.error(`Erro ao inserir documento ${doc.name}:`, insertError);
        } else {
          importedCount++;
          console.log(`Documento ${doc.name} importado com sucesso`);
        }

      } catch (error) {
        console.error(`Erro ao processar documento ${doc.name}:`, error);
      }
    }

    console.log(`Importação concluída: ${importedCount} documentos importados`);

    return new Response(JSON.stringify({ 
      success: true,
      imported_count: importedCount,
      total_found: documents.length,
      message: `${importedCount} POPs importados com sucesso` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função importar-pops-drive:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

function determineCategory(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('dashboard') || lowerName.includes('métricas') || lowerName.includes('analise')) {
    return 'Dashboard';
  }
  if (lowerName.includes('briefing') || lowerName.includes('estratégia') || lowerName.includes('estrategia')) {
    return 'Estratégia';
  }
  if (lowerName.includes('comunicação') || lowerName.includes('comunicacao')) {
    return 'Comunicação';
  }
  if (lowerName.includes('campanha') || lowerName.includes('lançamento') || lowerName.includes('lancamento')) {
    return 'Campanhas';
  }
  if (lowerName.includes('métrica') || lowerName.includes('metrica')) {
    return 'Métricas';
  }
  
  return 'Geral';
}

function getIconForCategory(category: string): string {
  const icons: Record<string, string> = {
    'Dashboard': '📊',
    'Estratégia': '🎯',
    'Métricas': '📈',
    'Comunicação': '💬',
    'Campanhas': '🚀',
    'Geral': '📄'
  };
  return icons[category] || '📄';
}

serve(handler);