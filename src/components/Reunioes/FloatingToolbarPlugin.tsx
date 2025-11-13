import { useEffect, useState, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW
} from 'lexical';
import { $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { 
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND
} from '@lexical/list';
import { Toolbar } from '@/components/ui/toolbar';

interface FloatingToolbarPluginProps {
  onAddToIndex?: (text: string) => void;
}

export function FloatingToolbarPlugin({ onAddToIndex }: FloatingToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    
    if (!$isRangeSelection(selection)) {
      setToolbarVisible(false);
      return;
    }

    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.isCollapsed) {
      setToolbarVisible(false);
      return;
    }

    // Get active formats
    const formats = new Set<string>();
    if (selection.hasFormat('bold')) formats.add('bold');
    if (selection.hasFormat('italic')) formats.add('italic');
    if (selection.hasFormat('underline')) formats.add('underline');
    
    setActiveFormats(formats);

    // Calculate position
    const domRange = nativeSelection.getRangeAt(0);
    const rect = domRange.getBoundingClientRect();
    
    setToolbarPosition({
      x: rect.left + rect.width / 2 - 150, // Center toolbar (assuming ~300px width)
      y: rect.top - 50, // Position above selection
    });
    
    setToolbarVisible(true);
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, updateToolbar]);

  const handleFormat = (command: string) => {
    editor.update(() => {
      const selection = $getSelection();
      
      if (!$isRangeSelection(selection)) return;

      switch (command) {
        case 'bold':
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
          break;
        case 'italic':
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
          break;
        case 'underline':
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
          break;
        case 'bullet':
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          break;
        case 'number':
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          break;
      }
    });
  };

  const handleFixarIndice = () => {
    editor.update(() => {
      const selection = $getSelection();
      
      if (!$isRangeSelection(selection)) return;

      const selectedText = selection.getTextContent();
      
      if (selectedText.trim().length === 0) return;

      // Get the anchor node
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getTopLevelElement();
      
      if (!element) return;

      // Create heading node with text
      const headingNode = $createHeadingNode('h2');
      const textNode = $createParagraphNode();
      textNode.append($createTextNode(element.getTextContent()));
      
      // Get all children and move them to heading
      element.getChildren().forEach(child => {
        headingNode.append(child);
      });
      
      // Replace current node with heading
      element.replace(headingNode);
      
      // Call callback to add to index
      if (onAddToIndex) {
        onAddToIndex(element.getTextContent());
      }
    });

    // Hide toolbar after action
    setToolbarVisible(false);
  };

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
