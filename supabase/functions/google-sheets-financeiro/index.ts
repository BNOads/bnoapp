import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetConfig {
  spreadsheet_id: string;
  aba_resumo_ano_1: string;
  aba_resumo_ano_2: string;
  aba_clientes_ativos: string;
  aba_movimentos: string;
}

// Alias resolver - normaliza nomes de colunas
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\W+/g, "_")
    .replace(/^_+|_+$/g, "");
};

// Mapeamento de aliases para campos internos
const ALIAS_MAP: Record<string, string[]> = {
  // Resumo Ano 1
  mes: ["mes", "mês", "month"],
  saida_qtd: ["saida_qtd", "saídas", "saidas", "count_out"],
  entrada_qtd: ["entrada_qtd", "entradas", "count_in"],
  saldo_qtd: ["saldo_qtd", "balance_count", "saldo"],
  rs_saida: ["rs_saida", "saida_valor", "out_value", "r_saida"],
  rs_entrada: ["rs_entrada", "entrada_valor", "in_value", "r_entrada"],
  balanco: ["balanco", "balance_value", "resultado", "σ_balanco"],
  
  // Resumo Ano 2
  mes_ref: ["mes_ref", "mês_ref", "month_ref", "mes_referencia"],
  faturamento: ["faturamento", "revenue"],
  despesas: ["despesas", "expenses"],
  total_saidas: ["total_saidas", "total_out"],
  lucro: ["lucro", "profit"],
  margem: ["margem", "profit_margin", "margem_de_lucro"],
  pag_parceiros: ["pag_parceiros", "partners_payout", "pagamento_parceiros"],
  ticket_medio: ["ticket_medio", "arpu", "avg_ticket"],
  custo_conta: ["custo_conta", "cost_per_account", "custo_por_conta"],
  churn: ["churn", "churn_rate"],
  roi: ["roi", "return_on_investment"],
  clientes_ativos: ["clientes_ativos", "active_customers"],
  colaboradores: ["colaboradores", "staff_headcount"],
  fechamento: ["fechamento", "close_flag"],
  
  // Clientes Ativos
  cliente: ["cliente", "account", "nome"],
  mrr: ["mrr", "monthly_recurring_revenue"],
  tempo_ativo: ["tempo_ativo", "months_active"],
  ltv: ["ltv", "lifetime_value"],
  
  // Movimentos
  data_prevista: ["data_prevista", "due_date", "data"],
  movimento: ["movimento", "type_inout"],
  tipo: ["tipo", "kind"],
  classificacao: ["classificacao", "category"],
  descricao: ["descricao", "description"],
  valor: ["valor", "amount"],
  status: ["status"],
  observacoes: ["observacoes", "notes"],
};

// Resolve alias para campo interno
const resolveAlias = (header: string): string | null => {
  const normalized = normalizeHeader(header);
  
  for (const [field, aliases] of Object.entries(ALIAS_MAP)) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }
  
  return null;
};

// Normaliza valor de moeda brasileira
const parseMoneyBR = (value: string): number | null => {
  if (!value) return null;
  
  const cleaned = value
    .toString()
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

// Normaliza data
const parseDate = (value: string): string | null => {
  if (!value) return null;
  
  // dd/mm/yyyy
  const brFormat = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brFormat) {
    const [_, day, month, year] = brFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // yyyy-mm-dd
  const isoFormat = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoFormat) {
    const [_, year, month, day] = isoFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
};

// Cache simples em memória (5 minutos)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const getCached = (key: string): any | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'read';
    const sheet = url.searchParams.get('sheet');
    const refresh = url.searchParams.get('refresh') === 'true';

    // Buscar configuração
    const { data: configData } = await supabase
      .from('financeiro_config')
      .select('*')
      .single();

    if (!configData) {
      throw new Error('Configuração do Google Sheets não encontrada');
    }

    const config: SheetConfig = {
      spreadsheet_id: configData.spreadsheet_id,
      aba_resumo_ano_1: configData.aba_resumo_ano_1 || 'Resumo_ano_1',
      aba_resumo_ano_2: configData.aba_resumo_ano_2 || 'Resumo_ano_2',
      aba_clientes_ativos: configData.aba_clientes_ativos || 'Clientes_ativos',
      aba_movimentos: configData.aba_movimentos || 'Movimentos',
    };

    // Verificar cache (exceto se refresh=true)
    if (!refresh && sheet) {
      const cacheKey = `${config.spreadsheet_id}:${sheet}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Obter credenciais do Google
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SHEETS_CREDENTIALS') || '{}');
    
    // Autenticar com Google Sheets API
    const authResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(credentials),
      }),
    });

    if (!authResponse.ok) {
      throw new Error('Falha na autenticação com Google');
    }

    const { access_token } = await authResponse.json();

    // Determinar qual aba ler
    let sheetName = '';
    switch (sheet) {
      case 'resumo-ano-1':
        sheetName = config.aba_resumo_ano_1;
        break;
      case 'resumo-ano-2':
        sheetName = config.aba_resumo_ano_2;
        break;
      case 'clientes-ativos':
        sheetName = config.aba_clientes_ativos;
        break;
      case 'movimentos':
        sheetName = config.aba_movimentos;
        break;
      default:
        throw new Error('Sheet inválido');
    }

    // Ler dados do Google Sheets
    const range = `${sheetName}!A:Z`;
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}/values/${encodeURIComponent(range)}`;
    
    const sheetsResponse = await fetch(sheetsUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!sheetsResponse.ok) {
      throw new Error(`Erro ao ler planilha: ${sheetsResponse.statusText}`);
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];

    if (rows.length === 0) {
      throw new Error('Planilha vazia');
    }

    // Processar headers e dados
    const headers = rows[0];
    const headerMap = new Map<number, string>();
    const unmappedHeaders: string[] = [];

    headers.forEach((header: string, index: number) => {
      const field = resolveAlias(header);
      if (field) {
        headerMap.set(index, field);
      } else {
        unmappedHeaders.push(header);
      }
    });

    // Log de headers não mapeados
    if (unmappedHeaders.length > 0) {
      console.log('Headers não mapeados:', unmappedHeaders);
      await supabase.from('finance_aliases_unmapped').insert(
        unmappedHeaders.map(h => ({
          header_original: h,
          sheet_name: sheetName,
        }))
      );
    }

    // Processar linhas de dados
    const data = rows.slice(1).map((row: any[]) => {
      const obj: Record<string, any> = {};
      
      headerMap.forEach((field, index) => {
        const value = row[index];
        
        // Normalizar valores baseado no tipo de campo
        if (field.includes('data') || field === 'mes_ref') {
          obj[field] = parseDate(value);
        } else if (
          field.includes('valor') || 
          field.includes('rs_') || 
          field.includes('faturamento') ||
          field.includes('despesas') ||
          field.includes('lucro') ||
          field.includes('mrr') ||
          field.includes('ltv') ||
          field.includes('ticket') ||
          field.includes('custo')
        ) {
          obj[field] = parseMoneyBR(value);
        } else if (
          field.includes('_qtd') ||
          field === 'clientes_ativos' ||
          field === 'colaboradores' ||
          field === 'tempo_ativo'
        ) {
          obj[field] = parseInt(value) || 0;
        } else if (field === 'margem' || field === 'churn' || field === 'roi') {
          const num = parseMoneyBR(value);
          obj[field] = num ? num / 100 : null; // Converter percentual
        } else {
          obj[field] = value;
        }
      });
      
      return obj;
    });

    // Calcular campos derivados se necessário
    if (sheet === 'resumo-ano-1') {
      data.forEach((row: any) => {
        if (!row.saldo_qtd && row.entrada_qtd !== undefined && row.saida_qtd !== undefined) {
          row.saldo_qtd = row.entrada_qtd - row.saida_qtd;
        }
        if (!row.balanco && row.rs_entrada !== undefined && row.rs_saida !== undefined) {
          row.balanco = row.rs_entrada - row.rs_saida;
        }
      });
    }

    if (sheet === 'resumo-ano-2') {
      data.forEach((row: any) => {
        if (!row.lucro && row.faturamento !== undefined && row.despesas !== undefined) {
          row.lucro = row.faturamento - (row.despesas || 0) - (row.pag_parceiros || 0);
        }
        if (!row.margem && row.faturamento && row.lucro !== undefined) {
          row.margem = row.faturamento > 0 ? (row.lucro / row.faturamento) : 0;
        }
        if (!row.ticket_medio && row.faturamento && row.clientes_ativos) {
          row.ticket_medio = row.faturamento / row.clientes_ativos;
        }
        if (!row.custo_conta && row.despesas && row.clientes_ativos) {
          row.custo_conta = row.despesas / row.clientes_ativos;
        }
      });
    }

    if (sheet === 'clientes-ativos') {
      data.forEach((row: any) => {
        if (!row.ltv && row.mrr && row.tempo_ativo) {
          row.ltv = row.mrr * row.tempo_ativo;
        }
      });
    }

    const result = {
      data,
      sheet: sheetName,
      timestamp: new Date().toISOString(),
      unmapped_headers: unmappedHeaders,
    };

    // Salvar no cache
    const cacheKey = `${config.spreadsheet_id}:${sheet}`;
    setCache(cacheKey, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper para criar JWT para autenticação com Google
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

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Importar chave privada
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(atob(credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''))),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Assinar
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${signatureInput}.${encodedSignature}`;
}

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
