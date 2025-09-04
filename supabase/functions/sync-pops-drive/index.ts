import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  parents: string[]
  modifiedTime: string
}

interface GoogleDocsContent {
  body: {
    content: Array<{
      paragraph?: {
        elements: Array<{
          textRun?: {
            content: string
          }
        }>
      }
    }>
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Iniciando sincronização de POPs do Google Drive...')

    // ID da pasta principal dos POPs
    const popsFolderId = '1apPP6j8av3TV64uuyX9ck8YwWg_MTFXy'

    // Função para buscar todos os arquivos de uma pasta e subpastas
    async function getAllFilesFromFolder(folderId: string): Promise<GoogleDriveFile[]> {
      const allFiles: GoogleDriveFile[] = []
      
      // Buscar arquivos diretamente na pasta
      const filesUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,parents,modifiedTime)&key=${googleApiKey}`
      const filesResponse = await fetch(filesUrl)
      const filesData = await filesResponse.json()
      
      if (filesData.files) {
        allFiles.push(...filesData.files)
      }

      // Buscar subpastas
      const foldersUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)&key=${googleApiKey}`
      const foldersResponse = await fetch(foldersUrl)
      const foldersData = await foldersResponse.json()

      if (foldersData.files) {
        // Recursivamente buscar arquivos em cada subpasta
        for (const folder of foldersData.files) {
          const subfolderFiles = await getAllFilesFromFolder(folder.id)
          allFiles.push(...subfolderFiles)
        }
      }

      return allFiles
    }

    // Buscar todos os arquivos
    const allFiles = await getAllFilesFromFolder(popsFolderId)
    
    // Filtrar apenas Google Docs
    const googleDocs = allFiles.filter(file => 
      file.mimeType === 'application/vnd.google-apps.document'
    )

    console.log(`Encontrados ${googleDocs.length} Google Docs para sincronizar`)

    // Função para extrair conteúdo de um Google Doc
    async function getDocContent(docId: string): Promise<string> {
      try {
        const docUrl = `https://docs.googleapis.com/v1/documents/${docId}?key=${googleApiKey}`
        const response = await fetch(docUrl)
        const docData: GoogleDocsContent = await response.json()

        let content = ''
        
        if (docData.body && docData.body.content) {
          for (const element of docData.body.content) {
            if (element.paragraph && element.paragraph.elements) {
              for (const textElement of element.paragraph.elements) {
                if (textElement.textRun && textElement.textRun.content) {
                  content += textElement.textRun.content
                }
              }
            }
          }
        }

        return content.trim()
      } catch (error) {
        console.error(`Erro ao extrair conteúdo do documento ${docId}:`, error)
        return ''
      }
    }

    // Verificar quais POPs já existem no banco
    const { data: existingPops } = await supabase
      .from('documentos')
      .select('titulo, id')
      .eq('categoria_documento', 'pop')

    const existingTitles = new Set(existingPops?.map(pop => pop.titulo) || [])

    let syncedCount = 0
    let updatedCount = 0

    // Processar cada Google Doc
    for (const doc of googleDocs) {
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
          } else {
            syncedCount++
            console.log(`Criado: ${titulo}`)
          }
        }
      } catch (error) {
        console.error(`Erro ao processar ${doc.name}:`, error)
      }
    }

    const result = {
      success: true,
      message: `Sincronização concluída: ${syncedCount} novos POPs criados, ${updatedCount} atualizados`,
      totalProcessed: googleDocs.length,
      created: syncedCount,
      updated: updatedCount
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
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})