import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isElementNode } from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';

export interface HeadingInfo {
  text: string;
  tag: 'h1' | 'h2' | 'h3';
  id: string;
}

interface HeadingsPluginProps {
  onHeadingsChange: (headings: HeadingInfo[]) => void;
}

export function HeadingsPlugin({ onHeadingsChange }: HeadingsPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const extractHeadings = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const headings: HeadingInfo[] = [];
        let headingCounter = 0;

        const processNode = (node: any) => {
          if ($isHeadingNode(node)) {
            const tag = node.getTag();
            const text = node.getTextContent().trim();
            
            if (text && (tag === 'h1' || tag === 'h2' || tag === 'h3')) {
              headings.push({
                text,
                tag,
                id: `heading-${headingCounter++}`
              });
            }
          }

          if ($isElementNode(node)) {
            const children = node.getChildren();
            children.forEach(child => processNode(child));
          }
        };

        const children = root.getChildren();
        children.forEach(child => processNode(child));

        onHeadingsChange(headings);
      });
    };

    // Extract headings on mount
    extractHeadings();

    // Listen for editor updates
    const unregister = editor.registerUpdateListener(() => {
      extractHeadings();
    });

    return () => {
      unregister();
    };
  }, [editor, onHeadingsChange]);

  return null;
}
