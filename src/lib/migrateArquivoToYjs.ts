/**
 * Converte conteudo JSON do Lexical para formato ProseMirror/TipTap.
 * Usado para migrar documentos existentes do Arquivo de Reuniao
 * do editor Lexical para o editor TipTap + Yjs.
 */

// Bitmask de formatos do Lexical
const LEXICAL_FORMAT = {
  BOLD: 1,
  ITALIC: 2,
  STRIKETHROUGH: 4,
  UNDERLINE: 8,
  CODE: 16,
  SUBSCRIPT: 32,
  SUPERSCRIPT: 64,
};

function convertInlineNode(node: any): any {
  if (!node) return null;

  if (node.type === 'text') {
    const text = node.text;
    if (!text) return null;

    const marks: any[] = [];
    const format = node.format || 0;

    if (format & LEXICAL_FORMAT.BOLD) marks.push({ type: 'bold' });
    if (format & LEXICAL_FORMAT.ITALIC) marks.push({ type: 'italic' });
    if (format & LEXICAL_FORMAT.UNDERLINE) marks.push({ type: 'underline' });
    if (format & LEXICAL_FORMAT.STRIKETHROUGH) marks.push({ type: 'strike' });
    if (format & LEXICAL_FORMAT.CODE) marks.push({ type: 'code' });

    // Extrair cor do style
    if (node.style) {
      const colorMatch = node.style.match(/color:\s*([^;]+)/);
      if (colorMatch) {
        marks.push({ type: 'textStyle', attrs: { color: colorMatch[1].trim() } });
      }
    }

    return {
      type: 'text',
      text,
      ...(marks.length > 0 ? { marks } : {}),
    };
  }

  if (node.type === 'linebreak') {
    return { type: 'hardBreak' };
  }

  if (node.type === 'link' || node.type === 'autolink') {
    const url = node.url || '';
    const children = (node.children || []).map(convertInlineNode).filter(Boolean);

    // Adicionar mark de link a cada filho de texto
    return children.map((child: any) => {
      if (child.type === 'text') {
        const existingMarks = child.marks || [];
        return {
          ...child,
          marks: [...existingMarks, { type: 'link', attrs: { href: url, target: '_blank' } }],
        };
      }
      return child;
    });
  }

  return null;
}

function flattenInlineNodes(nodes: any[]): any[] {
  const result: any[] = [];
  for (const node of nodes) {
    if (Array.isArray(node)) {
      result.push(...node);
    } else if (node) {
      result.push(node);
    }
  }
  return result;
}

function convertListItem(node: any): any {
  if (!node || node.type !== 'listitem') return null;

  const children = node.children || [];
  const content: any[] = [];

  // ListItem no Lexical pode conter text nodes diretamente ou listas aninhadas
  const inlineChildren: any[] = [];
  const nestedLists: any[] = [];

  for (const child of children) {
    if (child.type === 'list') {
      nestedLists.push(convertNode(child));
    } else {
      const converted = convertInlineNode(child);
      if (converted) {
        if (Array.isArray(converted)) {
          inlineChildren.push(...converted);
        } else {
          inlineChildren.push(converted);
        }
      }
    }
  }

  if (inlineChildren.length > 0) {
    content.push({ type: 'paragraph', content: inlineChildren });
  }

  content.push(...nestedLists.filter(Boolean));

  return {
    type: 'listItem',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

function convertNode(node: any): any {
  if (!node) return null;

  switch (node.type) {
    case 'paragraph': {
      const content = flattenInlineNodes(
        (node.children || []).map(convertInlineNode)
      ).filter(Boolean);
      return {
        type: 'paragraph',
        ...(content.length > 0 ? { content } : {}),
      };
    }

    case 'heading': {
      const tag = node.tag || 'h2';
      const level = parseInt(tag.replace('h', ''), 10) || 2;
      const content = flattenInlineNodes(
        (node.children || []).map(convertInlineNode)
      ).filter(Boolean);
      return {
        type: 'heading',
        attrs: { level },
        ...(content.length > 0 ? { content } : {}),
      };
    }

    case 'list': {
      const listType = node.listType === 'number' ? 'orderedList' : 'bulletList';
      const items = (node.children || []).map(convertListItem).filter(Boolean);
      return {
        type: listType,
        content: items.length > 0 ? items : [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      };
    }

    case 'listitem':
      return convertListItem(node);

    case 'image': {
      return {
        type: 'image',
        attrs: {
          src: node.src || '',
          alt: node.altText || '',
          title: null,
        },
      };
    }

    case 'horizontalrule':
      return { type: 'horizontalRule' };

    default:
      // Tentar converter como paragrafo se tiver children
      if (node.children && node.children.length > 0) {
        const content = flattenInlineNodes(
          node.children.map(convertInlineNode)
        ).filter(Boolean);
        if (content.length > 0) {
          return { type: 'paragraph', content };
        }
      }
      return null;
  }
}

export function convertLexicalToTipTap(lexicalJson: any): any {
  if (!lexicalJson?.root?.children) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  const content = lexicalJson.root.children
    .map(convertNode)
    .filter(Boolean);

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

export function isLexicalContent(content: any): boolean {
  return !!(content?.root?.children);
}

export function isTipTapContent(content: any): boolean {
  return content?.type === 'doc' && Array.isArray(content?.content);
}
