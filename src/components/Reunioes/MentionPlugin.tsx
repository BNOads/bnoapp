import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, TextNode } from 'lexical';

interface MentionPluginProps {
  onMention: (clientName: string) => void;
}

export function MentionPlugin({ onMention }: MentionPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node: TextNode) => {
      const text = node.getTextContent();
      
      // Detectar padrão @NomeDoCliente
      const mentionRegex = /@(\w+)/g;
      let match;
      
      while ((match = mentionRegex.exec(text)) !== null) {
        const mentionedName = match[1];
        
        // Notificar que um cliente foi mencionado
        onMention(mentionedName);
      }
    });
  }, [editor, onMention]);

  return null;
}
