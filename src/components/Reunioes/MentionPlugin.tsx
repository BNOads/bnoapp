import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TextNode } from 'lexical';

interface MentionPluginProps {
  onMention: (clientName: string) => void;
}

export function MentionPlugin({ onMention }: MentionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const processedMentionsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node: TextNode) => {
      const text = node.getTextContent();
      
      // Detectar menções completas: @NomeDoCliente seguido de espaço, quebra de linha ou fim de texto
      // Mínimo de 2 caracteres após o @
      const mentionRegex = /@(\w{2,})(?:\s|$)/g;
      let match;
      const foundMentions = new Set<string>();
      
      while ((match = mentionRegex.exec(text)) !== null) {
        const mentionedName = match[1];
        foundMentions.add(mentionedName);
      }
      
      // Debounce para evitar múltiplas chamadas durante digitação rápida
      if (foundMentions.size > 0) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          foundMentions.forEach(mention => {
            // Apenas notificar se ainda não foi processado
            if (!processedMentionsRef.current.has(mention)) {
              processedMentionsRef.current.add(mention);
              onMention(mention);
            }
          });
        }, 500);
      }
    });
  }, [editor, onMention]);

  return null;
}
