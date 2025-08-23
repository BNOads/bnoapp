import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

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
    console.log('Job de sincronização automática iniciado');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Buscar clientes que têm drive_folder_id configurado OU pasta_drive_url configurada
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('id, nome, drive_folder_id, pasta_drive_url, auto_permission')
      .or('drive_folder_id.not.is.null,pasta_drive_url.not.is.null')
      .eq('ativo', true);
    
    if (error) {
      throw error;
    }
    
    console.log(`Encontrados ${clientes?.length || 0} clientes para sincronizar`);
    
    const results = [];
    
    for (const cliente of clientes || []) {
      try {
        console.log(`Sincronizando cliente: ${cliente.nome} (${cliente.id})`);
        
        // Verificar se tem URL válida do Drive
        if (!cliente.pasta_drive_url || !cliente.pasta_drive_url.includes('drive.google.com')) {
          console.log(`Cliente ${cliente.nome} não tem URL válida do Drive, pulando...`);
          continue;
        }
        
        // Chamar a função de sync para este cliente
        const syncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/drive-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            clientId: cliente.id,
            driveFolderUrl: cliente.pasta_drive_url,
            autoPermission: cliente.auto_permission,
            isSync: true
          })
        });
        
        const syncResult = await syncResponse.json();
        
        results.push({
          clientId: cliente.id,
          clientName: cliente.nome,
          success: syncResponse.ok,
          result: syncResult
        });
        
        console.log(`Cliente ${cliente.nome} sincronizado:`, syncResult);
        
      } catch (clientError: any) {
        console.error(`Erro ao sincronizar cliente ${cliente.nome}:`, clientError);
        
        results.push({
          clientId: cliente.id,
          clientName: cliente.nome,
          success: false,
          error: clientError.message
        });
        
        // Atualizar erro no cliente
        await supabase
          .from('clientes')
          .update({ drive_sync_error: clientError.message })
          .eq('id', cliente.id);
      }
    }
    
    const totalSuccess = results.filter(r => r.success).length;
    const totalError = results.filter(r => !r.success).length;
    
    const finalResult = {
      timestamp: new Date().toISOString(),
      totalClients: results.length,
      successful: totalSuccess,
      errors: totalError,
      results
    };
    
    console.log('Job de sincronização concluído:', finalResult);
    
    return new Response(
      JSON.stringify(finalResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error: any) {
    console.error('Erro no job de sincronização:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})