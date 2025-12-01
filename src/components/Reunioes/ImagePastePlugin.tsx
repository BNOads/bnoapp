import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { $createImageNode } from './ImageNode';
import { uploadImage } from '@/lib/imageUpload';
import { toast } from 'sonner';

interface ImagePastePluginProps {
  context?: string;
  entityId?: string;
}

export function ImagePastePlugin({ context, entityId }: ImagePastePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const file = item.getAsFile();
          
          if (!file) continue;

          const toastId = toast.loading("Enviando imagem...");

          try {
            const result = await uploadImage({
              file,
              context: context || 'arquivo_reuniao',
              entityId,
            });

            editor.update(() => {
              const imageNode = $createImageNode({
                src: result.url,
                altText: result.fileName,
                maxWidth: 800,
              });
              
              const selection = editor.getEditorState()._selection;
              if (selection) {
                selection.insertNodes([imageNode]);
              }
            });

            toast.success("Imagem inserida!", {
              id: toastId,
              description: `${result.fileName} enviada com sucesso.`,
            });
          } catch (error: any) {
            console.error('Erro ao fazer upload da imagem colada:', error);
            toast.error("Erro ao inserir imagem", {
              id: toastId,
              description: error.message || 'Tente novamente',
            });
          }
        }
      }
    };

    const handleDrop = async (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.type.startsWith('image/')) {
          event.preventDefault();

          const toastId = toast.loading("Enviando imagem...");

          try {
            const result = await uploadImage({
              file,
              context: context || 'arquivo_reuniao',
              entityId,
            });

            editor.update(() => {
              const imageNode = $createImageNode({
                src: result.url,
                altText: result.fileName,
                maxWidth: 800,
              });
              
              const selection = editor.getEditorState()._selection;
              if (selection) {
                selection.insertNodes([imageNode]);
              }
            });

            toast.success("Imagem inserida!", {
              id: toastId,
              description: `${result.fileName} enviada com sucesso.`,
            });
          } catch (error: any) {
            console.error('Erro ao fazer upload da imagem arrastada:', error);
            toast.error("Erro ao inserir imagem", {
              id: toastId,
              description: error.message || 'Tente novamente',
            });
          }
        }
      }
    };

    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste as EventListener);
      editorElement.addEventListener('drop', handleDrop as EventListener);
      editorElement.addEventListener('dragover', (e) => e.preventDefault());

      return () => {
        editorElement.removeEventListener('paste', handlePaste as EventListener);
        editorElement.removeEventListener('drop', handleDrop as EventListener);
        editorElement.removeEventListener('dragover', (e) => e.preventDefault());
      };
    }
  }, [editor, context, entityId]);

  return null;
}
