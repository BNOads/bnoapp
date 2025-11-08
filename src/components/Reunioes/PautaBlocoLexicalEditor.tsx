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
import { useRealtimeDocument } from '@/hooks/useRealtimeDocument';

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
  const editorRef = useRef<LexicalEditor | null>(null);
  const lastStateRef = useRef<any>(null);
  const isApplyingRemoteUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  const {
    broadcastContentUpdate,
    onSyncEvent,
    syncStatus,
  } = useRealtimeDocument(pautaId);

  const handleMention = useCallback((clientName: string) => {
    console.log('Cliente mencionado no bloco:', clientName);
    onClientMention?.(clientName);
  }, [onClientMention]);

  // Sanitização robusta do estado Lexical
  const sanitizeState = (state: any) => {
    const makeDefault = () => ({
      root: {
        type: 'root',
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
        type: 'root',
        ...root,
        children: safeChildren,
        version: 1,
      },
    };
  };
  // Criar estado inicial seguro
  const createSafeInitialState = () => {
    console.log('[Lexical] Criando estado inicial para bloco', blocoId);
    console.log('[Lexical] initialContent:', initialContent);
    
    if (!initialContent) {
      console.log('[Lexical] Sem conteúdo inicial, usando padrão do Lexical');
      return undefined;
    }
    
    try {
      const sanitized = sanitizeState(initialContent);
      console.log('[Lexical] Estado sanitizado:', sanitized);
      
      const jsonString = JSON.stringify(sanitized);
      
      // Validar que o JSON não está vazio
      const parsed = JSON.parse(jsonString);
      if (!parsed?.root?.children || parsed.root.children.length === 0) {
        console.warn('[Lexical] Estado sanitizado está vazio, usando padrão');
        return undefined;
      }
      
      // Validar que todos os children têm um array de children ou são text nodes
      const hasValidChildren = parsed.root.children.every((child: any) => {
        if (child.type === 'text') return true;
        if (child.type === 'paragraph' || child.type === 'heading') {
          return Array.isArray(child.children) && child.children.length > 0;
        }
        return true;
      });
      
      if (!hasValidChildren) {
        console.warn('[Lexical] Children inválidos detectados, usando padrão');
        return undefined;
      }
      
      console.log('[Lexical] Estado inicial válido criado');
      return jsonString;
    } catch (e) {
      console.error('[Lexical] Erro ao criar estado inicial:', e);
      return undefined;
    }
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
    editorState: createSafeInitialState(),
    onError: (error: Error) => {
      console.error('Lexical error:', error);
      toast({
        title: "❌ Erro no editor",
        description: error.message,
        variant: "destructive"
      });
    },
  };

  // Setup realtime listener for remote updates
  useEffect(() => {
    if (!pautaId || !blocoId || !editorRef.current) return;

    console.log('📡 [Realtime] Configurando listener para bloco:', blocoId);

    const cleanup = onSyncEvent((event) => {
      // Only process updates for this specific block
      if (event.type !== 'content_update' || event.block_id !== blocoId) return;
      if (!editorRef.current || isApplyingRemoteUpdate.current) return;

      console.log('📡 [Realtime] Recebendo atualização remota para bloco:', blocoId);

      try {
        // Mark that we're applying a remote update to prevent re-broadcasting
        isApplyingRemoteUpdate.current = true;

        const sanitized = sanitizeState(event.value);
        const parsed = editorRef.current.parseEditorState(JSON.stringify(sanitized));
        editorRef.current.setEditorState(parsed);

        console.log('✅ [Realtime] Atualização remota aplicada com sucesso');
      } catch (e) {
        console.error('❌ [Realtime] Erro ao aplicar atualização remota:', e);
        // Reset to safe state
        editorRef.current.update(() => {
          const root = $getRoot();
          root.clear();
          const p = $createParagraphNode();
          p.append($createTextNode(''));
          root.append(p);
        });
      } finally {
        // Reset the flag after a short delay
        setTimeout(() => {
          isApplyingRemoteUpdate.current = false;
        }, 100);
      }
    });

    return () => {
      cleanup();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pautaId, blocoId, onSyncEvent]);

  const handleEditorChange = (editorState: EditorState, editor: LexicalEditor) => {
    // Skip if this is a remote update being applied
    if (isApplyingRemoteUpdate.current) {
      console.log('⏭️ [Editor] Pulando broadcast - update remoto sendo aplicado');
      return;
    }

    editorRef.current = editor;
    const json = editorState.toJSON();
    
    // Only broadcast and save if content actually changed
    if (JSON.stringify(json) !== JSON.stringify(lastStateRef.current)) {
      lastStateRef.current = json;

      console.log('📤 [Editor] Conteúdo alterado, broadcasting para outros usuários');

      // Broadcast to other users in real-time (without debounce for instant sync)
      broadcastContentUpdate(blocoId, 'conteudo_lexical', json, false);

      // Notify parent component
      onContentChange?.(json);

      // Debounced save to database
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        console.log('💾 [Editor] Salvando no banco de dados...');
        try {
          const { error } = await supabase
            .from('reunioes_blocos')
            .update({ 
              conteudo_lexical: json as any,
              updated_at: new Date().toISOString()
            })
            .eq('id', blocoId);

          if (error) {
            console.error('❌ [Editor] Erro ao salvar bloco:', error);
          } else {
            console.log('✅ [Editor] Bloco salvo com sucesso');
          }
        } catch (err) {
          console.error('❌ [Editor] Erro ao salvar:', err);
        }
      }, 2000); // Auto-save após 2 segundos
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative min-h-[200px]">
        <div className="absolute top-2 right-2 z-10">
          <div className={`px-2 py-1 rounded text-xs ${
            syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-700' :
            syncStatus === 'synced' ? 'bg-green-500/20 text-green-700' :
            syncStatus === 'error' ? 'bg-red-500/20 text-red-700' :
            'bg-gray-500/20 text-gray-700'
          }`}>
            {syncStatus === 'syncing' && '🔄 Sincronizando...'}
            {syncStatus === 'synced' && '✅ Sincronizado'}
            {syncStatus === 'error' && '❌ Erro'}
            {syncStatus === 'idle' && '⚪ Aguardando'}
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
