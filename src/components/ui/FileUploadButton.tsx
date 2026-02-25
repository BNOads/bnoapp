import { useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { uploadFile, showFileUploadError } from '@/lib/fileUpload';
import { toast } from 'sonner';

interface FileUploadButtonProps {
    editor: Editor | null;
    context?: string;
    entityId?: string;
    variant?: "ghost" | "default" | "outline";
    size?: "default" | "sm" | "lg" | "icon";
}

export function FileUploadButton({
    editor,
    context,
    entityId,
    variant = "ghost",
    size = "sm",
}: FileUploadButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !editor) return;

        // Limite de 1MB
        const MAX_SIZE = 1 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            toast.error("Arquivo muito grande", {
                description: "O limite máximo para anexos na descrição é de 1MB.",
            });
            // Limpar input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Enviando arquivo...");

        try {
            const result = await uploadFile({
                file,
                context,
                entityId,
            });

            // Se for imagem, use o comando de imagem. Se for arquivo, link:
            if (file.type.startsWith('image/')) {
                editor
                    .chain()
                    .focus()
                    .setImage({ src: result.url, alt: result.originalName })
                    .run();
            } else {
                editor
                    .chain()
                    .focus()
                    .insertContent(`<a href="${result.url}" target="_blank" rel="noopener noreferrer">${result.originalName}</a> `)
                    .run();
            }

            toast.success("Arquivo inserido!", {
                id: toastId,
                description: `${result.originalName} anexado com sucesso.`,
            });
        } catch (error: any) {
            console.error('Erro ao fazer upload:', error);
            toast.error("Erro ao inserir arquivo", {
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
                // accept='.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt,.csv' // opcional
                onChange={handleFileSelect}
                className="hidden"
            />
            <Button
                type="button"
                variant={variant}
                size={size}
                onClick={() => fileInputRef.current?.click()}
                disabled={!editor || isUploading}
                title="Anexar arquivo"
            >
                {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Paperclip className="h-4 w-4" />
                )}
            </Button>
        </>
    );
}
