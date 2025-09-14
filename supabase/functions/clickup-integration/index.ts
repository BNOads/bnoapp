import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: user } = await supabaseClient.auth.getUser(token);

    if (!user.user) {
      throw new Error('Unauthorized');
    }

    const clickupApiKey = Deno.env.get('CLICKUP_API_KEY');
    if (!clickupApiKey) {
      throw new Error('ClickUp API key not configured');
    }

    const url = new URL(req.url);
    // Suporta ação via body (POST) ou querystring
    let body: any = null;
    if (req.method !== 'GET') {
      try { body = await req.json(); } catch { /* body pode estar vazio */ }
    }
    const action = (body?.action || url.searchParams.get('action') || 'getTasks') as string;
    const teamId = (body?.teamId || url.searchParams.get('teamId') || '90140307863') as string;

    console.log(`ClickUp Integration - Action: ${action}, User: ${user.user.email}`);

    // Buscar dados do colaborador para vincular com ClickUp
    const { data: colaborador } = await supabaseClient
      .from('colaboradores')
      .select('email')
      .eq('user_id', user.user.id)
      .single();

    const userEmail = colaborador?.email || user.user.email;

    switch (action) {
      case 'getTasks':
        return await getTasks(clickupApiKey, teamId, userEmail, body?.preferredEmail);
      
      case 'updateTask':
        return await updateTask(clickupApiKey, body);
      
      case 'addComment':
        return await addComment(clickupApiKey, body);
      
      case 'getTeams':
        return await getTeams(clickupApiKey);
      
      case 'debugGetTasks':
        return await debugGetTasks(clickupApiKey, teamId, userEmail);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('ClickUp Integration Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getTasks(apiKey: string, teamId: string, userEmail: string, preferredEmail?: string) {
  console.log(`Getting tasks for user ${userEmail} (preferred: ${preferredEmail || 'none'})`);
  
  try {
    // Primeiro, buscar o usuário no ClickUp usando diferentes métodos
    let userId = null;
    
    // Método 1: Buscar por email nos membros do team
    try {
      const teamResponse = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/member`, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        const member = teamData.members?.find((m: any) => 
          m.user?.email?.toLowerCase() === userEmail.toLowerCase() ||
          m.user?.username?.toLowerCase() === userEmail.toLowerCase() ||
          m.user?.username?.toLowerCase() === userEmail.split('@')[0].toLowerCase()
        );
        
        if (member) {
          userId = member.user.id;
          console.log(`Found user by team membership: ${userId}`);
        }
      }
    } catch (error) {
      console.log('Team member lookup failed:', error);
    }
    
    // Método 2: Se não encontrou pelo team, buscar por workspace
    if (!userId) {
      try {
        const workspaceResponse = await fetch(`https://api.clickup.com/api/v2/team`, {
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
        });
        
        if (workspaceResponse.ok) {
          const workspaceData = await workspaceResponse.json();
          console.log(`Available teams: ${workspaceData.teams?.map((t: any) => t.id).join(', ')}`);
        }
      } catch (error) {
        console.log('Workspace lookup failed:', error);
      }
    }
    
    // Buscar tarefas usando diferentes estratégias
    let allTasks: ClickUpTask[] = [];
    
    // Estratégia 1: Buscar por spaces no team
    try {
      const spacesResponse = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (spacesResponse.ok) {
        const spacesData = await spacesResponse.json();
        console.log(`Found ${spacesData.spaces?.length || 0} spaces`);
        
        // Para cada space, buscar folders/lists
        for (const space of spacesData.spaces || []) {
          try {
            const listsResponse = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
              headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
              },
            });
            
            if (listsResponse.ok) {
              const listsData = await listsResponse.json();
              
              // Para cada list, buscar tasks
              for (const list of listsData.lists || []) {
                try {
                  const tasksResponse = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task`, {
                    headers: {
                      'Authorization': apiKey,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (tasksResponse.ok) {
                    const tasksData = await tasksResponse.json();
                    const listTasks = tasksData.tasks || [];
                    allTasks.push(...listTasks);
                  }
                } catch (error) {
                  console.log(`Error fetching tasks for list ${list.id}:`, error);
                }
              }
            }
          } catch (error) {
            console.log(`Error fetching lists for space ${space.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.log('Spaces lookup failed:', error);
    }
    
    // Filtrar tarefas do usuário usando múltiplos critérios
    const userTasks = allTasks.filter((task: ClickUpTask) => {
      if (!task.assignees || task.assignees.length === 0) return false;
      
      return task.assignees.some(assignee => {
        const assigneeEmail = assignee.email?.toLowerCase() || '';
        const assigneeUsername = assignee.username?.toLowerCase() || '';
        const userEmailLower = userEmail.toLowerCase();
        const userAlias = userEmail.split('@')[0].toLowerCase();
        const preferredLower = (preferredEmail || '').toLowerCase();
        const preferredAlias = preferredLower ? preferredLower.split('@')[0] : '';
        
        return assigneeEmail === userEmailLower ||
               assigneeUsername === userEmailLower ||
               assigneeUsername === userAlias ||
               assigneeEmail.includes(userAlias) ||
               assigneeUsername.includes(userAlias) ||
               (preferredLower && (assigneeEmail === preferredLower || assigneeUsername === preferredLower)) ||
               (preferredAlias && (assigneeUsername === preferredAlias || assigneeEmail.includes(preferredAlias) || assigneeUsername.includes(preferredAlias)));
      });
    });

    console.log(`Found ${allTasks.length} total tasks, ${userTasks.length} for user ${userEmail}`);

    return new Response(
      JSON.stringify({ 
        tasks: userTasks,
        total: userTasks.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    const message = error?.message || String(error);
    return new Response(
      JSON.stringify({ tasks: [], total: 0, diagnostics: { message } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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