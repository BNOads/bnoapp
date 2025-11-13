import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $createTextNode, TextNode } from 'lexical';

interface ManualIndexPluginProps {
  onIndexMark?: (text: string) => void;
}

export function ManualIndexPlugin({ onIndexMark }: ManualIndexPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleDoubleClick = (event: MouseEvent) => {
      editor.update(() => {
        const selection = $getSelection();
        
        if ($isRangeSelection(selection)) {
          const selectedText = selection.getTextContent().trim();
          
          if (selectedText) {
            // Pegar o texto completo da palavra se apenas parte foi selecionada
            const anchor = selection.anchor;
            const node = anchor.getNode();
            
            if (node instanceof TextNode) {
              const textContent = node.getTextContent();
              const offset = anchor.offset;
              
              // Encontrar início e fim da palavra
              let start = offset;
              let end = offset;
              
              // Voltar para encontrar o início da palavra
              while (start > 0 && /\w/.test(textContent[start - 1])) {
                start--;
              }
              
              // Avançar para encontrar o fim da palavra
              while (end < textContent.length && /\w/.test(textContent[end])) {
                end++;
              }
              
              const word = textContent.substring(start, end);
              
              if (word) {
                // Verificar se já é um marcador (começa com 📌)
                const isMarked = textContent.substring(Math.max(0, start - 2), start) === '📌';
                
                if (isMarked) {
                  // Remover marcador
                  const beforeMarker = textContent.substring(0, Math.max(0, start - 2));
                  const afterWord = textContent.substring(end);
                  const newText = beforeMarker + word + afterWord;
                  
                  node.setTextContent(newText);
                  console.log('🗑️ Marcador removido:', word);
                } else {
                  // Adicionar marcador
                  const beforeWord = textContent.substring(0, start);
                  const afterWord = textContent.substring(end);
                  const newText = beforeWord + '📌' + word + afterWord;
                  
                  node.setTextContent(newText);
                  onIndexMark?.(word);
                  console.log('📌 Palavra marcada:', word);
                }
              }
            }
          }
        }
      });
    };

    const contentEditable = editor.getRootElement();
    if (contentEditable) {
      contentEditable.addEventListener('dblclick', handleDoubleClick);
      
      return () => {
        contentEditable.removeEventListener('dblclick', handleDoubleClick);
      };
    }
  }, [editor, onIndexMark]);

  return null;
}
