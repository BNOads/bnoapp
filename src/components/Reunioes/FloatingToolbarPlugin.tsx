import { useEffect, useState, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $isParagraphNode,
} from 'lexical';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { $createLinkNode, $isLinkNode } from '@lexical/link';
import { Toolbar } from '@/components/ui/toolbar';
import { LinkInsertModal } from './LinkInsertModal';
import { mergeRegister } from '@lexical/utils';

interface FloatingToolbarPluginProps {
  onAddToIndex: (text: string) => void;
}

export function FloatingToolbarPlugin({ onAddToIndex }: FloatingToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
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

  const handleColorChange = useCallback((color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        nodes.forEach((node) => {
          if ($isTextNode(node)) {
            const currentStyle = node.getStyle() || '';
            // Remove qualquer definição de cor anterior
            const styleWithoutColor = currentStyle.split(';')
              .filter(s => !s.trim().startsWith('color'))
              .join(';');
            // Adiciona a nova cor
            const newStyle = color 
              ? `${styleWithoutColor ? styleWithoutColor + ';' : ''}color:${color}`
              : styleWithoutColor;
            node.setStyle(newStyle);
          }
        });
      }
    });
  }, [editor]);

  const handleLinkInsert = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setSelectedText(selection.getTextContent());
        setLinkModalOpen(true);
      }
    });
  }, [editor]);

  const handleInsertLink = useCallback((url: string, text: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const linkNode = $createLinkNode(url);
        const textNode = $createTextNode(text);
        linkNode.append(textNode);
        selection.insertNodes([linkNode]);
      }
    });
  }, [editor]);

  const handleFixarIndice = useCallback(() => {
    let textToIndex = '';
    
    editor.update(() => {
      const selection = $getSelection();
      
      if (!$isRangeSelection(selection)) {
        return;
      }

      textToIndex = selection.getTextContent().trim();
      
      if (!textToIndex) {
        return;
      }

      // Obter o anchor node (onde a seleção começa)
      const anchorNode = selection.anchor.getNode();
      
      // Encontrar o bloco pai (parágrafo ou heading)
      let blockNode = anchorNode;
      while (blockNode) {
        const parent = blockNode.getParent();
        if (!parent || parent.getType() === 'root') {
          break;
        }
        if ($isParagraphNode(blockNode) || $isHeadingNode(blockNode)) {
          break;
        }
        blockNode = parent;
      }

      // Se encontramos um bloco válido
      if (blockNode && ($isParagraphNode(blockNode) || $isHeadingNode(blockNode))) {
        // Criar novo heading e copiar o conteúdo
        const headingNode = $createHeadingNode('h2');
        
        // Copiar todos os filhos do bloco atual para o novo heading
        const children = blockNode.getChildren();
        children.forEach(child => {
          headingNode.append(child);
        });
        
        // Substituir o bloco atual pelo heading
        blockNode.replace(headingNode);
        
        // Mover a seleção para o final do novo heading
        headingNode.selectEnd();
      }
    });

    // Adicionar ao índice após a atualização do editor
    if (textToIndex) {
      setTimeout(() => {
        onAddToIndex(textToIndex);
        setToolbarVisible(false);
      }, 100);
    }
  }, [editor, onAddToIndex]);

  return (
    <>
      <Toolbar
        visible={toolbarVisible}
        position={toolbarPosition}
        onFormat={handleFormat}
        onFixarIndice={handleFixarIndice}
        onColorChange={handleColorChange}
        onLinkInsert={handleLinkInsert}
        activeFormats={activeFormats}
      />
      
      <LinkInsertModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onInsert={handleInsertLink}
        selectedText={selectedText}
      />
    </>
  );
}
