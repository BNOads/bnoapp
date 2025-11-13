import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  TextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
} from 'lexical';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { $isParagraphNode } from 'lexical';

export function MarkdownHeadingPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Register a text content transform to detect markdown heading syntax
    const removeTransform = editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      const text = textNode.getTextContent();
      const parent = textNode.getParent();

      // Only process if this is a paragraph node and the text starts with #
      if (!$isParagraphNode(parent) || !text.match(/^#{1,3}\s/)) {
        return;
      }

      // Check if this is the first child of the paragraph
      const firstChild = parent.getFirstChild();
      if (firstChild !== textNode) {
        return;
      }

      // Detect heading level
      const match = text.match(/^(#{1,3})\s(.*)$/);
      if (!match) return;

      const [, hashes, remainingText] = match;
      const level = hashes.length as 1 | 2 | 3;
      const headingTag = `h${level}` as 'h1' | 'h2' | 'h3';

      // Create heading node
      const headingNode = $createHeadingNode(headingTag);
      
      // Get all children from the paragraph
      const children = parent.getChildren();
      
      // For the first text node, update its text to remove the markdown syntax
      if (remainingText) {
        textNode.setTextContent(remainingText);
      }
      
      // Move all children to the heading node
      children.forEach(child => {
        headingNode.append(child);
      });

      // Replace the paragraph with the heading
      parent.replace(headingNode);
    });

    return () => {
      removeTransform();
    };
  }, [editor]);

  return null;
}
