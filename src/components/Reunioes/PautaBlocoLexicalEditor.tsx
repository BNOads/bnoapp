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
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Save } from 'lucide-react';

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  
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

    console.log(`📡 [${blocoId.slice(0,8)}] Configurando listener de sincronização em tempo real`);

    const cleanup = onSyncEvent((event) => {
      // Only process updates for this specific block
      if (event.type !== 'content_update' || event.block_id !== blocoId) return;
      if (!editorRef.current || isApplyingRemoteUpdate.current) return;

      console.log(`📥 [${blocoId.slice(0,8)}] Recebendo update remoto em ${new Date().toISOString()}`);

      try {
        // Mark that we're applying a remote update to prevent re-broadcasting
        isApplyingRemoteUpdate.current = true;

        // Aplicar diretamente sem sanitização pesada
        const parsed = editorRef.current.parseEditorState(JSON.stringify(event.value));
        editorRef.current.setEditorState(parsed);

        console.log(`✅ [${blocoId.slice(0,8)}] Update remoto aplicado com sucesso`);
      } catch (e) {
        console.error(`❌ [${blocoId.slice(0,8)}] Erro ao aplicar update:`, e);
        // Não fazer nada - manter estado atual ao invés de tentar "consertar"
      } finally {
        // Reset mais rápido - 50ms
        setTimeout(() => {
          isApplyingRemoteUpdate.current = false;
        }, 50);
      }
    });

    return () => {
      cleanup();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pautaId, blocoId, onSyncEvent]);

  const saveToDatabase = async (content: any) => {
    setSaveStatus('saving');
    console.log(`💾 [${blocoId.slice(0,8)}] Salvando no banco de dados...`);
    
    try {
      const { error } = await supabase
        .from('reunioes_blocos')
        .update({ 
          conteudo_lexical: content as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', blocoId);

      if (error) {
        console.error(`❌ [${blocoId.slice(0,8)}] Erro ao salvar bloco:`, error);
        setSaveStatus('error');
        toast({
          title: "❌ Erro ao salvar",
          description: "Não foi possível salvar as alterações. Clique em 'Salvar Manualmente'.",
          variant: "destructive"
        });
      } else {
        console.log(`✅ [${blocoId.slice(0,8)}] Bloco salvo com sucesso`);
        setSaveStatus('saved');
        setLastSaveTime(new Date());
        
        // Auto-reset para idle após 3 segundos
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      console.error(`❌ [${blocoId.slice(0,8)}] Erro ao salvar:`, err);
      setSaveStatus('error');
      toast({
        title: "❌ Erro ao salvar",
        description: "Ocorreu um erro inesperado. Tente salvar manualmente.",
        variant: "destructive"
      });
    }
  };

  const handleEditorChange = (editorState: EditorState, editor: LexicalEditor) => {
    // Skip if this is a remote update being applied
    if (isApplyingRemoteUpdate.current) {
      console.log(`⏭️ [${blocoId.slice(0,8)}] Pulando - aplicando update remoto`);
      return;
    }

    editorRef.current = editor;
    const json = editorState.toJSON();
    
    // Only broadcast and save if content actually changed
    if (JSON.stringify(json) !== JSON.stringify(lastStateRef.current)) {
      lastStateRef.current = json;

      console.log(`📤 [${blocoId.slice(0,8)}] Broadcasting mudança em ${new Date().toISOString()}`);

      // Broadcast IMEDIATO para sincronização instantânea
      broadcastContentUpdate(blocoId, 'conteudo_lexical', json, true);

      // Notify parent component
      onContentChange?.(json);

      // Debounced save to database (1.5 segundos - reduzido)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(json);
      }, 1500); // Auto-save após 1.5 segundos
    }
  };

  const handleManualSave = () => {
    if (lastStateRef.current) {
      saveToDatabase(lastStateRef.current);
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative min-h-[200px]">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {/* Status de Conexão */}
          <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
            syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-400' :
            syncStatus === 'synced' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-400' :
            syncStatus === 'error' ? 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-400' :
            'bg-gray-500/20 text-gray-700 dark:bg-gray-500/30 dark:text-gray-400'
          }`}>
            {syncStatus === 'syncing' && (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                <span>Conectando...</span>
              </>
            )}
            {syncStatus === 'synced' && (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                <span>Online</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                <span>Offline</span>
              </>
            )}
            {syncStatus === 'idle' && (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse"></span>
                <span>Conectando...</span>
              </>
            )}
          </div>

          {/* Status de Salvamento */}
          <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
            saveStatus === 'saving' ? 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-400' :
            saveStatus === 'saved' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-400' :
            saveStatus === 'error' ? 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-400' :
            'bg-gray-500/20 text-gray-700 dark:bg-gray-500/30 dark:text-gray-400'
          }`}>
            {saveStatus === 'saving' && (
              <>
                <Clock className="w-3 h-3 animate-spin" />
                <span>Salvando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3 h-3" />
                <span>Salvo {lastSaveTime && `há ${Math.floor((Date.now() - lastSaveTime.getTime()) / 1000)}s`}</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <X className="w-3 h-3" />
                <span>Erro ao salvar</span>
              </>
            )}
            {saveStatus === 'idle' && lastSaveTime && (
              <>
                <Check className="w-3 h-3 opacity-50" />
                <span className="opacity-70">Salvo há {Math.floor((Date.now() - lastSaveTime.getTime()) / 1000)}s</span>
              </>
            )}
          </div>

          {/* Botão de Salvar Manualmente (aparece em caso de erro) */}
          {saveStatus === 'error' && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-7 px-2 text-xs"
              onClick={handleManualSave}
            >
              <Save className="w-3 h-3 mr-1" />
              Salvar
            </Button>
          )}
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
