import { supabase } from "@/integrations/supabase/client";

/**
 * Script para tornar todos os lançamentos públicos
 * Executa uma vez para atualizar link_publico_ativo = true em todos os registros
 */
export async function tornarTodosLancamentosPublicos() {
  try {
    console.log('🚀 Iniciando atualização de lançamentos para público...');
    
    const { data, error } = await supabase
      .from('lancamentos')
      .update({ 
        link_publico_ativo: true 
      })
      .neq('link_publico_ativo', true) // Apenas os que ainda não estão públicos
      .select('id, nome_lancamento');
    
    if (error) {
      console.error('❌ Erro ao tornar lançamentos públicos:', error);
      throw error;
    }
    
    console.log(`✅ ${data?.length || 0} lançamentos tornados públicos com sucesso!`);
    return data;
  } catch (error) {
    console.error('Erro crítico:', error);
    throw error;
  }
}
