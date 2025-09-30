import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 2048;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com o token do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Header de autorização ausente');
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('Cliente Supabase criado com autenticação');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string;
    const entityId = formData.get('entityId') as string;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `Arquivo muito grande. Máximo: 5MB. Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processando upload:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      context,
      entityId
    });

    // Ler imagem para validar dimensões
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Gerar nome único
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${extension}`;

    // Construir caminho: uploads/richtext/{context}/{entityId}/{yyyy}/{mm}/{fileName}
    // Se não houver context/entityId, usar 'general'
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    
    const filePath = context && entityId
      ? `${context}/${entityId}/${yyyy}/${mm}/${fileName}`
      : `general/${yyyy}/${mm}/${fileName}`;

    console.log('Fazendo upload para:', filePath);

    // Upload para Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('richtext-uploads')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '31536000', // 1 ano
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao fazer upload da imagem', details: uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabaseClient.storage
      .from('richtext-uploads')
      .getPublicUrl(filePath);

    console.log('Upload concluído:', { filePath, publicUrl });

    // Retornar dados da imagem
    return new Response(
      JSON.stringify({
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro não tratado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});