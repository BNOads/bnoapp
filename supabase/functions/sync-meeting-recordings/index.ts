import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para extrair folder ID da URL do Drive
function extractFolderId(driveUrl: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = driveUrl.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Função para buscar arquivos do Google Drive
async function listDriveFiles(folderId: string, pageToken?: string): Promise<any> {
  const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
  
  const params = new URLSearchParams({
    key: API_KEY!,
    q: `'${folderId}' in parents and (mimeType contains 'video/' or name contains '.mp4' or name contains '.mov' or name contains '.avi' or name contains '.mkv' or name contains '.webm') and trashed=false`,
    fields: 'nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink,size,modifiedTime,videoMediaMetadata)',
    pageSize: '100',
    orderBy: 'modifiedTime desc'
  });
  
  if (pageToken) {
    params.append('pageToken', pageToken);
  }
  
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Google Drive API error: ${response.status} - ${error}`);
    throw new Error(`Google Drive API error: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Função para extrair duração do vídeo (se disponível)
function extractDuration(videoMetadata: any): number | null {
  if (videoMetadata && videoMetadata.durationMillis) {
    return Math.floor(parseInt(videoMetadata.durationMillis) / 1000); // Converter para segundos
  }
  return null;
}

// Função para gerar título baseado no nome do arquivo
function generateTitle(fileName: string): string {
  // Remover extensão
  let title = fileName.replace(/\.[^/.]+$/, "");
  
  // Remover caracteres especiais e normalizar
  title = title.replace(/[_-]/g, ' ');
  title = title.replace(/\s+/g, ' ').trim();
  
  // Capitalizar primeira letra
  return title.charAt(0).toUpperCase() + title.slice(1);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando sincronização de gravações de reunião...');
    
    // Parse request body
    const { clienteId, clienteName } = await req.json();
    
    if (!clienteId) {
      throw new Error('clienteId é obrigatório');
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Buscar a pasta do Drive do cliente
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .select('pasta_drive_url, nome')
      .eq('id', clienteId)
      .single();
    
    if (clienteError || !clienteData) {
      throw new Error('Cliente não encontrado');
    }
    
    if (!clienteData.pasta_drive_url) {
      throw new Error('Cliente não possui pasta do Google Drive configurada');
    }
    
    // Extrair folder ID da URL
    const folderId = extractFolderId(clienteData.pasta_drive_url);
    
    if (!folderId) {
      throw new Error('Não foi possível extrair o ID da pasta do Google Drive');
    }
    
    console.log(`Cliente: ${clienteData.nome}, Folder ID: ${folderId}`);
    
    // Verificar se a API key está configurada
    const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
    if (!API_KEY) {
      throw new Error('Google Drive API Key não configurada');
    }
    
    console.log('Buscando arquivos de gravação...');
    
    // Função auxiliar para buscar gravações usando o folderId do cliente
    const getAllRecordingsForClient = async (): Promise<any[]> => {
      let allFiles: any[] = [];
      let nextPageToken: string | undefined;
      
      do {
        const result = await listDriveFiles(folderId, nextPageToken);
        allFiles = allFiles.concat(result.files || []);
        nextPageToken = result.nextPageToken;
        
        console.log(`Carregados ${result.files?.length || 0} arquivos. Total: ${allFiles.length}`);
      } while (nextPageToken);
      
      return allFiles;
    };
    
    // Buscar todos os arquivos de gravação do cliente
    const recordings = await getAllRecordingsForClient();
    
    console.log(`Total de gravações encontradas: ${recordings.length}`);
    
    let processedCount = 0;
    let insertedCount = 0;
    let errors: string[] = [];
    
    // Buscar um usuário admin para ser o created_by
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('nivel_acesso', 'admin')
      .limit(1)
      .single();
    
    const createdBy = adminProfile?.user_id;
    
    if (!createdBy) {
      console.warn('Nenhum usuário admin encontrado, usando sistema como created_by');
    }
    
    // Processar cada gravação para o cliente específico
    for (const recording of recordings) {
      try {
        processedCount++;
        
        console.log(`Processando: ${recording.name}`);
        
        // Verificar se a gravação já existe
        const { data: existingGravacao } = await supabase
          .from('gravacoes')
          .select('id, thumbnail_url')
          .eq('url_gravacao', recording.webViewLink)
          .single();
        
        if (existingGravacao) {
          // Se existe mas não tem thumbnail, atualizar
          if (!existingGravacao.thumbnail_url && recording.thumbnailLink) {
            const { error: updateError } = await supabase
              .from('gravacoes')
              .update({ thumbnail_url: recording.thumbnailLink })
              .eq('id', existingGravacao.id);
            
            if (updateError) {
              console.error(`Erro ao atualizar thumbnail ${recording.name}:`, updateError);
            } else {
              console.log(`Thumbnail atualizada: ${recording.name}`);
            }
          } else {
            console.log(`Gravação já existe: ${recording.name}`);
          }
          continue;
        }
        
        // Extrair informações do vídeo
        const duracao = extractDuration(recording.videoMediaMetadata);
        const titulo = generateTitle(recording.name);
        
        // Inserir nova gravação associada ao cliente
        const { error: insertError } = await supabase
          .from('gravacoes')
          .insert({
            titulo,
            descricao: `Gravação importada automaticamente do Google Drive: ${recording.name}`,
            url_gravacao: recording.webViewLink,
            thumbnail_url: recording.thumbnailLink,
            duracao,
            cliente_id: clienteId,
            created_by: createdBy,
            tags: ['reuniao', 'importada']
          });
        
        if (insertError) {
          console.error(`Erro ao inserir gravação ${recording.name}:`, insertError);
          errors.push(`${recording.name}: ${insertError.message}`);
        } else {
          console.log(`Gravação inserida com sucesso: ${titulo}`);
          insertedCount++;
        }
        
      } catch (error: any) {
        console.error(`Erro ao processar ${recording.name}:`, error);
        errors.push(`${recording.name}: ${error.message}`);
      }
    }
    
    const result = {
      success: true,
      totalRecordings: recordings.length,
      processedCount,
      insertedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sincronização concluída: ${insertedCount} gravações novas de ${recordings.length} encontradas`
    };
    
    console.log('Sincronização de gravações concluída:', result);
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error: any) {
    console.error('Erro na sincronização de gravações:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})