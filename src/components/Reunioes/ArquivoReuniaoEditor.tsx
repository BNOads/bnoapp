import { useEffect, useRef, useState, useCallback } from 'react';
import { $getRoot, $createParagraphNode, $createTextNode, EditorState, LexicalEditor } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HeadingsPlugin, HeadingInfo } from './HeadingsPlugin';
import { FloatingToolbarPlugin } from './FloatingToolbarPlugin';
import { MarkdownHeadingPlugin } from './MarkdownHeadingPlugin';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ArquivoReuniaoEditorProps {
  arquivoId: string;
  ano: number;
  initialContent?: any;
  onContentChange?: (content: any) => void;
  onHeadingsChange?: (headings: HeadingInfo[]) => void;
  onAddToIndex?: (text: string) => void;
}

export function ArquivoReuniaoEditor({ arquivoId, ano, initialContent, onContentChange, onHeadingsChange, onAddToIndex }: ArquivoReuniaoEditorProps) {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const editorRef = useRef<LexicalEditor | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastStateRef = useRef<any>(null);
  const isSelfUpdate = useRef(false);

  const initialConfig = {
    namespace: 'ArquivoReuniao',
    theme: {
      paragraph: 'mb-2',
      heading: {
        h1: 'text-2xl font-bold mb-4 mt-6',
        h2: 'text-xl font-semibold mb-3 mt-5 bg-primary/5 px-2 py-1 rounded',
        h3: 'text-lg font-medium mb-2 mt-4',
      },
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        underline: 'editor-text-underline',
      },
      list: {
        ul: 'list-disc ml-6 mb-2',
        ol: 'list-decimal ml-6 mb-2',
        listitem: 'mb-1',
      },
      link: 'text-primary underline hover:text-primary/80',
    },
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
    editorState: initialContent ? JSON.stringify(initialContent) : undefined,
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
    const channel = supabase.channel(`arquivo-reuniao-${ano}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'content-update' }, ({ payload }) => {
        console.log('📡 Received update from other user');
        if (editorRef.current && payload.content) {
          isSelfUpdate.current = true;
          editorRef.current.setEditorState(
            editorRef.current.parseEditorState(JSON.stringify(payload.content))
          );
          setTimeout(() => {
            isSelfUpdate.current = false;
          }, 100);
        }
      })
      .subscribe((status) => {
        console.log('📡 Channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [ano]);

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
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative min-h-[600px]">
        <div className="absolute top-2 right-2 z-10">
          <div className={`px-2 py-1 rounded text-xs ${isConnected ? 'bg-green-500/20 text-green-700' : 'bg-gray-500/20 text-gray-700'}`}>
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </div>
        </div>

        <RichTextPlugin
          contentEditable={
            <ContentEditable className="min-h-[600px] outline-none p-6 prose prose-sm max-w-none dark:prose-invert" />
          }
          placeholder={
            <div className="absolute top-6 left-6 text-muted-foreground pointer-events-none">
              Digite as anotações da reunião... Use ## para criar títulos que aparecerão no índice
            </div>
          }
          ErrorBoundary={({children}) => <>{children}</>}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownHeadingPlugin />
        {onHeadingsChange && <HeadingsPlugin onHeadingsChange={onHeadingsChange} />}
        {onAddToIndex && <FloatingToolbarPlugin onAddToIndex={onAddToIndex} />}
        <OnChangePlugin onChange={handleEditorChange} />
      </div>
    </LexicalComposer>
  );
}
