import { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import * as Y from 'yjs';
import { SupabaseYjsProvider } from '@/lib/SupabaseYjsProvider';
import { OfflineYjsCache } from '@/lib/offlineYjsCache';
import { uploadImage, getImageFromClipboard } from '@/lib/imageUpload';
import { convertLexicalToTipTap, isLexicalContent } from '@/lib/migrateArquivoToYjs';
import { supabase } from '@/integrations/supabase/client';
import { LinkInsertModal } from './LinkInsertModal';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Pin,
  Palette,
  Link2,
  Undo2,
  Redo2,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface HeadingInfo {
  text: string;
  tag: 'h1' | 'h2' | 'h3';
  id: string;
}

interface ArquivoReuniaoTipTapEditorProps {
  arquivoId: string;
  ano: number;
  initialContent?: any;
  onContentChange?: (content: any) => void;
  onHeadingsChange?: (headings: HeadingInfo[]) => void;
  onAddToIndex?: (text: string) => void;
  onReady?: () => void;
  userName: string;
  userId: string;
  userAvatarUrl?: string;
  userColor: string;
}

const COLORS = [
  { name: 'Padrao', value: '' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
];

export function ArquivoReuniaoTipTapEditor({
  arquivoId,
  ano,
  initialContent,
  onContentChange,
  onHeadingsChange,
  onAddToIndex,
  onReady,
  userName,
  userId,
  userAvatarUrl,
  userColor,
}: ArquivoReuniaoTipTapEditorProps) {
  const [ydoc] = useState(() => new Y.Doc());
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const offlineCacheRef = useRef<OfflineYjsCache | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const migrationDoneRef = useRef(false);
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout>();

  // Criar editor UMA vez (sem deps) - mesmo padrão do YjsCollaborativeEditor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: ydoc,
        field: 'arquivo-content',
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: 'Digite as anotacoes da reuniao... Use ## para criar titulos que aparecerao no indice',
      }),
      Color,
      TextStyle,
    ],
    editorProps: {
      attributes: {
        class: 'min-h-[600px] outline-none p-6 prose prose-sm max-w-none dark:prose-invert',
      },
      handlePaste: (view, event) => {
        const file = getImageFromClipboard(event as unknown as ClipboardEvent);
        if (file) {
          event.preventDefault();
          handleImageFile(file);
          return true;
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageFile(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Inicializar provider DEPOIS do editor (mesmo padrão do YjsCollaborativeEditor)
  useEffect(() => {
    if (!arquivoId || !ydoc) return;

    const provider = new SupabaseYjsProvider(arquivoId, ydoc, null, {
      tableName: 'arquivo_reuniao_colaboracao',
      documentIdColumn: 'arquivo_id',
      channelPrefix: 'yjs:arquivo',
    }, () => {
      // Provider carregou o estado do DB - marcar como pronto
      setIsReady(true);
    });
    providerRef.current = provider;

    const offlineCache = new OfflineYjsCache(`arquivo-${arquivoId}`, ydoc);
    offlineCacheRef.current = offlineCache;

    return () => {
      provider.destroy();
      offlineCache.destroy();
    };
  }, [arquivoId, ydoc]);

  // Migrar conteudo Lexical para TipTap se necessario
  useEffect(() => {
    if (!editor || !isReady || migrationDoneRef.current) return;

    // Verificar se ja tem conteudo no Yjs
    const xmlFragment = ydoc.getXmlFragment('arquivo-content');
    const hasYjsContent = xmlFragment.length > 0;

    if (!hasYjsContent && initialContent && isLexicalContent(initialContent)) {
      const tiptapContent = convertLexicalToTipTap(initialContent);
      editor.commands.setContent(tiptapContent);
    }

    migrationDoneRef.current = true;
    onReady?.();
  }, [editor, isReady, initialContent, ydoc]);

  // Extrair headings para o indice
  useEffect(() => {
    if (!editor || !onHeadingsChange) return;

    const extractHeadings = () => {
      const headings: HeadingInfo[] = [];
      let counter = 0;

      editor.state.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          const level = node.attrs.level;
          const text = node.textContent.trim();
          if (text && level >= 1 && level <= 3) {
            headings.push({
              text,
              tag: `h${level}` as 'h1' | 'h2' | 'h3',
              id: `heading-${counter++}`,
            });
          }
        }
      });

      onHeadingsChange(headings);
    };

    editor.on('update', extractHeadings);
    // Extracao inicial
    const timer = setTimeout(extractHeadings, 1500);

    return () => {
      editor.off('update', extractHeadings);
      clearTimeout(timer);
    };
  }, [editor, onHeadingsChange]);

  // Notificar mudancas de conteudo (para autosave no DB principal)
  useEffect(() => {
    if (!editor || !onContentChange) return;

    const handleUpdate = () => {
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
      // Debounce de 3s para salvar JSON no DB principal
      contentChangeTimeoutRef.current = setTimeout(() => {
        const json = editor.getJSON();
        onContentChange(json);
      }, 3000);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, [editor, onContentChange]);

  const handleImageFile = useCallback(async (file: File | Blob) => {
    if (!editor) return;

    const toastId = toast.loading("Enviando imagem...");
    try {
      const result = await uploadImage({
        file,
        context: 'arquivo_reuniao',
        entityId: arquivoId,
      });
      editor.chain().focus().setImage({ src: result.url, alt: result.fileName }).run();
      toast.success("Imagem inserida!", { id: toastId });
    } catch (error: any) {
      toast.error("Erro ao inserir imagem", {
        id: toastId,
        description: error.message || 'Tente novamente',
      });
    }
  }, [editor, arquivoId]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens sao permitidas');
      return;
    }

    await handleImageFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImageFile]);

  const handleLinkInsert = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    setSelectedText(text);
    setLinkModalOpen(true);
  }, [editor]);

  const handleInsertLink = useCallback((url: string, text: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(`<a href="${url}" target="_blank">${text}</a>`)
      .run();
  }, [editor]);

  const handleFixarIndice = useCallback(() => {
    if (!editor || !onAddToIndex) return;

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ').trim();

    if (!text) return;

    editor.chain().focus().setHeading({ level: 2 }).run();
    onAddToIndex(text);
  }, [editor, onAddToIndex]);

  const handleColorChange = useCallback((color: string) => {
    if (!editor) return;
    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setColorPopoverOpen(false);
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Carregando editor colaborativo...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-[600px]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* BubbleMenu - toolbar flutuante ao selecionar texto */}
      <BubbleMenu
        editor={editor}
        options={{
          placement: 'top',
          offset: 8,
        }}
        className="bg-card border border-border rounded-lg shadow-elegant p-1 flex items-center gap-1 overflow-x-auto"
      >
        {/* Undo/Redo */}
        <BubbleButton
          icon={Undo2}
          isActive={false}
          onClick={() => editor.chain().focus().undo().run()}
          tooltip="Desfazer"
        />
        <BubbleButton
          icon={Redo2}
          isActive={false}
          onClick={() => editor.chain().focus().redo().run()}
          tooltip="Refazer"
        />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Formatacao */}
        <BubbleButton
          icon={Bold}
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          tooltip="Negrito (Ctrl+B)"
        />
        <BubbleButton
          icon={Italic}
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          tooltip="Italico (Ctrl+I)"
        />
        <BubbleButton
          icon={UnderlineIcon}
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          tooltip="Sublinhado (Ctrl+U)"
        />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Cor */}
        <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-md transition-all duration-200 hover:bg-accent"
              aria-label="Cor do texto"
            >
              <Palette className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 pointer-events-auto" side="top">
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color.value || 'default'}
                  type="button"
                  className={cn(
                    "h-8 rounded border-2 transition-all hover:scale-110",
                    !color.value && "bg-gradient-to-br from-background to-muted"
                  )}
                  style={color.value ? { backgroundColor: color.value } : {}}
                  onClick={() => handleColorChange(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Link */}
        <BubbleButton
          icon={Link2}
          isActive={editor.isActive('link')}
          onClick={handleLinkInsert}
          tooltip="Inserir link"
        />

        {/* Imagem */}
        <BubbleButton
          icon={ImageIcon}
          isActive={false}
          onClick={() => fileInputRef.current?.click()}
          tooltip="Inserir imagem"
        />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Listas */}
        <BubbleButton
          icon={List}
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          tooltip="Lista com marcadores"
        />
        <BubbleButton
          icon={ListOrdered}
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          tooltip="Lista numerada"
        />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Fixar no Indice */}
        {onAddToIndex && (
          <BubbleButton
            icon={Pin}
            isActive={false}
            onClick={handleFixarIndice}
            tooltip="Fixar como titulo no indice"
          />
        )}
      </BubbleMenu>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Link Modal */}
      <LinkInsertModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onInsert={handleInsertLink}
        selectedText={selectedText}
      />
    </div>
  );
}

// Botao do BubbleMenu
function BubbleButton({
  icon: Icon,
  isActive,
  onClick,
  tooltip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-2 rounded-md transition-all duration-200 hover:bg-accent",
        isActive && "bg-primary/10 text-primary"
      )}
      aria-label={tooltip}
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
