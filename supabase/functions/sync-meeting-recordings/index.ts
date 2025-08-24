import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Folder ID da pasta de gravações passada pelo usuário
const RECORDINGS_FOLDER_ID = '1P8nHVBmw2Qx2WXLiuT96B-cdxRnphwda'

// Função para buscar arquivos do Google Drive
async function listDriveFiles(folderId: string, pageToken?: string): Promise<any> {
  const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
  
  const params = new URLSearchParams({
    key: API_KEY!,
    q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'nextPageToken,files(id,name,mimeType,webViewLink,size,modifiedTime,videoMediaMetadata)',
    pageSize: '100'
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

// Função para buscar todos os arquivos de gravação
async function getAllRecordings(): Promise<any[]> {
  let allFiles: any[] = [];
  let nextPageToken: string | undefined;
  
  do {
    const result = await listDriveFiles(RECORDINGS_FOLDER_ID, nextPageToken);
    allFiles = allFiles.concat(result.files || []);
    nextPageToken = result.nextPageToken;
    
    console.log(`Carregados ${result.files?.length || 0} arquivos. Total: ${allFiles.length}`);
  } while (nextPageToken);
  
  return allFiles;
}

// Função para encontrar cliente por nome ou alias
async function findClientByNameOrAlias(supabase: any, fileName: string): Promise<string | null> {
  // Primeiro, buscar todos os clientes
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nome, aliases');
  
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return null;
  }
  
  const lowerFileName = fileName.toLowerCase();
  
  // Buscar por correspondência no nome do arquivo
  for (const cliente of clientes) {
    const nomeCliente = cliente.nome.toLowerCase();
    
    // Verificar se o nome do cliente está no nome do arquivo
    if (lowerFileName.includes(nomeCliente)) {
      console.log(`Cliente encontrado por nome: ${cliente.nome} para arquivo: ${fileName}`);
      return cliente.id;
    }
    
    // Verificar aliases se existirem
    if (cliente.aliases && Array.isArray(cliente.aliases)) {
      for (const alias of cliente.aliases) {
        if (lowerFileName.includes(alias.toLowerCase())) {
          console.log(`Cliente encontrado por alias "${alias}": ${cliente.nome} para arquivo: ${fileName}`);
          return cliente.id;
        }
      }
    }
  }
  
  console.log(`Nenhum cliente encontrado para arquivo: ${fileName}`);
  return null;
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
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Verificar se a API key está configurada
    const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
    if (!API_KEY) {
      throw new Error('Google Drive API Key não configurada');
    }
    
    console.log('Buscando arquivos de gravação...');
    
    // Buscar todos os arquivos de gravação
    const recordings = await getAllRecordings();
    
    console.log(`Total de gravações encontradas: ${recordings.length}`);
    
    let processedCount = 0;
    let matchedCount = 0;
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
    
    // Processar cada gravação
    for (const recording of recordings) {
      try {
        processedCount++;
        
        console.log(`Processando: ${recording.name}`);
        
        // Encontrar cliente correspondente
        const clienteId = await findClientByNameOrAlias(supabase, recording.name);
        
        if (!clienteId) {
          console.log(`Pulando ${recording.name} - nenhum cliente correspondente encontrado`);
          continue;
        }
        
        matchedCount++;
        
        // Verificar se a gravação já existe
        const { data: existingGravacao } = await supabase
          .from('gravacoes')
          .select('id')
          .eq('url_gravacao', recording.webViewLink)
          .single();
        
        if (existingGravacao) {
          console.log(`Gravação já existe: ${recording.name}`);
          continue;
        }
        
        // Extrair informações do vídeo
        const duracao = extractDuration(recording.videoMediaMetadata);
        const titulo = generateTitle(recording.name);
        
        // Inserir nova gravação
        const { error: insertError } = await supabase
          .from('gravacoes')
          .insert({
            titulo,
            descricao: `Gravação importada automaticamente do Google Drive: ${recording.name}`,
            url_gravacao: recording.webViewLink,
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
      matchedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sincronização concluída: ${matchedCount} gravações processadas de ${recordings.length} encontradas`
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
        error: error.message 
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