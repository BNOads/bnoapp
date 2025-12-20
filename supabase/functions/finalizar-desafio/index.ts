import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const authToken = authHeader.replace('Bearer ', '');
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com token do usuário para autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      }
    );

    // Cliente com service role para operações administrativas (ignora RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário autenticado:', user.id);

    // Verificar se o usuário é admin ou gestor usando o cliente admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nivel_acesso')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perfil do usuário:', profile);

    if (!profile || !['admin', 'gestor_trafego'].includes(profile.nivel_acesso)) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas administradores podem finalizar desafios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { desafioId } = await req.json();

    if (!desafioId) {
      return new Response(
        JSON.stringify({ error: 'ID do desafio não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finalizando desafio: ${desafioId}`);

    // Buscar informações do desafio usando cliente admin
    const { data: desafio, error: desafioError } = await supabaseAdmin
      .from('gamificacao_desafios')
      .select('*')
      .eq('id', desafioId)
      .single();

    if (desafioError || !desafio) {
      console.error('Erro ao buscar desafio:', desafioError);
      return new Response(
        JSON.stringify({ error: 'Desafio não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (desafio.finalizado) {
      return new Response(
        JSON.stringify({ error: 'Este desafio já foi finalizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar o vencedor do ranking (posição 1) usando cliente admin
    const { data: ranking, error: rankingError } = await supabaseAdmin
      .from('gamificacao_ranking')
      .select('*')
      .eq('desafio_id', desafioId)
      .eq('posicao', 1)
      .maybeSingle();

    if (rankingError) {
      console.error('Erro ao buscar ranking:', rankingError);
    }

    console.log('Ranking encontrado:', ranking);

    let mensagemVencedor = '';
    let vencedor: { nome: string; avatar_url: string | null } | null = null;

    if (ranking) {
      // Buscar dados do colaborador vencedor usando cliente admin
      const { data: colaborador, error: colError } = await supabaseAdmin
        .from('colaboradores')
        .select('nome, avatar_url')
        .eq('id', ranking.colaborador_id)
        .single();
      
      if (colError) {
        console.error('Erro ao buscar colaborador vencedor:', colError);
        // Mesmo com erro, criar mensagem com os dados do ranking
        mensagemVencedor = `🏆 **Vencedor:** Colaborador com ${ranking.total_pontos} pontos e ${ranking.total_acoes} ações!`;
      } else {
        vencedor = colaborador;
        mensagemVencedor = `🏆 **Vencedor:** ${colaborador.nome} com ${ranking.total_pontos} pontos e ${ranking.total_acoes} ações!`;
      }
    } else {
      mensagemVencedor = 'Nenhum participante registrou ações neste desafio.';
    }

    console.log('Mensagem do vencedor:', mensagemVencedor);

    // Marcar desafio como finalizado usando cliente admin
    const { error: updateError } = await supabaseAdmin
      .from('gamificacao_desafios')
      .update({ 
        finalizado: true,
        ativo: false 
      })
      .eq('id', desafioId);

    if (updateError) {
      console.error('Erro ao finalizar desafio:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao finalizar desafio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar notificação para todos usando cliente admin
    const notificacaoConteudo = `O desafio "${desafio.titulo}" foi finalizado!\n\n${mensagemVencedor}\n\nParabéns a todos os participantes pelo empenho! 🎉`;

    const { error: avisoError } = await supabaseAdmin
      .from('avisos')
      .insert({
        titulo: `Desafio Finalizado: ${desafio.titulo}`,
        conteudo: notificacaoConteudo,
        tipo: 'info',
        prioridade: 'alta',
        destinatarios: ['all'],
        ativo: true,
        created_by: user.id,
        data_inicio: new Date().toISOString(),
        data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      });

    if (avisoError) {
      console.error('Erro ao criar notificação:', avisoError);
      // Não retornar erro, pois o desafio já foi finalizado
    }

    console.log(`Desafio ${desafioId} finalizado com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Desafio finalizado com sucesso',
        vencedor: vencedor || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao processar requisição:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});