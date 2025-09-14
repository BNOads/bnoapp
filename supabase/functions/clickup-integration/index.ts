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
    const action = url.searchParams.get('action') || 'getTasks';
    const teamId = url.searchParams.get('teamId') || '90140307863'; // ID padrão do team

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
        return await getTasks(clickupApiKey, teamId, userEmail);
      
      case 'updateTask':
        const updateData = await req.json();
        return await updateTask(clickupApiKey, updateData);
      
      case 'addComment':
        const commentData = await req.json();
        return await addComment(clickupApiKey, commentData);
      
      case 'getTeams':
        return await getTeams(clickupApiKey);
      
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

async function getTasks(apiKey: string, teamId: string, userEmail: string) {
  console.log(`Getting tasks for team ${teamId}, user ${userEmail}`);
  
  try {
    // Buscar tarefas do team/workspace
    const response = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/task`, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filtrar tarefas apenas do usuário atual
    const userTasks = data.tasks?.filter((task: ClickUpTask) => 
      task.assignees?.some(assignee => 
        assignee.email?.toLowerCase() === userEmail.toLowerCase()
      )
    ) || [];

    console.log(`Found ${userTasks.length} tasks for user ${userEmail}`);

    return new Response(
      JSON.stringify({ 
        tasks: userTasks,
        total: userTasks.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
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