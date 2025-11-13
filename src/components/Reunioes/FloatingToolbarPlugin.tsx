import { useEffect, useState, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { Toolbar } from '@/components/ui/toolbar';
import { mergeRegister } from '@lexical/utils';

interface FloatingToolbarPluginProps {
  onAddToIndex: (text: string) => void;
}

export function FloatingToolbarPlugin({ onAddToIndex }: FloatingToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      setToolbarVisible(false);
      return;
    }

    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.rangeCount === 0) {
      setToolbarVisible(false);
      return;
    }

    const range = nativeSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Posicionar toolbar acima da seleção
    setToolbarPosition({
      x: rect.left + rect.width / 2 - 200, // centralizar (assumindo toolbar com ~400px)
      y: rect.top - 50, // 50px acima
    });

    // Atualizar formatos ativos
    setActiveFormats({
      bold: selection.hasFormat('bold'),
      italic: selection.hasFormat('italic'),
      underline: selection.hasFormat('underline'),
    });

    setToolbarVisible(true);
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  const handleFormat = useCallback((format: string) => {
    if (format === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else if (format === 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else if (format === 'bold' || format === 'italic' || format === 'underline') {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format as 'bold' | 'italic' | 'underline');
    }
  }, [editor]);

  const handleFixarIndice = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      
      if (!$isRangeSelection(selection)) {
        return;
      }

      const selectedText = selection.getTextContent().trim();
      
      if (!selectedText) {
        return;
      }

      // Pegar os nós selecionados
      const nodes = selection.getNodes();
      
      if (nodes.length === 0) {
        return;
      }

      // Pegar o primeiro nó e encontrar seu parent mais próximo que é um elemento
      let targetNode = nodes[0];
      let parent = targetNode.getParent();
      
      // Subir até encontrar um nó de parágrafo ou heading
      while (parent && !$isHeadingNode(parent) && parent.getType() !== 'paragraph') {
        targetNode = parent;
        parent = parent.getParent();
      }

      // Se já é um heading, não fazer nada
      if (parent && $isHeadingNode(parent)) {
        onAddToIndex(selectedText);
        return;
      }

      // Criar novo heading node
      const headingNode = $createHeadingNode('h2');
      const textNode = $createTextNode(selectedText);
      headingNode.append(textNode);

      // Substituir o nó atual pelo heading
      if (parent) {
        parent.replace(headingNode);
      }

      // Adicionar ao índice
      onAddToIndex(selectedText);
    });

    // Limpar seleção após transformar em heading
    setTimeout(() => {
      setToolbarVisible(false);
    }, 100);
  }, [editor, onAddToIndex]);

  return (
    <Toolbar
      visible={toolbarVisible}
      position={toolbarPosition}
      onFormat={handleFormat}
      onFixarIndice={handleFixarIndice}
      activeFormats={activeFormats}
    />
  );
}
