import { useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadImage, showUploadError } from '@/lib/imageUpload';
import { toast } from 'sonner';

interface ImageUploadButtonProps {
  editor: Editor | null;
  context?: string;
  entityId?: string;
  variant?: "ghost" | "default" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ImageUploadButton({
  editor,
  context,
  entityId,
  variant = "ghost",
  size = "sm",
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    setIsUploading(true);
    const toastId = toast.loading("Enviando imagem...");

    try {
      const result = await uploadImage({
        file,
        context,
        entityId,
      });

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
      console.error('Erro ao fazer upload:', error);
      toast.error("Erro ao inserir imagem", {
        id: toastId,
        description: error.message || 'Tente novamente',
      });
    } finally {
      setIsUploading(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => fileInputRef.current?.click()}
        disabled={!editor || isUploading}
        title="Inserir imagem (ou arraste/cole diretamente no editor)"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}