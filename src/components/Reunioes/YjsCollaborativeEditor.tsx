import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import * as Y from 'yjs';
import { SupabaseYjsProvider } from '@/lib/SupabaseYjsProvider';
import { OfflineYjsCache } from '@/lib/offlineYjsCache';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface YjsCollaborativeEditorProps {
  pautaId: string;
  blockId: string;
  placeholder?: string;
  onSave?: () => void;
  readOnly?: boolean;
}

export function YjsCollaborativeEditor({
  pautaId,
  blockId,
  placeholder = 'Comece a digitar...',
  onSave,
  readOnly = false
}: YjsCollaborativeEditorProps) {
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ydoc] = useState(() => new Y.Doc());
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const offlineCacheRef = useRef<OfflineYjsCache | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cores únicas por usuário
  const getUserColor = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const hash = user?.id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return colors[hash % colors.length];
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: ydoc,
        field: `block-${blockId}`, // Campo específico do bloco
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

  useEffect(() => {
    if (!pautaId || !ydoc) return;

    // Inicializar provider
    const provider = new SupabaseYjsProvider(pautaId, ydoc);
    providerRef.current = provider;

    // Inicializar cache offline
    const offlineCache = new OfflineYjsCache(pautaId, ydoc);
    offlineCacheRef.current = offlineCache;

    return () => {
      provider.destroy();
      offlineCache.destroy();
    };
  }, [pautaId, ydoc]);

  const handleManualSave = async () => {
    if (providerRef.current) {
      setIsSaving(true);
      const success = await providerRef.current.createSnapshot('Salvamento manual');
      setIsSaving(false);
      
      if (success) {
        toast({
          title: "✅ Snapshot salvo",
          description: "Versão salva com sucesso",
          duration: 2000
        });
        onSave?.();
      } else {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível criar o snapshot",
          variant: "destructive"
        });
      }
    }
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando editor colaborativo...</span>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-accent' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-accent' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-accent' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-accent' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <div className="flex-1" />
          
          <Button 
            onClick={handleManualSave} 
            variant="outline" 
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Snapshot
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="p-4">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none dark:prose-invert"
        />
      </div>
    </div>
  );
}
