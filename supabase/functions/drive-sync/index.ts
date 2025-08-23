import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para extrair folder ID do link do Google Drive
function extractDriveFolderId(url: string): string | null {
  // Padrões de URL do Google Drive para pastas
  const patterns = [
    /\/drive\/folders\/([a-zA-Z0-9-_]+)/,
    /\/folder\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /folders\/([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Função para buscar pastas do Google Drive
async function listDriveFolders(parentFolderId: string): Promise<any> {
  const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
  
  const params = new URLSearchParams({
    key: API_KEY!,
    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: '100'
  });
  
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Google Drive API error (folders): ${response.status} - ${error}`);
    throw new Error(`Google Drive API error: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  console.log('Pastas encontradas:', result.files?.length || 0);
  return result;
}

// Função para buscar arquivos do Google Drive com paginação
async function listDriveFiles(folderId: string, folderName = 'Raiz', folderPath = '', pageToken?: string): Promise<any> {
  const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
  
  const params = new URLSearchParams({
    key: API_KEY!,
    q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'nextPageToken,files(id,name,mimeType,webViewLink,iconLink,thumbnailLink,size,modifiedTime,parents)',
    pageSize: '100'
  });
  
  if (pageToken) {
    params.append('pageToken', pageToken);
  }
  
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  
  console.log(`Fazendo requisição para Google Drive API: https://www.googleapis.com/drive/v3/files?${params}`);
  console.log(`Response status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Google Drive API error: ${response.status} - ${error}`);
    throw new Error(`Google Drive API error: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  
  // Adicionar informações da pasta aos arquivos
  if (result.files) {
    result.files = result.files.map((file: any) => ({
      ...file,
      folderName,
      folderPath,
      parentFolderId: folderId
    }));
  }
  
  console.log('Resposta da API do Google Drive:', JSON.stringify(result, null, 2));
  return result;
}

// Função recursiva para buscar todos os arquivos incluindo subpastas
async function getAllFilesRecursively(folderId: string, folderName = 'Raiz', folderPath = ''): Promise<any[]> {
  let allFiles: any[] = [];
  
  // Buscar arquivos na pasta atual
  let nextPageToken: string | undefined;
  do {
    const result = await listDriveFiles(folderId, folderName, folderPath, nextPageToken);
    allFiles = allFiles.concat(result.files || []);
    nextPageToken = result.nextPageToken;
    
    console.log(`Carregados ${result.files?.length || 0} arquivos da pasta "${folderName}". Total: ${allFiles.length}`);
  } while (nextPageToken);
  
  // Buscar subpastas e seus arquivos recursivamente
  const foldersResult = await listDriveFolders(folderId);
  if (foldersResult.files && foldersResult.files.length > 0) {
    for (const folder of foldersResult.files) {
      const subFolderPath = folderPath ? `${folderPath}/${folder.name}` : folder.name;
      console.log(`Buscando arquivos na subpasta: ${folder.name} (${folder.id})`);
      
      const subFolderFiles = await getAllFilesRecursively(folder.id, folder.name, subFolderPath);
      allFiles = allFiles.concat(subFolderFiles);
    }
  }
  
  return allFiles;
}

// Função para fazer upsert de arquivos no banco
async function upsertCreatives(supabase: any, clientId: string, files: any[]) {
  const creativesToUpsert = files.map(file => ({
    client_id: clientId,
    file_id: file.id,
    name: file.name,
    mime_type: file.mimeType,
    link_web_view: file.webViewLink,
    link_direct: `https://drive.google.com/uc?id=${file.id}`,
    icon_link: file.iconLink,
    thumbnail_link: file.thumbnailLink,
    file_size: file.size ? parseInt(file.size) : null,
    modified_time: file.modifiedTime,
    folder_name: file.folderName || 'Raiz',
    folder_path: file.folderPath || '',
    parent_folder_id: file.parentFolderId,
    archived: false
  }));
  
  for (const creative of creativesToUpsert) {
    const { error } = await supabase
      .from('creatives')
      .upsert(creative, { 
        onConflict: 'client_id,file_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Erro ao fazer upsert do criativo:', error);
      throw error;
    }
  }
  
  return creativesToUpsert.length;
}

// Função para marcar arquivos ausentes como arquivados
async function archiveMissingFiles(supabase: any, clientId: string, currentFileIds: string[]) {
  const { data: existingFiles, error } = await supabase
    .from('creatives')
    .select('file_id')
    .eq('client_id', clientId)
    .eq('archived', false);
  
  if (error) throw error;
  
  const existingFileIds = existingFiles.map((f: any) => f.file_id);
  const missingFileIds = existingFileIds.filter((id: string) => !currentFileIds.includes(id));
  
  if (missingFileIds.length > 0) {
    const { error: archiveError } = await supabase
      .from('creatives')
      .update({ archived: true })
      .eq('client_id', clientId)
      .in('file_id', missingFileIds);
    
    if (archiveError) throw archiveError;
  }
  
  return missingFileIds.length;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, driveFolderUrl, autoPermission, isSync = false } = await req.json();
    
    console.log('Drive sync iniciado:', { clientId, driveFolderUrl, autoPermission, isSync });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Extrair folder ID da URL
    const folderId = extractDriveFolderId(driveFolderUrl);
    if (!folderId) {
      throw new Error('URL do Google Drive inválida. Não foi possível extrair o ID da pasta.');
    }
    
    console.log('Folder ID extraído:', folderId);
    console.log('URL original:', driveFolderUrl);
    
    // Verificar se a API key está configurada
    const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
    console.log('API Key configurada:', API_KEY ? 'Sim' : 'Não');
    
    // Testar se conseguimos acessar a pasta
    try {
      const testResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?key=${API_KEY}&fields=id,name,parents`);
      if (testResponse.ok) {
        const folderInfo = await testResponse.json();
        console.log('Informações da pasta:', folderInfo);
      } else {
        const errorText = await testResponse.text();
        console.log('Erro ao acessar pasta:', testResponse.status, errorText);
      }
    } catch (testError) {
      console.log('Erro no teste de acesso à pasta:', testError);
    }
    
    // Atualizar cliente com drive_folder_id
    const { error: updateError } = await supabase
      .from('clientes')
      .update({ 
        drive_folder_id: folderId,
        auto_permission: autoPermission,
        drive_sync_error: null
      })
      .eq('id', clientId);
    
    if (updateError) throw updateError;
    
    // Buscar todos os arquivos da pasta recursivamente (incluindo subpastas)
    console.log('Iniciando busca recursiva de arquivos...');
    const allFiles = await getAllFilesRecursively(folderId, 'Raiz', '');
    
    console.log(`Total de arquivos encontrados recursivamente: ${allFiles.length}`);
    
    // Fazer upsert dos arquivos
    const upsertedCount = await upsertCreatives(supabase, clientId, allFiles);
    
    // Se for sincronização, marcar arquivos ausentes como arquivados
    let archivedCount = 0;
    if (isSync) {
      const currentFileIds = allFiles.map(file => file.id);
      archivedCount = await archiveMissingFiles(supabase, clientId, currentFileIds);
    }
    
    // Atualizar timestamp da última sincronização
    await supabase
      .from('clientes')
      .update({ 
        last_drive_sync: new Date().toISOString(),
        drive_sync_error: null
      })
      .eq('id', clientId);
    
    const result = {
      success: true,
      folderId,
      totalFiles: allFiles.length,
      upsertedCount,
      archivedCount,
      message: `Sincronização concluída: ${upsertedCount} arquivos processados${archivedCount > 0 ? `, ${archivedCount} arquivados` : ''}`
    };
    
    console.log('Sincronização concluída:', result);
    
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
    console.error('Erro na sincronização do Drive:', error);
    
    // Tentar atualizar o erro no cliente se possível
    if (req.json && req.json.clientId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabase
          .from('clientes')
          .update({ drive_sync_error: error.message })
          .eq('id', req.json.clientId);
      } catch (updateError) {
        console.error('Erro ao atualizar erro no cliente:', updateError);
      }
    }
    
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