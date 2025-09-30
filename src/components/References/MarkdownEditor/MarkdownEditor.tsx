import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Image } from '@tiptap/extension-image';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  Heading3,
  List, 
  ListOrdered,
  CheckSquare, 
  Link as LinkIcon,
  Quote,
  Code,
  Image as ImageIcon,
  Video,
  Upload,
  X,
  ZoomIn,
  Play,
  Maximize,
  Undo,
  Redo,
  FileText,
  Eye,
  Save
} from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  autoSave?: boolean;
  className?: string;
  visualOnly?: boolean;
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  title?: string;
}

const MediaModal = ({ isOpen, onClose, mediaUrl, mediaType, title }: MediaModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {mediaType === 'image' ? <ImageIcon className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            {title || (mediaType === 'image' ? 'Visualizar Imagem' : 'Visualizar Vídeo')}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 pt-0">
          {mediaType === 'image' ? (
            <img 
              src={mediaUrl} 
              alt={title || 'Imagem'}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            />
          ) : (
            <video 
              src={mediaUrl} 
              controls
              className="w-full h-auto max-h-[70vh] rounded-lg"
            >
              Seu navegador não suporta vídeos.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const MarkdownEditor = ({ 
  content, 
  onChange, 
  onSave,
  autoSave = true,
  className = "",
  visualOnly = false
}: MarkdownEditorProps) => {
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [activeView, setActiveView] = useState<'wysiwyg' | 'markdown'>('wysiwyg');
  const [markdownContent, setMarkdownContent] = useState('');
  const [mediaModal, setMediaModal] = useState<{
    isOpen: boolean;
    url: string;
    type: 'image' | 'video';
    title?: string;
  }>({ isOpen: false, url: '', type: 'image' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image cursor-pointer hover:opacity-80 transition-opacity',
        },
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Auto-save com debounce de 2 segundos
      if (autoSave && onSave) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
          onSave();
        }, 2000);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4 ref-modal'
      },
      handleClickOn: (view, pos, node, nodePos, event) => {
        // Detectar clique em imagens para abrir modal
        if (node.type.name === 'image') {
          const src = node.attrs.src;
          const alt = node.attrs.alt || '';
          setMediaModal({
            isOpen: true,
            url: src,
            type: 'image',
            title: alt
          });
          return true;
        }
        return false;
      }
    }
  });

  // Converter HTML para Markdown (simplificado)
  const htmlToMarkdown = useCallback((html: string) => {
    let markdown = html;
    
    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    
    // Bold and Italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Images
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
    
    // Lists
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
    });
    
    // Blockquotes
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');
    
    // Code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Paragraphs
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    
    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    // Clean up extra newlines
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown.trim();
  }, []);

  // Converter Markdown para HTML (simplificado)
  const markdownToHtml = useCallback((markdown: string) => {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold and Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="editor-image cursor-pointer hover:opacity-80 transition-opacity" />');
    
    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^\- (.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    html = html.replace(/^\d+\. (.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    
    // Blockquotes
    html = html.replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>');
    
    // Paragraphs
    html = html.replace(/^(?!<[h|u|o|b])(.*$)/gim, '<p>$1</p>');
    
    return html;
  }, []);

  // Sincronizar conteúdo inicial quando recebido via props
  useEffect(() => {
    if (content && editor && !editor.getHTML().includes(content)) {
      // Se o conteúdo prop mudou e é diferente do editor atual
      const html = markdownToHtml(content);
      editor.commands.setContent(html);
      setMarkdownContent(content);
    }
  }, [content, editor, markdownToHtml]);

  useEffect(() => {
    if (activeView === 'markdown' && editor) {
      const html = editor.getHTML();
      setMarkdownContent(htmlToMarkdown(html));
    }
  }, [activeView, editor, htmlToMarkdown]);

  const handleViewChange = (view: 'wysiwyg' | 'markdown') => {
    if (!editor) return;
    
    if (view === 'markdown' && activeView === 'wysiwyg') {
      // Convertendo de WYSIWYG para Markdown
      const html = editor.getHTML();
      setMarkdownContent(htmlToMarkdown(html));
    } else if (view === 'wysiwyg' && activeView === 'markdown') {
      // Convertendo de Markdown para WYSIWYG
      const html = markdownToHtml(markdownContent);
      editor.commands.setContent(html);
    }
    
    setActiveView(view);
  };

  const handleMarkdownChange = (value: string) => {
    setMarkdownContent(value);
    // Auto-save markdown changes
    const html = markdownToHtml(value);
    onChange(html);
    
    if (autoSave && onSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        onSave();
      }, 2000);
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    setIsUploadingMedia(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `referencias/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('referencias-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('referencias-media')
        .getPublicUrl(filePath);

      if (editor) {
        if (type === 'image') {
          editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run();
        } else {
          // Para vídeos, inserimos um HTML customizado
          const videoHtml = `<video src="${publicUrl}" controls class="w-full rounded-lg" data-video-url="${publicUrl}" data-video-title="${file.name}"></video>`;
          editor.chain().focus().insertContent(videoHtml).run();
        }
      }

      toast({
        title: "Upload realizado",
        description: `${type === 'image' ? 'Imagem' : 'Vídeo'} enviado com sucesso!`,
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl) {
      if (linkText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`).run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      }
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl, linkText]);

  const insertVideoEmbed = () => {
    if (!editor || !videoUrl) return;
    
    let embedUrl = videoUrl;
    let videoTitle = 'Vídeo';
    
    // Converter URLs do YouTube para embed
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
      videoTitle = 'Vídeo do YouTube';
    }
    
    // Converter URLs do Vimeo para embed
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      videoTitle = 'Vídeo do Vimeo';
    }
    
    const videoHtml = `<div class="video-embed-container relative w-full rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity" data-video-url="${embedUrl}" data-video-title="${videoTitle}">
      <iframe src="${embedUrl}" frameborder="0" allowfullscreen class="w-full aspect-video"></iframe>
      <div class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <div class="bg-black/50 rounded-full p-2">
          <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
          </svg>
        </div>
      </div>
    </div>`;
    
    editor.chain().focus().insertContent(videoHtml).run();
    setShowVideoDialog(false);
    setVideoUrl('');
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return <div className="flex items-center justify-center h-40">Carregando editor...</div>;
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <style>{`
        .ref-modal a[href] {
          color: #2563EB;
          text-decoration: underline;
          cursor: pointer;
        }
        .ref-modal a[href]:hover {
          filter: brightness(0.9);
        }
      `}</style>
      
      {/* Header com Tabs - Ocultar se visualOnly */}
      {!visualOnly ? (
        <div className="border-b bg-muted/30">
          <Tabs value={activeView} onValueChange={(value) => handleViewChange(value as 'wysiwyg' | 'markdown')}>
            <div className="flex items-center justify-between p-2">
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="wysiwyg" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="markdown" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Markdown
                </TabsTrigger>
              </TabsList>
              
              {onSave && (
                <Button size="sm" onClick={onSave} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
              )}
            </div>
            
            <TabsContent value="wysiwyg" className="mt-0">
              {/* Toolbar WYSIWYG */}
              <div className="border-t bg-muted/50 p-2">
                <div className="flex flex-wrap items-center gap-1">
                  {/* Formatação básica */}
                  <Button
                    variant={editor.isActive('bold') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant={editor.isActive('italic') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={editor.isActive('underline') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Títulos */}
                  <Button
                    variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Listas */}
                  <Button
                    variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    <List className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={editor.isActive('taskList') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Citação e Código */}
                  <Button
                    variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  >
                    <Quote className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={editor.isActive('code') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleCode().run()}
                  >
                    <Code className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Mídia */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia}
                  >
                    {isUploadingMedia ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVideoDialog(true)}
                  >
                    <Video className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={editor.isActive('link') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setShowLinkDialog(true)}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Undo/Redo */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* Toolbar simplificada para modo Visual Only */
        <div className="border-b bg-muted/30 p-2">
          <div className="flex flex-wrap items-center gap-1">
            {/* Formatação básica */}
            <Button
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
            
            <Button
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Títulos */}
            <Button
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Listas */}
            <Button
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant={editor.isActive('link') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowLinkDialog(true)}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
            >
              {isUploadingMedia ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="relative">
        {(visualOnly || activeView === 'wysiwyg') ? (
          <EditorContent 
            editor={editor} 
            className="min-h-[300px] max-h-96 overflow-y-auto"
          />
        ) : (
          <Textarea
            value={markdownContent}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            className="min-h-[300px] max-h-96 border-none resize-none font-mono text-sm"
            placeholder="Digite aqui em Markdown..."
          />
        )}
      </div>

      {/* File Input for Images/Videos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/mov,video/webm,video/avi"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Verificar tamanho do arquivo baseado no tipo
            const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB para vídeos, 10MB para imagens
            
            if (file.size > maxSize) {
              toast({
                title: "Arquivo muito grande",
                description: `O arquivo deve ter no máximo ${file.type.startsWith('video/') ? '50MB' : '10MB'}.`,
                variant: "destructive"
              });
              return;
            }
            
            const isVideo = file.type.startsWith('video/');
            handleFileUpload(file, isVideo ? 'video' : 'image');
          }
        }}
      />

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                type="url"
                placeholder="https://exemplo.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setLink();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Texto do Link (opcional)</label>
              <Input
                placeholder="Texto que aparecerá no link"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={setLink} className="flex-1">
                Inserir Link
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Vídeo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">URL do Vídeo</label>
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    insertVideoEmbed();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Suporte para YouTube, Vimeo ou URLs diretas de vídeo
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={insertVideoEmbed} className="flex-1">
                Inserir Vídeo
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowVideoDialog(false);
                  setVideoUrl('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Modal */}
      <MediaModal
        isOpen={mediaModal.isOpen}
        onClose={() => setMediaModal(prev => ({ ...prev, isOpen: false }))}
        mediaUrl={mediaModal.url}
        mediaType={mediaModal.type}
        title={mediaModal.title}
      />
    </div>
  );
};