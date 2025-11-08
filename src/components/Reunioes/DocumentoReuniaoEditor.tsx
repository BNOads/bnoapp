import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import * as Y from 'yjs';
import { useEffect, useState } from 'react';
import { DocumentoReuniaoYjsProvider } from '@/lib/DocumentoReuniaoYjsProvider';
import { OfflineYjsCache } from '@/lib/offlineYjsCache';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentoReuniaoEditorProps {
  documentoId: string;
  ano: number;
  placeholder?: string;
  onSave?: () => void;
  readOnly?: boolean;
}

const getUserColor = () => {
  const colors = [
    '#958DF1',
    '#F98181',
    '#FBBC88',
    '#FAF594',
    '#70CFF8',
    '#94FADB',
    '#B9F18D',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export function DocumentoReuniaoEditor({
  documentoId,
  ano,
  placeholder = 'Digite o conteúdo do documento...',
  onSave,
  readOnly = false
}: DocumentoReuniaoEditorProps) {
  const { toast } = useToast();
  const { userData } = useCurrentUser();
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<DocumentoReuniaoYjsProvider | null>(null);
  const [cache, setCache] = useState<OfflineYjsCache | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider as any,
        user: {
          name: userData?.nome || 'Anônimo',
          color: getUserColor(),
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    editable: !readOnly,
  });

  // Setup Yjs provider
  useEffect(() => {
    const newProvider = new DocumentoReuniaoYjsProvider(ano, documentoId, ydoc);
    const newCache = new OfflineYjsCache(`documento-reuniao-${ano}`, ydoc);
    
    setProvider(newProvider);
    setCache(newCache);

    return () => {
      newProvider.destroy();
      newCache.destroy();
    };
  }, [documentoId, ano, ydoc]);

  const handleManualSave = async () => {
    if (!provider) return;

    setIsSaving(true);
    const success = await provider.createSnapshot('Salvamento manual');
    
    if (success) {
      toast({
        title: "✅ Salvo com sucesso",
        description: "Snapshot criado",
        duration: 2000
      });
      onSave?.();
    } else {
      toast({
        title: "❌ Erro ao salvar",
        description: "Tente novamente",
        variant: "destructive",
        duration: 2000
      });
    }
    
    setIsSaving(false);
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {!readOnly && (
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-accent' : ''}
          >
            <strong>B</strong>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-accent' : ''}
          >
            <em>I</em>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
          >
            H2
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-accent' : ''}
          >
            • Lista
          </Button>
          
          <div className="flex-1" />
          
          <Button
            onClick={handleManualSave}
            disabled={isSaving}
            size="sm"
            variant="default"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-2">Salvar Snapshot</span>
          </Button>
        </div>
      )}

      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none focus:outline-none min-h-[400px]"
      />
    </div>
  );
}
