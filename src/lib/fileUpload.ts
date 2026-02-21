import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadFileOptions {
    file: File | Blob;
    context?: string;
    entityId?: string;
    onProgress?: (progress: number) => void;
}

interface UploadFileResult {
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    originalName: string;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'text/plain',
    'text/csv',
    // Arquivos compactados
    'application/zip',
    'application/x-rar-compressed',
    'application/x-zip-compressed',
    'multipart/x-zip'
];

export async function uploadFile({
    file,
    context,
    entityId,
    onProgress,
}: UploadFileOptions): Promise<UploadFileResult> {
    // Validações client-side
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
        console.warn(`Tipo de arquivo não reconhecido ou não permitido estritamente (${file.type}). Continuando por conta e risco.`);
    }

    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        throw new Error(`Arquivo muito grande (${sizeMB}MB). Máximo: 15MB`);
    }

    try {
        // Obter usuário autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('❌ Usuário não autenticado:', userError);
            throw new Error('Usuário não autenticado. Faça login para fazer upload de arquivos.');
        }

        if (onProgress) onProgress(20);

        // Gerar nome único para o arquivo conservando a extensão original
        const originalName = file instanceof File ? file.name : 'arquivo';
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extensionParts = originalName.split('.');
        const extension = extensionParts.length > 1 ? extensionParts.pop() : 'bin';

        // Limpar o nome do arquivo para URL
        const cleanName = extensionParts.join('.').replace(/[^a-zA-Z0-9-_\.]/g, '-');
        const fileName = `${timestamp}-${randomString}-${cleanName}.${extension}`;

        // Construir caminho: {userId}/{context}/{entityId}/{yyyy}/{mm}/{fileName}
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');

        const filePath = entityId
            ? `${user.id}/${context || 'general'}/${entityId}/${yyyy}/${mm}/${fileName}`
            : `${user.id}/${context || 'general'}/${yyyy}/${mm}/${fileName}`;

        console.log('📤 Fazendo upload de arquivo direto para Storage:', {
            bucket: 'richtext-uploads',
            path: filePath,
            fileType: file.type,
            fileSize: `${(file.size / 1024).toFixed(2)}KB`
        });

        if (onProgress) onProgress(40);

        // Upload direto para o Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('richtext-uploads')
            .upload(filePath, file, {
                contentType: file.type || 'application/octet-stream',
                cacheControl: '31536000', // 1 ano
                upsert: false,
            });

        if (uploadError) {
            console.error('❌ Erro no upload do arquivo:', uploadError);
            throw new Error(uploadError.message || 'Erro ao fazer upload do arquivo');
        }

        if (onProgress) onProgress(80);

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('richtext-uploads')
            .getPublicUrl(filePath);

        if (onProgress) onProgress(100);

        console.log('✅ Upload concluído com sucesso:', {
            url: publicUrl,
            fileName,
            originalName,
            fileSize: file.size
        });

        return {
            url: publicUrl,
            fileName,
            originalName,
            fileSize: file.size,
            fileType: file.type,
        };
    } catch (error: any) {
        console.error('❌ Erro ao fazer upload de arquivo:', {
            message: error.message,
            stack: error.stack,
            error
        });

        throw new Error(error.message || 'Erro ao fazer upload do arquivo');
    }
}

/**
 * Exibe toast de erro amigável para upload
 */
export function showFileUploadError(error: any) {
    const message = error.message || 'Erro ao fazer upload do arquivo';

    toast.error("Erro no upload", {
        description: message,
        action: {
            label: "Tentar novamente",
            onClick: () => { },
        },
    });
}
