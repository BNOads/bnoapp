export interface EditorBlock {
  id: string;
  type: 'text' | 'heading' | 'image' | 'video' | 'link' | 'checklist' | 'divider';
  content: {
    text?: string;
    level?: 1 | 2 | 3; // Para headings
    url?: string;
    caption?: string;
    filename?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnailUrl?: string;
    checked?: boolean; // Para checklist
    title?: string; // Para links
    description?: string; // Para links
  };
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface NotionEditorProps {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  readOnly?: boolean;
  className?: string;
}

export interface BlockComponentProps {
  block: EditorBlock;
  onChange: (block: EditorBlock) => void;
  onDelete: () => void;
  onAddBlock: (type: EditorBlock['type']) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  readOnly?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}