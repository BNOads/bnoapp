import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState, LexicalEditor, $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MentionPlugin } from './MentionPlugin';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PautaBlocoLexicalEditorProps {
  pautaId: string;
  blocoId: string;
  initialContent?: any;
  onContentChange?: (content: any) => void;
  onClientMention?: (clientName: string) => void;
}

export function PautaBlocoLexicalEditor({ 
  pautaId, 
  blocoId, 
  initialContent, 
  onContentChange, 
  onClientMention 
}: PautaBlocoLexicalEditorProps) {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const editorRef = useRef<LexicalEditor | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastStateRef = useRef<any>(null);
  const isSelfUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMention = useCallback((clientName: string) => {
    console.log('Cliente mencionado no bloco:', clientName);
    onClientMention?.(clientName);
  }, [onClientMention]);

  // Sanitização robusta do estado Lexical
  const sanitizeState = (state: any) => {
    const makeDefault = () => ({
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '', version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    });

    if (!state || typeof state !== 'object') return makeDefault();
    if (!state.root || typeof state.root !== 'object') return makeDefault();

    const root = state.root;
    if (!Array.isArray(root.children) || root.children.length === 0) {
      return makeDefault();
    }

    const safeChildren = root.children.map((child: any) => {
      if (!child || typeof child !== 'object' || typeof child.type !== 'string') {
        return {
          type: 'paragraph',
          children: [{ type: 'text', text: String(child ?? ''), version: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        };
      }

      // Garantir filhos para parágrafos/headers
      const needsChildren = ['paragraph', 'heading', 'quote'].includes(child.type);
      if (needsChildren) {
        if (!Array.isArray(child.children) || child.children.length === 0) {
          child.children = [{ type: 'text', text: '', version: 1 }];
        } else {
          child.children = child.children.map((grand: any) =>
            grand && typeof grand.type === 'string'
              ? grand
              : { type: 'text', text: String(grand?.text ?? ''), version: 1 }
          );
        }
      }
      return child;
    });

    return {
      root: {
        ...root,
        children: safeChildren,
      },
    };
  };

  const initialConfig = {
    namespace: `PautaBloco-${blocoId}`,
    theme: {
      paragraph: 'mb-2',
      heading: {
        h1: 'text-2xl font-bold mb-4 mt-6',
        h2: 'text-xl font-semibold mb-3 mt-5',
        h3: 'text-lg font-medium mb-2 mt-4',
      },
      list: {
        ul: 'list-disc ml-6 mb-2',
        ol: 'list-decimal ml-6 mb-2',
        listitem: 'mb-1',
      },
      link: 'text-primary underline hover:text-primary/80',
    },
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
    editorState: JSON.stringify(sanitizeState(initialContent)),
    onError: (error: Error) => {
      console.error('Lexical error:', error);
      toast({
        title: "❌ Erro no editor",
        description: error.message,
        variant: "destructive"
      });
    },
  };

  // Setup Realtime channel for collaboration
  useEffect(() => {
    const channel = supabase.channel(`pauta-bloco-${blocoId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'content-update' }, ({ payload }) => {
        console.log('📡 Recebendo atualização de outro usuário');
        if (editorRef.current && payload.content) {
          try {
            const sanitized = sanitizeState(payload.content);
            const parsed = editorRef.current.parseEditorState(JSON.stringify(sanitized));
            editorRef.current.setEditorState(parsed);
          } catch (e) {
            console.error('Falha ao aplicar atualização remota. Usando estado padrão.', e);
            editorRef.current.update(() => {
              const root = $getRoot();
              root.clear();
              const p = $createParagraphNode();
              p.append($createTextNode(''));
              root.append(p);
            });
          }
          setTimeout(() => {
            isSelfUpdate.current = false;
          }, 100);
        }
      })
      .subscribe((status) => {
        console.log('📡 Status do canal:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [blocoId]);

  const handleEditorChange = (editorState: EditorState, editor: LexicalEditor) => {
    if (isSelfUpdate.current) {
      return; // Skip broadcasting self-updates
    }

    editorRef.current = editor;

    const json = editorState.toJSON();
    
    // Only broadcast and save if content actually changed
    if (JSON.stringify(json) !== JSON.stringify(lastStateRef.current)) {
      lastStateRef.current = json;

      // Broadcast to other users
      if (channelRef.current && isConnected) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'content-update',
          payload: { content: json }
        });
      }

      // Notify parent component
      onContentChange?.(json);

      // Debounced save to database
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('reunioes_blocos')
            .update({ 
              conteudo_lexical: json as any,
              updated_at: new Date().toISOString()
            })
            .eq('id', blocoId);

          if (error) {
            console.error('Erro ao salvar bloco:', error);
          }
        } catch (err) {
          console.error('Erro ao salvar:', err);
        }
      }, 2000); // Auto-save após 2 segundos
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative min-h-[200px]">
        <div className="absolute top-2 right-2 z-10">
          <div className={`px-2 py-1 rounded text-xs ${isConnected ? 'bg-green-500/20 text-green-700' : 'bg-gray-500/20 text-gray-700'}`}>
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </div>
        </div>

        <RichTextPlugin
          contentEditable={
            <ContentEditable className="min-h-[200px] outline-none p-4 prose prose-sm max-w-none dark:prose-invert" />
          }
          placeholder={
            <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none">
              Digite o conteúdo da pauta...
            </div>
          }
          ErrorBoundary={({children}) => <>{children}</>}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MentionPlugin onMention={handleMention} />
        <OnChangePlugin onChange={handleEditorChange} />
      </div>
    </LexicalComposer>
  );
}
