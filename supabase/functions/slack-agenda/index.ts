import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SlackChannelInfo {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_member: boolean;
}

interface SlackMessage {
  channel: string;
  text: string;
  thread_ts?: string;
  blocks?: any[];
}

interface AgendaData {
  title: string;
  date: string;
  content: string;
  attachments?: string[];
  lovableUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
    if (!SLACK_BOT_TOKEN) {
      throw new Error('Slack bot token not configured');
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // List channels endpoint
    if (action === 'channels' && req.method === 'GET') {
      console.log('Fetching Slack channels...');
      
      // Get public channels
      const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel', {
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      // Get DMs and users
      const usersResponse = await fetch('https://slack.com/api/users.list', {
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      const channelsData = await channelsResponse.json();
      const usersData = await usersResponse.json();

      if (!channelsData.ok) {
        console.error('Slack channels error:', channelsData.error);
        throw new Error(`Slack API error: ${channelsData.error}`);
      }

      if (!usersData.ok) {
        console.error('Slack users error:', usersData.error);
        throw new Error(`Slack API error: ${usersData.error}`);
      }

      // Format channels
      const channels = channelsData.channels?.map((channel: any) => ({
        id: channel.id,
        name: `#${channel.name}`,
        is_channel: true,
        is_member: channel.is_member || false,
      })) || [];

      // Format users (for DMs)
      const users = usersData.members?.filter((user: any) => 
        !user.deleted && !user.is_bot && user.id !== 'USLACKBOT'
      ).map((user: any) => ({
        id: user.id,
        name: `@${user.name}`,
        real_name: user.real_name || user.name,
        is_channel: false,
      })) || [];

      const allOptions = [...channels, ...users];

      return new Response(JSON.stringify({ 
        success: true, 
        channels: allOptions 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send agenda endpoint
    if (action === 'send-agenda' && req.method === 'POST') {
      const { channel, includeAttachments, agenda }: { 
        channel: string; 
        includeAttachments: boolean; 
        agenda: AgendaData 
      } = await req.json();

      console.log('Sending agenda to Slack:', { channel, includeAttachments, agenda: agenda.title });

      // Send main message
      const mainMessage: SlackMessage = {
        channel: channel,
        text: `📌 ${agenda.title} - ${agenda.date}`,
      };

      const mainResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mainMessage),
      });

      const mainData = await mainResponse.json();
      
      if (!mainData.ok) {
        console.error('Main message error:', mainData.error);
        throw new Error(`Failed to send main message: ${mainData.error}`);
      }

      const threadTs = mainData.ts;
      console.log('Main message sent, thread_ts:', threadTs);

      // Send content as reply
      if (agenda.content) {
        // Format content for Slack
        let formattedContent = agenda.content
          // Convert HTML to plain text and add some formatting
          .replace(/<strong>(.*?)<\/strong>/g, '*$1*')
          .replace(/<em>(.*?)<\/em>/g, '_$1_')
          .replace(/<ul>/g, '')
          .replace(/<\/ul>/g, '')
          .replace(/<li>/g, '• ')
          .replace(/<\/li>/g, '\n')
          .replace(/<p>/g, '')
          .replace(/<\/p>/g, '\n')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '<$1|$2>')
          .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
          .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
          .trim();

        const contentMessage: SlackMessage = {
          channel: channel,
          text: `📝 *Conteúdo da Pauta:*\n\n${formattedContent}`,
          thread_ts: threadTs,
        };

        const contentResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contentMessage),
        });

        const contentData = await contentResponse.json();
        if (!contentData.ok) {
          console.error('Content message error:', contentData.error);
        }
      }

      // Send attachments if requested
      if (includeAttachments && agenda.attachments && agenda.attachments.length > 0) {
        const attachmentText = agenda.attachments.map(url => `📎 ${url}`).join('\n');
        
        const attachmentMessage: SlackMessage = {
          channel: channel,
          text: `📎 *Anexos:*\n${attachmentText}`,
          thread_ts: threadTs,
        };

        const attachmentResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attachmentMessage),
        });

        const attachmentData = await attachmentResponse.json();
        if (!attachmentData.ok) {
          console.error('Attachment message error:', attachmentData.error);
        }
      }

      // Send Lovable link
      const linkMessage: SlackMessage = {
        channel: channel,
        text: `🔗 <${agenda.lovableUrl}|Abrir no Lovable>`,
        thread_ts: threadTs,
      };

      const linkResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkMessage),
      });

      const linkData = await linkResponse.json();
      if (!linkData.ok) {
        console.error('Link message error:', linkData.error);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Pauta enviada para o Slack com sucesso!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Slack function error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})