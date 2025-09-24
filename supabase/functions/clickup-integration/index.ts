import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

// CORS headers (relaxed for web usage per Supabase/Lovable guidance)
const getCorsHeaders = (_origin: string | null) => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
});

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
    const action = (body?.action || body?.mode || url.searchParams.get('action') || url.searchParams.get('mode') || 'getTasks') as string;
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
      
      case 'listAllUsers':
        console.log('Action listAllUsers called');
        return await listAllUsers(clickupApiKey, teamId);
      
      case 'listUsers':
        console.log('Action listUsers called (PRD mode)');
        return await listUsersPRD(clickupApiKey, teamId);
      
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

  const corsHeaders = getCorsHeaders(null);

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

  const corsHeaders = getCorsHeaders(null);

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

  const corsHeaders = getCorsHeaders(null);

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

  const corsHeaders = getCorsHeaders(null);

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

// Função para gerar aliases de um email/nome
function generateAliases(email: string, name?: string): string[] {
  const aliases = new Set<string>();
  
  // Email original
  aliases.add(email.toLowerCase().trim());
  
  // Parte antes do @
  const username = email.split('@')[0].toLowerCase();
  aliases.add(username);
  
  // Remover números do username
  aliases.add(username.replace(/\d+/g, ''));
  
  // Se tem nome, gerar variações
  if (name) {
    const nameLower = name.toLowerCase().trim();
    aliases.add(nameLower);
    
    // Primeiro nome
    const firstName = nameLower.split(' ')[0];
    aliases.add(firstName);
    
    // Nome sem espaços
    aliases.add(nameLower.replace(/\s+/g, ''));
    
    // Iniciais
    const initials = nameLower.split(' ').map(n => n[0]).join('');
    aliases.add(initials);
    
    // Apelidos comuns
    const nicknames: Record<string, string[]> = {
      'fernando': ['fefo', 'fer', 'nando'],
      'francisco': ['chico', 'cisco'],
      'josé': ['zé', 'zeca'],
      'joão': ['jão', 'joao'],
      'maria': ['mary', 'mari'],
      'ana': ['aninha'],
      'antônio': ['toninho', 'antonio'],
      'rafael': ['rafa'],
      'rafaela': ['rafa'],
      'lucas': ['luca', 'luke'],
      'isabela': ['isa', 'bela'],
      'esther': ['ester']
    };
    
    Object.entries(nicknames).forEach(([fullName, nicks]) => {
      if (nameLower.includes(fullName)) {
        nicks.forEach(nick => aliases.add(nick));
      }
    });
  }
  
  return Array.from(aliases).filter(alias => alias.length > 1);
}

// Função para calcular similaridade entre strings
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Distância de Levenshtein
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

async function userLookup(apiKey: string, teamId: string, userEmail: string) {
  console.log(`Looking up user ${userEmail} in team ${teamId}`);
  
  const headers = { 'Authorization': apiKey, 'Content-Type': 'application/json' };
  const corsHeaders = getCorsHeaders(null);

  try {
    // Buscar dados do colaborador no sistema para obter o nome
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    
    const { data: colaborador } = await supabaseClient
      .from('colaboradores')
      .select('nome, email')
      .eq('email', userEmail)
      .maybeSingle();
    
    const userName = colaborador?.nome;
    console.log(`User data found: ${userName} (${userEmail})`);

    // Gerar aliases para o usuário
    const userAliases = generateAliases(userEmail, userName);
    console.log(`Generated aliases for ${userEmail}:`, userAliases);

    // Primeiro buscar todos os times para encontrar o usuário
    let allTeams = [];
    let foundUser = null;
    let foundTeamId = null;
    
    try {
      const teamsResp = await fetch('https://api.clickup.com/api/v2/team', { headers });
      if (teamsResp.ok) {
        const teamsData = await teamsResp.json();
        allTeams = teamsData.teams || [];
      }
    } catch (e) {
      console.warn('Falha ao buscar times:', e);
    }

    // Se não conseguiu buscar times, usa o teamId fornecido
    if (allTeams.length === 0) {
      allTeams = [{ id: teamId, name: 'Default Team' }];
    }

    // Buscar em todos os times
    for (const team of allTeams) {
      const tid = String(team.id);
      
      try {
        const response = await fetch(`https://api.clickup.com/api/v2/team/${tid}/member`, { headers });
        
        if (!response.ok) {
          console.warn(`GET /team/${tid}/member -> ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        const members = data.members || [];

        // 1. Busca exata por email
        foundUser = members.find((member: any) => 
          member.user?.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()
        );

        if (foundUser) {
          foundTeamId = tid;
          console.log(`Exact email match found in team ${tid}: ${foundUser.user.email}`);
          break;
        }

        // 2. Busca por aliases nos usernames e emails
        for (const alias of userAliases) {
          foundUser = members.find((member: any) => {
            const memberUsername = member.user?.username?.toLowerCase() || '';
            const memberEmail = member.user?.email?.toLowerCase() || '';
            
            return memberUsername.includes(alias) || 
                   memberEmail.includes(alias) ||
                   alias.includes(memberUsername.split('@')[0]) ||
                   alias.includes(memberEmail.split('@')[0]);
          });
          
          if (foundUser) {
            foundTeamId = tid;
            console.log(`Alias match found in team ${tid}: ${alias} -> ${foundUser.user.username}`);
            break;
          }
        }

        if (foundUser) break;

        // 3. Busca por similaridade (fuzzy matching) dentro deste time
        const similarities = members.map((member: any) => {
          const memberUsername = member.user?.username || '';
          const memberEmail = member.user?.email || '';
          
          const usernameAlias = userEmail.split('@')[0];
          const usernameSimilarity = calculateSimilarity(usernameAlias, memberUsername);
          const emailSimilarity = calculateSimilarity(userEmail, memberEmail);
          
          let nameSimilarity = 0;
          if (userName) {
            nameSimilarity = Math.max(
              calculateSimilarity(userName.toLowerCase(), memberUsername.toLowerCase()),
              calculateSimilarity(userName.toLowerCase(), memberEmail.split('@')[0].toLowerCase())
            );
          }
          
          const maxSimilarity = Math.max(usernameSimilarity, emailSimilarity, nameSimilarity);
          
          return {
            member,
            similarity: maxSimilarity,
            teamId: tid
          };
        }).sort((a: any, b: any) => b.similarity - a.similarity);

        // Se há uma correspondência com similaridade > 0.7, usar
        const bestMatch = similarities[0];
        if (bestMatch && bestMatch.similarity > 0.7) {
          foundUser = bestMatch.member;
          foundTeamId = tid;
          console.log(`High similarity match found in team ${tid}: ${foundUser.user.username} (${bestMatch.similarity.toFixed(2)})`);
          break;
        }

      } catch (e) {
        console.warn('Falha ao buscar membros do time', tid, e);
        continue;
      }
    }

    // Se encontrou o usuário, retornar sucesso
    if (foundUser && foundTeamId) {
      return new Response(JSON.stringify({
        found: true,
        matchType: foundTeamId === teamId ? 'found_in_target_team' : 'found_in_other_team',
        user: {
          id: foundUser.user.id,
          username: foundUser.user.username,
          email: foundUser.user.email,
          profilePicture: foundUser.user.profilePicture,
          teamId: foundTeamId
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Se não encontrou, apresentar alternativa: buscar todos os usuários do time principal para seleção manual
    let availableUsers = [];
    try {
      const response = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/member`, { headers });
      if (response.ok) {
        const data = await response.json();
        const members = data.members || [];
        availableUsers = members.map((member: any) => ({
          id: member.user.id,
          username: member.user.username,
          email: member.user.email,
          profilePicture: member.user.profilePicture
        }));
      }
    } catch (e) {
      console.warn('Falha ao buscar usuários para alternativa:', e);
    }

    // Alternativa: permitir seleção manual ou buscar em workspaces
    return new Response(JSON.stringify({
      found: false,
      message: 'not_found',
      searchedAliases: userAliases,
      searchedTeams: allTeams.map((t: any) => ({ id: t.id, name: t.name })),
      alternative: {
        title: 'Usuário não encontrado automaticamente',
        description: `Não foi possível encontrar ${userEmail} automaticamente. Aqui estão as opções disponíveis:`,
        options: [
          {
            type: 'manual_selection',
            title: 'Selecionar manualmente',
            description: 'Escolha um usuário da lista abaixo:',
            availableUsers: availableUsers.slice(0, 10)
          },
          {
            type: 'workspace_search',
            title: 'Buscar em outros workspaces',
            description: 'O usuário pode estar em outro workspace do ClickUp'
          },
          {
            type: 'invite_user',
            title: 'Convidar usuário',
            description: 'Convide o usuário para o workspace atual'
          }
        ]
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error in userLookup:', error);
    
    // Alternativa em caso de erro: informações de diagnóstico
    return new Response(JSON.stringify({
      found: false,
      message: 'api_error',
      error: error.message,
      alternative: {
        title: 'Erro na conexão com ClickUp',
        description: 'Ocorreu um erro ao buscar o usuário. Verifique:',
        options: [
          {
            type: 'check_api_key',
            title: 'Verificar API Key',
            description: 'Confirme se a API Key do ClickUp está correta'
          },
          {
            type: 'check_permissions',
            title: 'Verificar permissões',
            description: 'Confirme se a API Key tem acesso ao workspace'
          },
          {
            type: 'check_team_id',
            title: 'Verificar Team ID',
            description: 'Confirme se o Team ID está correto'
          }
        ]
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function linkUser(supabaseClient: any, userData: any, linkData: any) {
  console.log('Linking user to ClickUp:', linkData);
  const corsHeaders = getCorsHeaders(null);
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

async function listAllUsers(apiKey: string, teamId?: string) {
  console.log('listAllUsers function called');
  console.log('API Key present:', !!apiKey, 'teamId:', teamId);
  
  const corsHeaders = getCorsHeaders(null);

  try {
    const headers = {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    } as const;

    // 1) Buscar workspaces e forçar o 36694061 (BNO Ads) por padrão
    const teamsResp = await fetch('https://api.clickup.com/api/v2/team', { headers });
    if (!teamsResp.ok) throw new Error(`Failed to fetch teams: ${teamsResp.status} ${teamsResp.statusText}`);
    const teamsData = await teamsResp.json();
    const allTeams = (teamsData.teams || []).map((t: any) => ({ id: String(t.id), name: t.name }));

    const forcedTeamId = String(teamId || '36694061');
    let selectedTeams = allTeams.filter((t: any) => String(t.id) === forcedTeamId);
    if (selectedTeams.length === 0) {
      // Mesmo que não venha no /team, tentamos assim mesmo
      selectedTeams = [{ id: forcedTeamId, name: 'BNO Ads' }];
    }

    // 2) Agregar membros dos endpoints conhecidos: member, user, guest e fallback /team
    const usersMap = new Map<string, any>();
    const diagnostics: any[] = [];

    for (const team of selectedTeams) {
      const diag: any = { teamId: team.id, teamName: team.name, endpoints: {} };

      // Helper para adicionar usuário evitando duplicata
      const addU = (u: any) => {
        if (!u) return;
        const id = String(u.id || u.user?.id || '');
        const username = u.username || u.user?.username || u.name || '';
        const email = u.email || u.user?.email || '';
        const profilePicture = u.profilePicture || u.user?.profilePicture || '';
        if (!id && !email && !username) return;
        const key = id || `${email}:${username}`;
        if (!usersMap.has(key)) {
          usersMap.set(key, {
            id: id || key,
            username,
            email,
            profilePicture,
            teams: [{ id: team.id, name: team.name }],
            primaryTeam: { id: team.id, name: team.name },
          });
        } else {
          const entry = usersMap.get(key);
          if (!entry.teams.find((t: any) => t.id === team.id)) {
            entry.teams.push({ id: team.id, name: team.name });
          }
        }
      };

      // a) /team/{id}/member
      try {
        const r = await fetch(`https://api.clickup.com/api/v2/team/${team.id}/member`, { headers });
        diag.endpoints.member = { status: r.status, ok: r.ok };
        if (r.ok) {
          const j = await r.json();
          const members = j.members || [];
          diag.endpoints.member.count = members.length;
          members.forEach((m: any) => addU(m.user || m));
        }
      } catch (e: any) {
        diag.endpoints.member = { error: e.message };
      }

      // b) /team/{id}/user (algumas contas expõem por este endpoint)
      try {
        const r = await fetch(`https://api.clickup.com/api/v2/team/${team.id}/user`, { headers });
        diag.endpoints.user = { status: r.status, ok: r.ok };
        if (r.ok) {
          const j = await r.json();
          const users = j.users || j.members || [];
          diag.endpoints.user.count = users.length;
          users.forEach((u: any) => addU(u.user || u));
        }
      } catch (e: any) {
        diag.endpoints.user = { error: e.message };
      }

      // c) /team/{id}/guest (convidados)
      try {
        const r = await fetch(`https://api.clickup.com/api/v2/team/${team.id}/guest`, { headers });
        diag.endpoints.guest = { status: r.status, ok: r.ok };
        if (r.ok) {
          const j = await r.json();
          const guests = j.guests || j.members || [];
          diag.endpoints.guest.count = guests.length;
          guests.forEach((g: any) => addU(g.user || g));
        }
      } catch (e: any) {
        diag.endpoints.guest = { error: e.message };
      }

      // d) Fallback: /team/{id}
      try {
        const r = await fetch(`https://api.clickup.com/api/v2/team/${team.id}`, { headers });
        diag.endpoints.team = { status: r.status, ok: r.ok };
        if (r.ok) {
          const j = await r.json();
          const members = j.members || j.users || [];
          diag.endpoints.team.count = members.length;
          members.forEach((m: any) => addU(m.user || m));
        }
      } catch (e: any) {
        diag.endpoints.team = { error: e.message };
      }

      diagnostics.push(diag);
    }

    const users = Array.from(usersMap.values()).map((u: any) => ({ ...u, teamsCount: u.teams.length }));

    return new Response(JSON.stringify({
      success: true,
      totalUsers: users.length,
      totalTeams: selectedTeams.length,
      users,
      teams: selectedTeams,
      diagnostics,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error in listAllUsers:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      totalUsers: 0
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// Função conforme PRD - endpoints singulares, 404 como lista vazia
async function listUsersPRD(apiKey: string, teamId: string) {
  console.log('listUsersPRD function called for teamId:', teamId);
  
  const corsHeaders = getCorsHeaders(null);

  // Helper para tratar 404 como lista vazia com diagnóstico de URL e preview do corpo
  async function fetchJSON(url: string, token: string) {
    try {
      const r = await fetch(url, { method: 'GET', headers: { Authorization: token } });
      const text = await r.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
      if (r.status === 404) return { ok: true, json: {}, status: 404, url, bodyPreview: text.slice(0, 200) };
      return { ok: r.ok, json, status: r.status, url, bodyPreview: text.slice(0, 200) };
    } catch (e: any) {
      return { ok: false, json: {}, status: 0, url, bodyPreview: String(e?.message || e) };
    }
  }

  try {
    if (!teamId) {
      return new Response(JSON.stringify({
        teamStatus: 400,
        counts: { users: 0, guests: 0 },
        users: [],
        raw: { uStatus: 400, gStatus: 400 },
        error: 'teamId é obrigatório'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = apiKey;
    const base = `https://api.clickup.com/api/v2/team/${teamId}`;

    // Chamar endpoints singulares conforme PRD
    const [u, g] = await Promise.all([
      fetchJSON(`${base}/user`, token),
      fetchJSON(`${base}/guest`, token),
    ]);

    // Normalizar - ClickUp pode usar members, users, guests
    const users = (u.json?.members ?? u.json?.users ?? []).map((m: any) => m.user ?? m);
    const guests = (g.json?.guests ?? g.json?.members ?? []).map((x: any) => x.user ?? x);

    const allUsers = [...users, ...guests].map((p: any) => ({
      id: p.id,
      username: p.username,
      email: p.email,
      profilePicture: p.profilePicture,
    })).filter(u => u.id); // Filtrar entradas inválidas

    return new Response(JSON.stringify({
      teamStatus: u.ok || g.ok ? 200 : Math.max(u.status, g.status),
      counts: { users: users.length, guests: guests.length },
      users: allUsers,
      raw: { uStatus: u.status, gStatus: g.status },
      diag: {
        user: { url: u.url, status: u.status, ok: u.ok, bodyPreview: u.bodyPreview },
        guest: { url: g.url, status: g.status, ok: g.ok, bodyPreview: g.bodyPreview }
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Error in listUsersPRD:', error);
    return new Response(JSON.stringify({
      teamStatus: 500,
      counts: { users: 0, guests: 0 },
      users: [],
      raw: { uStatus: 500, gStatus: 500 },
      error: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}