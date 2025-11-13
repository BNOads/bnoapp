import { useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';

interface MentionPluginProps {
  onMention: (clientName: string) => void;
}

export function MentionPlugin({ onMention }: MentionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const processedMentionsRef = useRef<Set<string>>(new Set());
  const lastTextRef = useRef<string>('');

  const processMentions = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const text = root.getTextContent();
      
      // Só processar se o texto mudou
      if (text === lastTextRef.current) {
        return;
      }
      lastTextRef.current = text;
      
      // Detectar menções completas: @NomeDoCliente seguido de espaço ou fim
      const mentionRegex = /@(\w{2,})(?:\s|$)/g;
      const currentMentions = new Set<string>();
      let match;
      
      while ((match = mentionRegex.exec(text)) !== null) {
        currentMentions.add(match[1]);
      }
      
      // Apenas notificar novas menções
      currentMentions.forEach(mention => {
        if (!processedMentionsRef.current.has(mention)) {
          processedMentionsRef.current.add(mention);
          onMention(mention);
        }
      });
    });
  }, [editor, onMention]);

  useEffect(() => {
    // Usar update listener ao invés de node transform
    const unregister = editor.registerUpdateListener(() => {
      processMentions();
    });

    return unregister;
  }, [editor, processMentions]);

  return null;
}
