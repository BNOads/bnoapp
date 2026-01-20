import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

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
// Função para verificar se a API key está válida
async function validateApiKey(): Promise<void> {
  const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
  
  if (!API_KEY || API_KEY.trim() === '') {
    throw new Error('GOOGLE_DRIVE_API_KEY não está configurada. Por favor, configure a API key nas configurações do projeto.');
  }
}

// Função para processar resposta do Google Drive API
async function processGoogleResponse(response: Response, context: string): Promise<any> {
  const responseText = await response.text();
  
  // Verificar se a resposta é HTML (indica erro de autenticação/autorização)
  if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE')) {
    console.error(`Resposta HTML inesperada em ${context}:`, responseText.substring(0, 300));
    
    // Tentar extrair mensagem de erro do HTML
    if (responseText.includes('API key not valid')) {
      throw new Error('A API key do Google Drive é inválida. Por favor, verifique se a chave está correta e tem permissões para a Drive API.');
    }
    if (responseText.includes('API key expired')) {
      throw new Error('A API key do Google Drive expirou. Por favor, gere uma nova chave no Google Cloud Console.');
    }
    if (responseText.includes('Access Not Configured') || responseText.includes('accessNotConfigured')) {
      throw new Error('A Google Drive API não está habilitada para esta API key. Habilite-a no Google Cloud Console.');
    }
    
    throw new Error('Erro de autenticação com o Google Drive. Verifique se a API key está correta e se a pasta está compartilhada publicamente.');
  }
  
  // Tentar parsear como JSON
  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    console.error(`Erro ao parsear JSON em ${context}:`, responseText.substring(0, 300));
    throw new Error(`Resposta inválida do Google Drive: não foi possível processar a resposta.`);
  }
}

// Função para buscar pastas do Google Drive
async function listDriveFolders(parentFolderId: string): Promise<any> {
  await validateApiKey();
  
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
    
    if (response.status === 403) {
      if (error.includes('API key')) {
        throw new Error('A API key do Google Drive é inválida ou não tem permissões suficientes.');
      }
      throw new Error('Acesso negado. Verifique se a pasta está compartilhada como "Qualquer pessoa com o link".');
    }
    if (response.status === 404) {
      throw new Error('Pasta não encontrada. Verifique se a URL do Google Drive está correta.');
    }
    if (response.status === 400) {
      throw new Error('Requisição inválida. Verifique se a URL da pasta do Google Drive está no formato correto.');
    }
    
    throw new Error(`Erro da API do Google Drive (${response.status}): ${error.substring(0, 100)}`);
  }
  
  const result = await processGoogleResponse(response, 'listDriveFolders');
  console.log('Pastas encontradas:', result.files?.length || 0);
  return result;
}

// Função para buscar arquivos do Google Drive com paginação
async function listDriveFiles(folderId: string, folderName = 'Raiz', folderPath = '', pageToken?: string): Promise<any> {
  await validateApiKey();
  
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
  
  console.log(`Fazendo requisição para Google Drive API - Pasta: ${folderName}`);
  console.log(`Response status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Google Drive API error: ${response.status} - ${error}`);
    
    if (response.status === 403) {
      if (error.includes('API key')) {
        throw new Error('A API key do Google Drive é inválida ou não tem permissões suficientes.');
      }
      throw new Error('Acesso negado. Verifique se a pasta está compartilhada como "Qualquer pessoa com o link".');
    }
    if (response.status === 404) {
      throw new Error('Pasta não encontrada. Verifique se a URL do Google Drive está correta.');
    }
    if (response.status === 400) {
      throw new Error('Requisição inválida. Verifique se a URL da pasta do Google Drive está no formato correto.');
    }
    
    throw new Error(`Erro da API do Google Drive (${response.status}): ${error.substring(0, 100)}`);
  }
  
  const result = await processGoogleResponse(response, `listDriveFiles(${folderName})`);
  
  // Adicionar informações da pasta aos arquivos
  if (result.files) {
    result.files = result.files.map((file: any) => ({
      ...file,
      folderName,
      folderPath,
      parentFolderId: folderId
    }));
  }
  
  console.log('Arquivos encontrados na pasta:', result.files?.length || 0);
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

// Função para fazer upsert de arquivos no banco preservando status e NÃO tocando em criativos externos
async function upsertCreatives(supabase: any, clientId: string, files: any[]) {
  let upsertedCount = 0;
  
  for (const file of files) {
    // Primeiro, verificar se o criativo já existe e buscar seus status atuais
    const { data: existingCreative } = await supabase
      .from('creatives')
      .select('is_active, activated_at, activated_by, nomenclatura_trafego, observacao_personalizada, pagina_destino, archived, status')
      .eq('client_id', clientId)
      .eq('file_id', file.id)
      .maybeSingle();

    const creativeData: any = {
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
      // Preservar campos manuais se existirem
      ...(existingCreative && {
        is_active: existingCreative.is_active,
        activated_at: existingCreative.activated_at,
        activated_by: existingCreative.activated_by,
        nomenclatura_trafego: existingCreative.nomenclatura_trafego,
        observacao_personalizada: existingCreative.observacao_personalizada,
        pagina_destino: existingCreative.pagina_destino,
        archived: existingCreative.archived,
        status: existingCreative.status
      })
    };

    // Se não existe registro anterior, garantir valores padrão
    if (!existingCreative) {
      creativeData.archived = false;
      creativeData.is_active = false;
      creativeData.status = 'subir';
    }
    
    const { error } = await supabase
      .from('creatives')
      .upsert(creativeData, { 
        onConflict: 'client_id,file_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Erro ao fazer upsert do criativo:', error);
      throw error;
    }
    
    upsertedCount++;
  }
  
  return upsertedCount;
}

// Função para marcar arquivos ausentes como arquivados (IGNORANDO criativos externos completamente)
async function archiveMissingFiles(supabase: any, clientId: string, currentFileIds: string[]) {
  // Buscar APENAS criativos do Google Drive (com file_id real)
  const { data: existingFiles, error } = await supabase
    .from('creatives')
    .select('file_id')
    .eq('client_id', clientId)
    .eq('archived', false)
    .not('file_id', 'ilike', 'external_%') // Excluir criativos externos
    .not('file_id', 'is', null); // Garantir que file_id não é null
  
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
    
    // Se for sincronização, marcar arquivos ausentes como arquivados (mas NUNCA criativos externos)
    let archivedCount = 0;
    if (isSync) {
      const currentFileIds = allFiles.map(file => file.id);
      archivedCount = await archiveMissingFiles(supabase, clientId, currentFileIds);
      
      // PROTEÇÃO: Garantir que nenhum criativo externo seja tocado pela sincronização
      const { error: protectExternalsError } = await supabase
        .from('creatives')
        .select('id')
        .eq('client_id', clientId)
        .or('file_id.ilike.external_%,file_id.is.null')
        .then(async ({ data: externals, error }) => {
          if (error) return { error };
          if (externals && externals.length > 0) {
            console.log(`Protegendo ${externals.length} criativos externos da sincronização`);
            // Não fazer nenhuma alteração em criativos externos
            return { error: null };
          }
          return { error: null };
        });
      
      if (protectExternalsError) {
        console.error('Erro ao proteger criativos externos:', protectExternalsError);
      } else {
        console.log('Criativos externos completamente protegidos da sincronização');
      }
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
    try {
      const requestData = await req.clone().json();
      if (requestData?.clientId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabase
          .from('clientes')
          .update({ drive_sync_error: (error as Error).message })
          .eq('id', requestData.clientId);
      }
    } catch (updateError) {
      console.error('Erro ao atualizar erro no cliente:', updateError);
    }
    
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