import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

serve(async (req) => {
  console.log('📥 Nova requisição recebida:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Verificando autenticação...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Token de autorização não fornecido');
      return new Response(JSON.stringify({ error: 'Não autorizado - Token não fornecido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔧 Criando cliente Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variáveis de ambiente não configuradas');
      throw new Error('Configuração do servidor incorreta');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    console.log('👤 Validando JWT do usuário...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Erro ao verificar usuário:', authError);
      return new Response(JSON.stringify({ error: 'Não autorizado - Usuário não encontrado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Usuário autenticado:', user.id);

    console.log('📦 Processando FormData...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string || 'general';
    const entityId = formData.get('entityId') as string;

    if (!file) {
      console.error('❌ Nenhum arquivo fornecido');
      return new Response(JSON.stringify({ error: 'Nenhum arquivo fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📝 Arquivo recebido:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeMB: (file.size / 1024 / 1024).toFixed(2)
    });

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.error('❌ Tipo de arquivo não permitido:', file.type);
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
      console.error('❌ Arquivo muito grande:', file.size);
      return new Response(
        JSON.stringify({ error: `Arquivo muito grande. Máximo: 5MB. Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📖 Lendo dados do arquivo...');
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log('✅ Arquivo lido com sucesso');

    // Gerar nome único
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${extension}`;

    // Construir caminho: {userId}/{context}/{entityId}/{yyyy}/{mm}/{fileName}
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    
    const filePath = entityId
      ? `${user.id}/${context}/${entityId}/${yyyy}/${mm}/${fileName}`
      : `${user.id}/${context}/${yyyy}/${mm}/${fileName}`;

    console.log('☁️ Fazendo upload para:', filePath);

    // Upload para Storage usando admin client
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('richtext-uploads')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '31536000', // 1 ano
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao fazer upload da imagem', 
          details: uploadError.message,
          path: filePath 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Upload concluído com sucesso');

    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('richtext-uploads')
      .getPublicUrl(filePath);

    console.log('🔗 URL pública gerada:', publicUrl);

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
    console.error('❌ Erro não tratado:', error);
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
