import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Heading from '@tiptap/extension-heading';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { CreateTaskModal } from '@/components/tasks/modals/CreateTaskModal';
import * as Y from 'yjs';
import { SupabaseYjsProvider } from '@/lib/SupabaseYjsProvider';
import { OfflineYjsCache } from '@/lib/offlineYjsCache';
import Collaboration from '@tiptap/extension-collaboration';
import { supabase } from '@/integrations/supabase/client';

interface NativeMeetingEditorProps {
  googleEventId: string;
  initialContent: string | null;
  onContentChange: (html: string) => void;
  className?: string;
  isSaving?: boolean;
  readOnly?: boolean;
}

const BubbleButton = ({ icon: Icon, isActive, onClick, tooltip }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "p-1.5 rounded-sm transition-colors duration-200 hover:bg-muted text-muted-foreground hover:text-foreground",
      isActive && "bg-muted text-foreground"
    )}
    title={tooltip}
  >
    <Icon className="w-4 h-4" />
  </button>
);

export function NativeMeetingEditor({ googleEventId, initialContent, onContentChange, className, isSaving, readOnly = false }: NativeMeetingEditorProps) {
  const [ydoc] = useState(() => new Y.Doc());
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const offlineCacheRef = useRef<OfflineYjsCache | null>(null);
  const [isReady, setIsReady] = useState(false);
  const contentInitialized = useRef(false);
  // Guard: block onContentChange from firing during initial hydration
  const isHydrating = useRef(false);

  // Setup YJS Provider
  useEffect(() => {
    if (!googleEventId) return;

    let mounted = true;

    const setupProvider = async () => {
      const channelName = `native-meeting-${googleEventId}`;
      const { data: { user } } = await supabase.auth.getUser();

      if (!mounted) return;

      const cache = new OfflineYjsCache(channelName, ydoc);
      offlineCacheRef.current = cache;

      if (!mounted) return;

      const newProvider = new SupabaseYjsProvider(
        googleEventId,
        ydoc,
        null,
        {
          tableName: 'pauta_colaboracao_google_events',
          documentIdColumn: 'google_event_id',
          channelPrefix: 'yjs:native-meeting',
        },
        () => {
          if (mounted) setIsReady(true);
        }
      );

      // Set user awareness
      newProvider.awareness.setLocalStateField('user', {
        name: user?.user_metadata?.name || user?.email || 'Usuário',
        color: '#3b82f6',
        avatarUrl: user?.user_metadata?.avatar_url
      });

      providerRef.current = newProvider;
    };

    setupProvider();

    return () => {
      mounted = false;
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [googleEventId, ydoc]);

  const editor = useEditor({
    extensions: [
      Collaboration.configure({
        document: ydoc,
      }),
      // IMPORTANT: disable history from StarterKit because Collaboration has its own
      StarterKit.configure({
        heading: false,
        history: false,
      }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Digite a pauta ou as anotações desta reunião...',
      }),
      Color,
      TextStyle,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4',
      },
    },
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Don't fire onContentChange during initial content hydration
      if (isHydrating.current) return;
      onContentChange(editor.getHTML());
    },
  });

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskSelectedText, setTaskSelectedText] = useState('');

  const handleCreateTaskFromText = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ').trim();
    if (!text) return;

    setTaskSelectedText(text);
    setTaskModalOpen(true);
  }, [editor]);

  // Hydrate initial content into YJS doc ONCE when the provider finishes loading
  useEffect(() => {
    if (!editor || !isReady || contentInitialized.current) return;
    contentInitialized.current = true;

    // The Collaboration extension uses XmlFragment internally.
    // Check if the YJS document already has content from the DB.
    const xmlFragment = ydoc.getXmlFragment('default');
    const hasYjsContent = xmlFragment.length > 0;

    if (!hasYjsContent && initialContent && editor.isEmpty) {
      // Block onUpdate from firing during hydration to prevent save loop
      isHydrating.current = true;
      editor.commands.setContent(initialContent);
      // Allow onUpdate to fire again after hydration settles
      setTimeout(() => {
        isHydrating.current = false;
      }, 100);
    }
  }, [editor, isReady, initialContent, ydoc]);

  if (!editor || !isReady) return <div className="p-8 text-center text-muted-foreground animate-pulse">Sincronizando editor...</div>;

  return (
    <div className={cn("border rounded-md bg-background flex flex-col focus-within:ring-1 focus-within:ring-ring focus-within:border-ring", className)}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/20">
          <BubbleButton icon={Undo2} isActive={false} onClick={() => editor.chain().focus().undo().run()} tooltip="Desfazer" />
          <BubbleButton icon={Redo2} isActive={false} onClick={() => editor.chain().focus().redo().run()} tooltip="Refazer" />

          <Separator orientation="vertical" className="h-5 mx-1" />

          <BubbleButton icon={Bold} isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} tooltip="Negrito" />
          <BubbleButton icon={Italic} isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} tooltip="Itálico" />
          <BubbleButton icon={UnderlineIcon} isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} tooltip="Sublinhado" />

          <Separator orientation="vertical" className="h-5 mx-1" />

          <BubbleButton icon={List} isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} tooltip="Marcadores" />
          <BubbleButton icon={ListOrdered} isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} tooltip="Numerada" />
          <BubbleButton icon={CheckSquare} isActive={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} tooltip="Lista de Tarefas" />

          <div className="ml-auto text-xs text-muted-foreground mr-2 font-medium flex items-center">
            {isSaving ? (
              <span className="text-yellow-600 animate-pulse">Salvando...</span>
            ) : (
              <span className="text-green-600">Salvo ✓</span>
            )}
          </div>
        </div>
      )}

      <div className={cn("bg-background overflow-hidden relative", !readOnly ? "rounded-b-md" : "rounded-md")}>
        <BubbleMenu
          editor={editor}
          options={{
            placement: 'top',
            offset: 8,
          }}
          className="bg-card border border-border rounded-lg shadow-md p-1 flex items-center gap-1"
        >
          <button
            type="button"
            onClick={handleCreateTaskFromText}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-all hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-400 bg-background"
            title="Criar tarefa a partir do texto selecionado"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Transformar em Tarefa
          </button>
        </BubbleMenu>

        <EditorContent editor={editor} />
      </div>

      {!readOnly && (
        <CreateTaskModal
          open={taskModalOpen}
          onOpenChange={setTaskModalOpen}
          defaultTitle={taskSelectedText}
          onSuccessTask={(taskPayload) => {
            // You could insert a mention to the task here if needed
          }}
        />
      )}
    </div>
  );
}
