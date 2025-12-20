import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Aliases para identificação automática de métricas
const METRIC_ALIASES: Record<string, string[]> = {
  'leads': ['leads', 'leads gerados', 'leads totais', 'contacts', 'contatos', 'lead', 'qtd leads'],
  'cpl': ['cpl', 'custo por lead', 'cost per lead', 'custo/lead'],
  'ctr': ['ctr', 'taxa de cliques', 'click rate', 'taxa clique'],
  'cpm': ['cpm', 'custo por mil', 'cost per mille', 'impressions cost', 'custo impressões'],
  'investimento': ['investimento', 'spend', 'budget', 'gasto', 'investido', 'verba'],
  'faturamento': ['faturamento', 'revenue', 'sales', 'income', 'receita', 'vendas'],
  'roi': ['roi', 'return', 'retorno', 'roas'],
  'conversoes': ['conversões', 'conversoes', 'conversions', 'vendas'],
  'ticket_medio': ['ticket médio', 'ticket medio', 'average ticket', 'ticket'],
  'impressoes': ['impressões', 'impressoes', 'impressions', 'alcance', 'reach'],
  'cliques': ['cliques', 'clicks'],
  'cpc': ['cpc', 'custo por clique', 'cost per click'],
  'frequencia': ['frequência', 'frequencia', 'frequency']
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function identifyMetric(header: string): { metric: string; recognized: boolean } {
  const normalized = normalizeHeader(header);
  
  for (const [metric, aliases] of Object.entries(METRIC_ALIASES)) {
    if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
      return { metric, recognized: true };
    }
  }
  
  return { metric: header, recognized: false };
}

function formatValue(value: any, metric: string): string {
  if (!value || value === '') return '-';
  
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^\d.,-]/g, '').replace(',', '.'))
    : value;
  
  if (isNaN(numValue)) return value;
  
  // Formatar baseado no tipo de métrica
  if (['cpl', 'cpm', 'cpc', 'investimento', 'faturamento', 'ticket_medio'].includes(metric)) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  }
  
  if (['ctr', 'frequencia'].includes(metric)) {
    return `${numValue.toFixed(2)}%`;
  }
  
  if (['roi'].includes(metric)) {
    return `${numValue.toFixed(2)}x`;
  }
  
  return new Intl.NumberFormat('pt-BR').format(numValue);
}

function calculateTrend(current: any, previous: any): { direction: 'up' | 'down' | 'stable'; percentage: number } {
  const curr = parseFloat(String(current).replace(/[^\d.,-]/g, '').replace(',', '.'));
  const prev = parseFloat(String(previous).replace(/[^\d.,-]/g, '').replace(',', '.'));
  
  if (isNaN(curr) || isNaN(prev) || prev === 0) {
    return { direction: 'stable', percentage: 0 };
  }
  
  const change = ((curr - prev) / prev) * 100;
  
  if (Math.abs(change) < 5) return { direction: 'stable', percentage: change };
  return { direction: change > 0 ? 'up' : 'down', percentage: change };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Store body and clienteId at the start for error handling
  let bodyData: any = {};
  let clienteId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    bodyData = await req.json();
    clienteId = bodyData.cliente_id;

    if (!clienteId) {
      throw new Error('cliente_id é obrigatório');
    }

    // Buscar configuração do cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('google_sheet_id, google_sheet_aba, nome')
      .eq('id', clienteId)
      .single();

    if (clienteError) throw clienteError;

    if (!cliente.google_sheet_id) {
      throw new Error('Cliente não possui planilha configurada');
    }

    // Marcar como em andamento
    await supabase
      .from('clientes')
      .update({ 
        google_sheet_sync_status: 'em_andamento',
        google_sheet_erro: null 
      })
      .eq('id', clienteId);

    // Buscar credenciais do Google (tenta Service Account primeiro; se falhar, usa API Key)
    console.log('Buscando credenciais do Google...');
    const rawSheetsSecret = Deno.env.get('GOOGLE_SHEETS_CREDENTIALS') || '';
    const driveApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY') || '';
    
    let authHeader = '';
    let apiKeyForSheets = '';
    
    if (rawSheetsSecret) {
      try {
        const credentials = JSON.parse(rawSheetsSecret);
        console.log('GOOGLE_SHEETS_CREDENTIALS é JSON (Service Account)');
        const jwt = await createJWT(credentials);
        authHeader = `Bearer ${jwt}`;
      } catch {
        // Não é JSON → tratar como API Key direta
        console.log('GOOGLE_SHEETS_CREDENTIALS não é JSON; usando como API Key');
        apiKeyForSheets = rawSheetsSecret.trim();
      }
    }

    if (!authHeader) {
      apiKeyForSheets = apiKeyForSheets || driveApiKey;
      if (apiKeyForSheets) {
        console.log('Usando API Key para Google Sheets');
      } else {
        throw new Error('Nenhuma credencial do Google configurada. Configure GOOGLE_SHEETS_CREDENTIALS (JSON) ou uma API Key (GOOGLE_SHEETS_CREDENTIALS/GOOGLE_DRIVE_API_KEY)');
      }
    }

    // Ler dados da planilha - ENCODE THE RANGE to handle spaces and special characters
    const sheetRange = `${cliente.google_sheet_aba || 'Dashboard'}!A1:Z1000`;
    let sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cliente.google_sheet_id}/values/${encodeURIComponent(sheetRange)}`;
    
    // Se usar API Key, adiciona na URL
    if (!authHeader && apiKeyForSheets) {
      sheetsUrl += `?key=${apiKeyForSheets}`;
    }

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      reqHeaders['Authorization'] = authHeader;
    }

    console.log('Fazendo requisição para Google Sheets...');
    const response = await fetch(sheetsUrl, { headers: reqHeaders });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao acessar Google Sheets: ${response.status} - ${errorText}`);
    }

    const sheetData = await response.json();
    const rows = sheetData.values || [];

    if (rows.length < 2) {
      throw new Error('Planilha não contém dados suficientes');
    }

    // Processar headers
    const headers = rows[0];
    const lastRow = rows[rows.length - 1];
    const previousRow = rows.length > 2 ? rows[rows.length - 2] : null;

    const metrics: any[] = [];
    const unrecognizedMetrics: string[] = [];

    headers.forEach((header: string, index: number) => {
      const { metric, recognized } = identifyMetric(header);
      const value = lastRow[index];
      
      const metricData: any = {
        original_name: header,
        metric_key: metric,
        recognized,
        value: value || null,
        formatted_value: formatValue(value, metric)
      };

      if (previousRow && previousRow[index]) {
        metricData.trend = calculateTrend(value, previousRow[index]);
      }

      metrics.push(metricData);

      if (!recognized) {
        unrecognizedMetrics.push(header);
      }
    });

    // Registrar log
    await supabase
      .from('google_sheets_logs')
      .insert({
        cliente_id: clienteId,
        sheet_id: cliente.google_sheet_id,
        aba: cliente.google_sheet_aba || 'Dashboard',
        colunas_lidas: headers.length,
        linhas_lidas: rows.length,
        metricas_identificadas: metrics,
        status: 'sucesso'
      });

    // Atualizar status do cliente
    await supabase
      .from('clientes')
      .update({
        google_sheet_sync_status: 'sucesso',
        google_sheet_ultima_sync: new Date().toISOString(),
        google_sheet_erro: null
      })
      .eq('id', clienteId);

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        unrecognized_metrics: unrecognizedMetrics,
        total_rows: rows.length,
        cliente_nome: cliente.nome
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    
    // Update error status using stored clienteId (don't re-read body)
    if (clienteId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        await supabase
          .from('clientes')
          .update({
            google_sheet_sync_status: 'erro',
            google_sheet_erro: errorMessage
          })
          .eq('id', clienteId);
      } catch (updateError) {
        console.error('Erro ao atualizar status:', updateError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    // Always return 200 with success: false to avoid generic Supabase errors
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKey = credentials.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length - 1
  );

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${unsignedToken}.${encodedSignature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
