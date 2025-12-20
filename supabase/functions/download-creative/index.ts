import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_DRIVE_API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');
const MAX_DOWNLOADS_PER_MINUTE = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting - verificar downloads na última hora
    const { count } = await supabaseAdmin
      .from('creative_downloads_audit')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60000).toISOString());

    if (count && count >= MAX_DOWNLOADS_PER_MINUTE) {
      return new Response(JSON.stringify({ 
        error: 'Limite de downloads excedido. Aguarde um momento e tente novamente.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const creativeId = pathParts[pathParts.length - 2];
    const action = pathParts[pathParts.length - 1]; // 'download' ou 'download-batch'

    // Download individual
    if (action === 'download' && creativeId) {
      const { data: creative, error: creativeError } = await supabaseAdmin
        .from('creatives')
        .select('*')
        .eq('id', creativeId)
        .single();

      if (creativeError || !creative) {
        return new Response(JSON.stringify({ error: 'Criativo não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileId = creative.file_id;
      const mimeType = creative.mime_type;
      const fileName = creative.name;
      
      // Determinar se é arquivo Google Workspace
      const isGoogleFile = mimeType?.startsWith('application/vnd.google-apps');
      
      let downloadUrl = '';
      let exportMimeType = mimeType;
      let exportFileName = fileName;

      if (isGoogleFile) {
        // Arquivos do Google Workspace precisam ser exportados
        if (mimeType === 'application/vnd.google-apps.document') {
          exportMimeType = 'application/pdf';
          exportFileName = fileName.replace(/\.[^.]+$/, '') + '.pdf';
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}&key=${GOOGLE_DRIVE_API_KEY}`;
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
          exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          exportFileName = fileName.replace(/\.[^.]+$/, '') + '.xlsx';
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}&key=${GOOGLE_DRIVE_API_KEY}`;
        } else if (mimeType === 'application/vnd.google-apps.presentation') {
          exportMimeType = 'application/pdf';
          exportFileName = fileName.replace(/\.[^.]+$/, '') + '.pdf';
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}&key=${GOOGLE_DRIVE_API_KEY}`;
        } else {
          return new Response(JSON.stringify({ error: 'Tipo de arquivo Google não suportado para download' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else if (mimeType === 'application/vnd.google-apps.shortcut') {
        // Resolver atalho
        const metadataUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=shortcutDetails&key=${GOOGLE_DRIVE_API_KEY}`;
        const metadataResponse = await fetch(metadataUrl);
        
        if (!metadataResponse.ok) {
          return new Response(JSON.stringify({ error: 'Erro ao resolver atalho' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const metadata = await metadataResponse.json();
        const targetId = metadata.shortcutDetails?.targetId;
        
        if (!targetId) {
          return new Response(JSON.stringify({ error: 'Atalho inválido' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${targetId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`;
      } else {
        // Arquivo binário normal
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`;
      }

      // Fazer download do arquivo do Google Drive
      const driveResponse = await fetch(downloadUrl);
      
      if (!driveResponse.ok) {
        const errorText = await driveResponse.text();
        console.error('Erro no download do Drive:', errorText);
        
        // Registrar falha na auditoria
        await supabaseAdmin.from('creative_downloads_audit').insert({
          user_id: user.id,
          client_id: creative.client_id,
          creative_id: creativeId,
          file_id: fileId,
          file_name: fileName,
          file_size: creative.file_size,
          mime_type: mimeType,
          is_batch: false,
          success: false,
          error_message: `Google Drive error: ${driveResponse.status}`,
          download_duration_ms: Date.now() - startTime
        });
        
        return new Response(JSON.stringify({ error: 'Arquivo indisponível ou sem permissão' }), {
          status: driveResponse.status === 404 ? 404 : 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Registrar sucesso na auditoria
      await supabaseAdmin.from('creative_downloads_audit').insert({
        user_id: user.id,
        client_id: creative.client_id,
        creative_id: creativeId,
        file_id: fileId,
        file_name: exportFileName,
        file_size: creative.file_size,
        mime_type: exportMimeType,
        is_batch: false,
        success: true,
        download_duration_ms: Date.now() - startTime
      });

      // Fazer stream do arquivo para o cliente
      const headers = {
        ...corsHeaders,
        'Content-Type': exportMimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(exportFileName)}"`,
        'Cache-Control': 'no-cache',
      };

      return new Response(driveResponse.body, { headers });
    }

    // Download em massa (batch)
    if (action === 'download-batch') {
      const body = await req.json();
      const { ids } = body as { ids: string[] };

      if (!ids || ids.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhum criativo selecionado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (ids.length > 50) {
        return new Response(JSON.stringify({ error: 'Máximo de 50 criativos por vez' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Buscar todos os criativos
      const { data: creatives, error: creativesError } = await supabaseAdmin
        .from('creatives')
        .select('*')
        .in('id', ids);

      if (creativesError || !creatives || creatives.length === 0) {
        return new Response(JSON.stringify({ error: 'Criativos não encontrados' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Importar JSZip dinamicamente
      const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
      const zip = new JSZip();

      let totalSize = 0;
      const MAX_ZIP_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

      for (const creative of creatives) {
        try {
          const fileId = creative.file_id;
          const mimeType = creative.mime_type;
          let fileName = creative.name;
          
          // Verificar tamanho
          if (totalSize + (creative.file_size || 0) > MAX_ZIP_SIZE) {
            console.warn(`Limite de tamanho excedido, pulando: ${fileName}`);
            continue;
          }

          const isGoogleFile = mimeType?.startsWith('application/vnd.google-apps');
          let downloadUrl = '';
          
          if (isGoogleFile) {
            if (mimeType === 'application/vnd.google-apps.document') {
              fileName = fileName.replace(/\.[^.]+$/, '') + '.pdf';
              downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf&key=${GOOGLE_DRIVE_API_KEY}`;
            } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
              fileName = fileName.replace(/\.[^.]+$/, '') + '.xlsx';
              downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&key=${GOOGLE_DRIVE_API_KEY}`;
            } else if (mimeType === 'application/vnd.google-apps.presentation') {
              fileName = fileName.replace(/\.[^.]+$/, '') + '.pdf';
              downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf&key=${GOOGLE_DRIVE_API_KEY}`;
            } else {
              continue; // Pular tipos não suportados
            }
          } else {
            downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`;
          }

          const driveResponse = await fetch(downloadUrl);
          
          if (driveResponse.ok) {
            const arrayBuffer = await driveResponse.arrayBuffer();
            
            // Organizar por pasta no zip
            const folderPath = creative.folder_name && creative.folder_name !== 'Raiz' 
              ? `${creative.folder_name}/` 
              : '';
            
            zip.file(folderPath + fileName, arrayBuffer);
            totalSize += creative.file_size || 0;
          } else {
            console.error(`Erro ao baixar ${fileName}: ${driveResponse.status}`);
          }
        } catch (error) {
          console.error(`Erro ao processar ${creative.name}:`, error);
        }
      }

      // Gerar ZIP
      const zipBlob = await zip.generateAsync({ 
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Registrar download em massa na auditoria
      const clientId = creatives[0]?.client_id;
      const { data: clientData } = await supabaseAdmin
        .from('clientes')
        .select('nome')
        .eq('id', clientId)
        .single();

      await supabaseAdmin.from('creative_downloads_audit').insert({
        user_id: user.id,
        client_id: clientId,
        creative_id: ids[0], // Primeiro ID como referência
        file_id: 'batch',
        file_name: `criativos_${clientData?.nome || 'cliente'}_${new Date().toISOString().split('T')[0]}.zip`,
        file_size: zipBlob.byteLength,
        mime_type: 'application/zip',
        is_batch: true,
        batch_size: ids.length,
        success: true,
        download_duration_ms: Date.now() - startTime
      });

      const zipFileName = `criativos_${clientData?.nome || 'cliente'}_${new Date().toISOString().split('T')[0]}.zip`;

      return new Response(new Blob([zipBlob]), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFileName)}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro no download:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
