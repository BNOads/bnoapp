import { supabase } from '@/integrations/supabase/client';

/**
 * Limpa blocos que foram migrados incorretamente com HTML no text node
 * e re-migra com texto plano
 */
export async function cleanAndRemigrateLexicalBlocks() {
  try {
    console.log('[Limpeza] Buscando blocos com conteudo_lexical...');
    
    // Buscar todos os blocos que têm conteudo_lexical
    const { data: blocks, error } = await supabase
      .from('reunioes_blocos')
      .select('id, conteudo, conteudo_lexical')
      .not('conteudo_lexical', 'is', null);

    if (error) throw error;

    console.log(`[Limpeza] Encontrados ${blocks?.length || 0} blocos com Lexical`);

    if (!blocks || blocks.length === 0) return { success: true, cleaned: 0 };

    let cleanedCount = 0;

    // Verificar quais têm HTML no text node
    const toClean = blocks.filter(b => {
      try {
        const lexical = b.conteudo_lexical as any;
        if (!lexical?.root?.children) return false;
        
        // Verificar se algum text node contém tags HTML
        const hasHTML = lexical.root.children.some((child: any) => {
          if (child.type === 'paragraph' && Array.isArray(child.children)) {
            return child.children.some((textNode: any) => {
              const text = textNode.text || '';
              return text.includes('<') && text.includes('>');
            });
          }
          return false;
        });
        
        return hasHTML;
      } catch {
        return false;
      }
    });

    console.log(`[Limpeza] ${toClean.length} blocos precisam ser limpos`);

    // Limpar e re-migrar cada bloco
    for (const block of toClean) {
      try {
        // Extrair texto do conteúdo original
        const conteudo = block.conteudo as any;
        let htmlText = '';
        
        if (typeof conteudo === 'string') {
          htmlText = conteudo;
        } else if (conteudo?.texto) {
          htmlText = conteudo.texto;
        }
        
        // Remover HTML e criar texto limpo
        const plainText = htmlText
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        
        // Criar novo estado Lexical limpo
        const cleanLexical = {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: plainText, version: 1 }],
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        };
        
        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('reunioes_blocos')
          .update({ conteudo_lexical: cleanLexical as any })
          .eq('id', block.id);
        
        if (updateError) {
          console.error(`[Limpeza] Erro ao limpar bloco ${block.id}:`, updateError);
        } else {
          cleanedCount++;
          console.log(`[Limpeza] Bloco ${block.id} limpo com sucesso`);
        }
      } catch (err) {
        console.error(`[Limpeza] Erro ao processar bloco ${block.id}:`, err);
      }
    }

    console.log(`[Limpeza] Concluído: ${cleanedCount} blocos limpos`);
    return { success: true, cleaned: cleanedCount, total: toClean.length };
  } catch (error) {
    console.error('[Limpeza] Erro geral:', error);
    return { success: false, error };
  }
}
