import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { uploadImage, getImageFromClipboard, showUploadError } from '@/lib/imageUpload';
import { toast } from 'sonner';

interface UseImagePasteOptions {
  editor: Editor | null;
  context?: string;
  entityId?: string;
}

export function useImagePaste({ editor, context, entityId }: UseImagePasteOptions) {
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!editor) return;

      // Verificar se há imagem no clipboard
      const imageFile = getImageFromClipboard(event);
      
      if (!imageFile) return;

      // Prevenir comportamento padrão
      event.preventDefault();
      event.stopPropagation();

      const toastId = toast.loading("Enviando imagem...");

      try {
        // Inserir placeholder
        const position = editor.state.selection.from;
        
        // Upload da imagem
        const result = await uploadImage({
          file: imageFile,
          context,
          entityId,
        });

        // Remover placeholder e inserir imagem
        editor
          .chain()
          .focus()
          .setImage({ src: result.url, alt: result.fileName })
          .run();

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
    },
    [editor, context, entityId]
  );

  const handleDrop = useCallback(
    async (event: DragEvent) => {
      if (!editor) return;

      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Verificar se há imagem
      const imageFile = Array.from(files).find(file => 
        file.type.startsWith('image/')
      );

      if (!imageFile) return;

      // Prevenir comportamento padrão
      event.preventDefault();
      event.stopPropagation();

      const toastId = toast.loading("Enviando imagem...");

      try {
        // Upload da imagem
        const result = await uploadImage({
          file: imageFile,
          context,
          entityId,
        });

        // Calcular posição do drop
        const { clientX, clientY } = event;
        const pos = editor.view.posAtCoords({ left: clientX, top: clientY });

        if (pos) {
          editor
            .chain()
            .focus()
            .insertContentAt(pos.pos, {
              type: 'image',
              attrs: { src: result.url, alt: result.fileName },
            })
            .run();
        } else {
          // Fallback: inserir no final
          editor
            .chain()
            .focus()
            .setImage({ src: result.url, alt: result.fileName })
            .run();
        }

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
    },
    [editor, context, entityId]
  );

  return { handlePaste, handleDrop };
}