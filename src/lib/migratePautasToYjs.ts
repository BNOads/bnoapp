import * as Y from 'yjs';
import { supabase } from '@/integrations/supabase/client';

export async function migratePautaToYjs(pautaId: string) {
  try {
    // Verificar se já existe colaboração
    const { data: existing } = await supabase
      .from('pauta_colaboracao')
      .select('id')
      .eq('pauta_id', pautaId)
      .maybeSingle();

    if (existing) {
      console.log('Pauta já migrada para Yjs');
      return true;
    }

    // Buscar pauta existente com blocos
    const { data: blocos, error: blocosError } = await supabase
      .from('reunioes_blocos')
      .select('*')
      .eq('documento_id', pautaId)
      .order('ordem', { ascending: true });

    if (blocosError) throw blocosError;

    // Criar documento Yjs com conteúdo existente
    const ydoc = new Y.Doc();
    
    if (blocos && Array.isArray(blocos)) {
      blocos.forEach((block: any) => {
        const ytext = ydoc.getText(`block-${block.id}`);
        const content = block.conteudo || '';
        
        // Se o conteúdo for um objeto JSON, tentar extrair o texto
        if (typeof content === 'object' && content !== null) {
          try {
            const textContent = JSON.stringify(content);
            ytext.insert(0, textContent);
          } catch {
            ytext.insert(0, '');
          }
        } else {
          ytext.insert(0, String(content));
        }
      });
    }

    // Salvar estado inicial no Supabase
    const state = Y.encodeStateAsUpdate(ydoc);
    const jsonState = ydoc.toJSON();

    // Converter para base64
    const base64String = btoa(String.fromCharCode(...state));

    const { error } = await supabase
      .from('pauta_colaboracao')
      .insert({
        pauta_id: pautaId,
        conteudo_yjs: base64String,
        conteudo_json: jsonState,
        versao: 1
      });

    if (error) throw error;

    console.log(`✅ Pauta ${pautaId} migrada para Yjs`);
    return true;
  } catch (error) {
    console.error('Erro ao migrar pauta:', error);
    return false;
  }
}
