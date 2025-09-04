import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para buscar todos os arquivos de uma pasta e subpastas recursivamente
async function getAllFilesRecursively(folderId: string, folderName = 'Raiz', folderPath = ''): Promise<any[]> {
  const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
  let allFiles: any[] = [];
  
  // Buscar arquivos na pasta atual (apenas Google Docs)
  let nextPageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      key: API_KEY!,
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'nextPageToken,files(id,name,mimeType,webViewLink,modifiedTime,parents)',
      pageSize: '100'
    });
    
    if (nextPageToken) {
      params.append('pageToken', nextPageToken);
    }
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Google Drive API error: ${response.status} - ${error}`);
      throw new Error(`Google Drive API error: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    
    if (result.files) {
      // Adicionar informações da pasta aos arquivos
      const filesWithFolder = result.files.map((file: any) => ({
        ...file,
        folderName,
        folderPath,
        parentFolderId: folderId
      }));
      allFiles = allFiles.concat(filesWithFolder);
    }
    
    nextPageToken = result.nextPageToken;
    console.log(`Carregados ${result.files?.length || 0} Google Docs da pasta "${folderName}". Total: ${allFiles.length}`);
  } while (nextPageToken);
  
  // Buscar subpastas
  const foldersParams = new URLSearchParams({
    key: API_KEY!,
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: '100'
  });
  
  const foldersResponse = await fetch(`https://www.googleapis.com/drive/v3/files?${foldersParams}`);
  
  if (foldersResponse.ok) {
    const foldersResult = await foldersResponse.json();
    if (foldersResult.files && foldersResult.files.length > 0) {
      for (const folder of foldersResult.files) {
        const subFolderPath = folderPath ? `${folderPath}/${folder.name}` : folder.name;
        console.log(`Buscando Google Docs na subpasta: ${folder.name} (${folder.id})`);
        
        const subFolderFiles = await getAllFilesRecursively(folder.id, folder.name, subFolderPath);
        allFiles = allFiles.concat(subFolderFiles);
      }
    }
  }
  
  return allFiles;
}

// Função para extrair conteúdo de um Google Doc
async function getDocContent(docId: string): Promise<string> {
  const API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
  
  try {
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}?key=${API_KEY}`);
    
    if (!response.ok) {
      console.error(`Erro ao acessar documento ${docId}: ${response.status}`);
      return '';
    }
    
    const docData = await response.json();
    let content = '';
    
    if (docData.body && docData.body.content) {
      for (const element of docData.body.content) {
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content) {
              content += textElement.textRun.content;
            }
          }
        }
      }
    }
    
    return content.trim();
  } catch (error) {
    console.error(`Erro ao extrair conteúdo do documento ${docId}:`, error);
    return '';
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Iniciando sincronização de POPs do Google Drive...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas')
    }
    
    if (!googleApiKey) {
      throw new Error('Google Drive API Key não configurada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ID da pasta principal dos POPs
    const popsFolderId = '1apPP6j8av3TV64uuyX9ck8YwWg_MTFXy'
    
    console.log('Buscando Google Docs na pasta dos POPs:', popsFolderId)

    // Buscar todos os Google Docs da pasta recursivamente
    const allDocs = await getAllFilesRecursively(popsFolderId, 'POPs', '')
    
    console.log(`Total de Google Docs encontrados: ${allDocs.length}`)

    // Verificar POPs existentes
    const { data: existingPops, error: fetchError } = await supabase
      .from('documentos')
      .select('titulo, id')
      .eq('categoria_documento', 'pop')

    if (fetchError) {
      throw fetchError
    }

    const existingTitles = new Set(existingPops?.map(pop => pop.titulo) || [])

    let syncedCount = 0
    let updatedCount = 0
    let errorCount = 0

    // Processar cada Google Doc
    for (const doc of allDocs) {
      try {
        console.log(`Processando: ${doc.name}`)
        
        const content = await getDocContent(doc.id)
        
        if (!content) {
          console.log(`Pulando ${doc.name} - sem conteúdo`)
          continue
        }

        // Extrair icone do título se houver emoji
        const emojiMatch = doc.name.match(/^(\p{Emoji})\s*/u)
        const icone = emojiMatch ? emojiMatch[1] : '📄'
        const titulo = doc.name.replace(/^(\p{Emoji})\s*/u, '').trim()

        // Verificar se já existe
        if (existingTitles.has(titulo)) {
          // Atualizar conteúdo existente
          const { error } = await supabase
            .from('documentos')
            .update({
              conteudo: content,
              updated_at: new Date().toISOString(),
              icone: icone
            })
            .eq('titulo', titulo)
            .eq('categoria_documento', 'pop')

          if (error) {
            console.error(`Erro ao atualizar ${titulo}:`, error)
            errorCount++
          } else {
            updatedCount++
            console.log(`Atualizado: ${titulo}`)
          }
        } else {
          // Criar novo POP
          const { error } = await supabase
            .from('documentos')
            .insert({
              titulo: titulo,
              tipo: 'Procedimento',
              conteudo: content,
              categoria_documento: 'pop',
              tags: [],
              autor: 'Equipe BNOads',
              icone: icone,
              link_publico_ativo: true,
              created_by: '08dd8de6-3fef-4561-9fed-c0656eeef9b4' // ID padrão do sistema
            })

          if (error) {
            console.error(`Erro ao criar ${titulo}:`, error)
            errorCount++
          } else {
            syncedCount++
            console.log(`Criado: ${titulo}`)
          }
        }
      } catch (error) {
        console.error(`Erro ao processar ${doc.name}:`, error)
        errorCount++
      }
    }

    const result = {
      success: true,
      message: `Sincronização concluída: ${syncedCount} novos POPs criados, ${updatedCount} atualizados`,
      totalProcessed: allDocs.length,
      created: syncedCount,
      updated: updatedCount,
      errors: errorCount
    }

    console.log('Resultado da sincronização:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na sincronização:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})