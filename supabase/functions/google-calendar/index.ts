import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendarId, timeMin, timeMax } = await req.json();
    
    const API_KEY = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    
    if (!API_KEY) {
      throw new Error('Google Calendar API key not configured');
    }
    
    const params = new URLSearchParams({
      key: API_KEY,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50'
    });
    
    const CALENDAR_URL = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    
    console.log('Fetching calendar events from:', CALENDAR_URL);
    console.log('Params:', params.toString());
    
    const response = await fetch(`${CALENDAR_URL}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Calendar API error:', response.status, errorText);
      throw new Error(`Google Calendar API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched', data.items?.length || 0, 'events');
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      },
    );
    
  } catch (error) {
    console.error('Error in google-calendar function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        items: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      },
    );
  }
})