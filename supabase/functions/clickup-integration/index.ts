import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

// Configuração CORS específica para Lovable
const ALLOWED_ORIGINS = [
  'https://preview--bnoapp.lovable.app',
  'https://bnoapp.lovable.app',
  'https://cbfa2195-bc30-40b1-ab11-9249e5552962.sandbox.lovable.dev',
  'http://localhost:3000',
  'http://localhost:5173'
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin.includes(allowed) || allowed.includes(origin)
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
  };
  due_date: string | null;
  date_created: string;
  tags: Array<{
    name: string;
    tag_fg: string;
    tag_bg: string;
  }>;
  assignees: Array<{
    username: string;
    email: string;
  }>;
  url: string;
  description?: string;
}

interface ClickUpComment {
  comment_text: string;
  user: {
    username: string;
  };
  date: string;
}

serve(async (req) => {
  const startTime = Date.now();
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests conforme PRD
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabaseClient.auth.getUser(token);

    const clickupApiKey = Deno.env.get('CLICKUP_API_KEY');
    if (!clickupApiKey) {
      console.error('CLICKUP_API_KEY not found in environment');
      const duration = Date.now() - startTime;
      console.log(`Request completed in ${duration}ms with missing token error`);
      
      return new Response(JSON.stringify({ 
        error: 'missing_clickup_token',
        detail: 'Token do ClickUp não configurado no servidor'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    // Suporta ação via body (POST) ou querystring
    let body: any = null;
    if (req.method !== 'GET') {
      try { body = await req.json(); } catch { /* body pode estar vazio */ }
    }
    const action = (body?.action || url.searchParams.get('action') || 'getTasks') as string;
    const teamId = (body?.teamId || url.searchParams.get('teamId') || '90140307863') as string;

    // Buscar dados do colaborador se houver usuário autenticado
    let colaboradorEmail: string | null = null;
    if (userData?.user?.id) {
      try {
        const { data: colaborador } = await supabaseClient
          .from('colaboradores')
          .select('email')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        colaboradorEmail = colaborador?.email ?? null;
      } catch (e) {
        console.warn('Failed to fetch colaborador email:', e);
      }
    }

    const effectiveEmail = (colaboradorEmail || userData?.user?.email || body?.preferredEmail || 'lucas.oliveirafla7@gmail.com').trim();

    console.log(`ClickUp Integration - Action: ${action}, EffectiveUserEmail: ${effectiveEmail}`);

    switch (action) {
      case 'getTasks':
        return await getTasks(clickupApiKey, teamId, effectiveEmail, body?.preferredEmail);
      
      case 'userLookup':
        return await userLookup(clickupApiKey, teamId, effectiveEmail);
      
      case 'linkUser':
        return await linkUser(supabaseClient, userData, body);
      
      case 'updateTask':
        return await updateTask(clickupApiKey, body);
      
      case 'addComment':
        return await addComment(clickupApiKey, body);
      
      case 'getTeams':
        return await getTeams(clickupApiKey);
      
      case 'debugGetTasks':
        return await debugGetTasks(clickupApiKey, teamId, effectiveEmail);
      
      default:
        return new Response(JSON.stringify({ 
          ok: false, 
          error: 'Invalid action',
          diagnostics: { message: `Action '${action}' not supported` }
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('ClickUp Integration Error:', error);
    console.log(`Request failed in ${duration}ms with error: ${error?.message}`);
    
    return new Response(
      JSON.stringify({ 
        error: 'edge_exception', 
        detail: error?.message || 'Erro interno no servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getTasks(apiKey: string, teamId: string, userEmail: string, preferredEmail?: string) {
  const requestStart = Date.now();
  console.log(`Getting tasks for user ${userEmail} (preferred: ${preferredEmail || 'none'})`);
  console.log(`ClickUp API Key presente: ${apiKey ? 'SIM' : 'NÃO'}, Length: ${apiKey?.length || 0}`);
  console.log(`Team ID (input): ${teamId}`);

  const corsHeaders = getCorsHeaders(null);
  
  // Timeout interno de 10s conforme PRD
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const headers = {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    } as const;

    const emailToUse = userEmail.toLowerCase().trim();

    // 1) Buscar times disponíveis com timeout
    const teamsResponse = await fetch('https://api.clickup.com/api/v2/team', { 
      headers,
      signal: controller.signal 
    });
    
    if (!teamsResponse.ok) {
      const duration = Date.now() - requestStart;
      console.error(`Erro ao buscar teams: ${teamsResponse.status} ${teamsResponse.statusText} in ${duration}ms`);
      
      return new Response(JSON.stringify({ 
        error: 'upstream_error',
        detail: `ClickUp API retornou ${teamsResponse.status}: ${teamsResponse.statusText}`
      }), { status: teamsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const teamsData = await teamsResponse.json();
    const teams = teamsData.teams || [];
    console.log(`Teams disponíveis: ${teams.map((t: any) => `${t.name}#${t.id}`).join(', ')}`);

    const emailToUse = userEmail.toLowerCase().trim();

    // 2) Montar candidatos de teamId (prioriza o recebido via body)
    const candidateTeamIds = Array.from(new Set([
      ...(teamId ? [String(teamId)] : []),
      ...teams.map((t: any) => String(t.id)),
    ]));

    // 3) Encontrar o userId do ClickUp pelo email/alias em algum time
    let selectedTeamId: string | null = null;
    let userId: string | null = null;
    const alias = emailToUse.split('@')[0];

    for (const tid of candidateTeamIds) {
      try {
        const m = await fetch(`https://api.clickup.com/api/v2/team/${tid}/member`, { headers });
        if (!m.ok) {
          console.warn(`GET /team/${tid}/member -> ${m.status} ${m.statusText}`);
          continue;
        }
        const mdata = await m.json();
        const member = mdata.members?.find((mm: any) =>
          mm.user?.email?.toLowerCase() === emailToUse ||
          mm.user?.username?.toLowerCase() === emailToUse ||
          mm.user?.username?.toLowerCase() === alias
        );
        if (member) {
          selectedTeamId = String(tid);
          userId = String(member.user?.id);
          console.log(`Usuário encontrado no time ${selectedTeamId}: userId=${userId}`);
          break;
        }
      } catch (e) {
        console.warn(`Erro ao buscar membros do time ${tid}:`, e);
      }
    }

    // 4) Buscar tarefas utilizando o endpoint do team
    let allTasks: ClickUpTask[] = [];
    if (selectedTeamId && userId) {
      const params = new URLSearchParams({ 
        include_closed: 'true', 
        subtasks: 'true', 
        page: '0',
        order_by: 'due_date',
        'assignees[]': userId
      });
      
      const url = `https://api.clickup.com/api/v2/team/${selectedTeamId}/task?${params.toString()}`;
      console.log('Buscando tarefas para usuário:', url);
      
      const tResp = await fetch(url, { headers, signal: controller.signal });
      if (tResp.ok) {
        const tdata = await tResp.json();
        allTasks = (tdata.tasks || []) as ClickUpTask[];
        console.log(`Total de tarefas encontradas: ${allTasks.length}`);
      } else {
        console.warn(`Falha ao buscar tarefas: ${tResp.status} ${tResp.statusText}`);
      }
    }

    clearTimeout(timeoutId);
    const duration = Date.now() - requestStart;
    console.log(`Found ${allTasks.length} tasks for user ${emailToUse} in ${duration}ms`);

    // Contrato de resposta conforme PRD
    return new Response(
      JSON.stringify({ 
        tasks: allTasks, 
        page: 0,
        total: allTasks.length,
        teamId: selectedTeamId,
        userId: userId,
        duration: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    clearTimeout(timeoutId);
    const duration = Date.now() - requestStart;
    console.error(`Error fetching tasks in ${duration}ms:`, error);
    
    // Tratar timeout específico conforme PRD
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ 
          error: 'upstream_timeout',
          detail: 'Timeout ao consultar ClickUp (10s)' 
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'edge_exception',
        detail: error?.message || 'Erro interno no servidor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function updateTask(apiKey: string, updateData: any) {
  const { taskId, updates } = updateData;
  
  console.log(`Updating task ${taskId}:`, updates);

  try {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status} ${response.statusText}`);
    }

    const updatedTask = await response.json();

    return new Response(
      JSON.stringify({ success: true, task: updatedTask }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

async function addComment(apiKey: string, commentData: any) {
  const { taskId, comment } = commentData;
  
  console.log(`Adding comment to task ${taskId}`);

  try {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment_text: comment,
        notify_all: false
      }),
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status} ${response.statusText}`);
    }

    const commentResponse = await response.json();

    return new Response(
      JSON.stringify({ success: true, comment: commentResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

async function getTeams(apiKey: string) {
  console.log('Getting ClickUp teams');

  try {
    const response = await fetch('https://api.clickup.com/api/v2/team', {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
}

async function debugGetTasks(apiKey: string, teamId: string, userEmail: string) {
  const diagnostics: any = {
    success: false,
    teamId,
    userEmail,
    steps: [] as any[],
    errors: [] as string[],
  };

  try {
    // Step 1: Validate API key
    if (!apiKey) {
      diagnostics.errors.push('CLICKUP_API_KEY não configurada');
      return new Response(JSON.stringify(diagnostics), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 2: Fetch teams
    try {
      const t = await fetch('https://api.clickup.com/api/v2/team', {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      });
      diagnostics.steps.push({ step: 'GET /team', ok: t.ok, status: t.status, statusText: t.statusText });
      const data = t.ok ? await t.json() : null;
      diagnostics.teams = data?.teams?.map((x: any) => ({ id: x.id, name: x.name })) || [];
    } catch (e: any) {
      diagnostics.errors.push(`Erro ao listar teams: ${e.message}`);
    }

    // Step 3: Team members
    try {
      const m = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/member`, {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      });
      diagnostics.steps.push({ step: `GET /team/${teamId}/member`, ok: m.ok, status: m.status, statusText: m.statusText });
      const members = m.ok ? await m.json() : null;
      diagnostics.memberCount = members?.members?.length || 0;
      diagnostics.matchedMember = members?.members?.find((mm: any) =>
        mm.user?.email?.toLowerCase() === userEmail.toLowerCase() ||
        mm.user?.username?.toLowerCase() === userEmail.toLowerCase() ||
        mm.user?.username?.toLowerCase() === userEmail.split('@')[0].toLowerCase()
      ) ? true : false;
    } catch (e: any) {
      diagnostics.errors.push(`Erro ao buscar membros do team: ${e.message}`);
    }

    // Step 4: Spaces
    let spaces: any[] = [];
    try {
      const s = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      });
      diagnostics.steps.push({ step: `GET /team/${teamId}/space`, ok: s.ok, status: s.status, statusText: s.statusText });
      const sdata = s.ok ? await s.json() : null;
      spaces = sdata?.spaces || [];
      diagnostics.spaceCount = spaces.length;
    } catch (e: any) {
      diagnostics.errors.push(`Erro ao listar spaces: ${e.message}`);
    }

    // Step 5: Lists per space (limit for diagnostics)
    diagnostics.listSamples = [] as any[];
    for (const space of spaces.slice(0, 3)) {
      try {
        const l = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
          headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        });
        diagnostics.steps.push({ step: `GET /space/${space.id}/list`, ok: l.ok, status: l.status, statusText: l.statusText });
        const ldata = l.ok ? await l.json() : null;
        diagnostics.listSamples.push({ spaceId: space.id, listCount: ldata?.lists?.length || 0 });
      } catch (e: any) {
        diagnostics.errors.push(`Erro ao listar listas do space ${space.id}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify(diagnostics), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    diagnostics.errors.push(error.message || String(error));
    return new Response(JSON.stringify(diagnostics), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function userLookup(apiKey: string, teamId: string, userEmail: string) {
  console.log(`Looking up user ${userEmail} in team ${teamId}`);
  
  const headers = { 'Authorization': apiKey, 'Content-Type': 'application/json' };

  try {
    // Buscar membros do team
    const response = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/member`, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch team members: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const members = data.members || [];

    // Procurar usuário por email (case-insensitive)
    const foundUser = members.find((member: any) => 
      member.user?.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()
    );

    if (foundUser) {
      return new Response(JSON.stringify({
        found: true,
        user: {
          id: foundUser.user.id,
          username: foundUser.user.username,
          email: foundUser.user.email,
          profilePicture: foundUser.user.profilePicture,
          teamId: teamId
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      // Retornar lista de usuários disponíveis para seleção manual
      const availableUsers = members.map((member: any) => ({
        id: member.user.id,
        username: member.user.username,
        email: member.user.email,
        profilePicture: member.user.profilePicture
      }));

      return new Response(JSON.stringify({
        found: false,
        message: 'not_found',
        availableUsers
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error: any) {
    console.error('Error in userLookup:', error);
    return new Response(JSON.stringify({
      found: false,
      message: 'api_error',
      error: error.message
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function linkUser(supabaseClient: any, userData: any, linkData: any) {
  console.log('Linking user to ClickUp:', linkData);
  
  if (!userData?.user?.id) {
    return new Response(JSON.stringify({
      success: false,
      error: 'User not authenticated'
    }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { clickupUserId, clickupUsername, clickupEmail, clickupProfilePicture, teamId } = linkData;

  try {
    const { data, error } = await supabaseClient
      .from('clickup_user_mappings')
      .upsert({
        user_id: userData.user.id,
        clickup_user_id: clickupUserId,
        clickup_username: clickupUsername,
        clickup_email: clickupEmail,
        clickup_profile_picture: clickupProfilePicture,
        clickup_team_id: teamId
      }, {
        onConflict: 'user_id,clickup_team_id'
      });

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: 'User linked successfully'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error linking user:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}