import React, { useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  List, 
  CheckSquare, 
  Type,
  Image as ImageIcon,
  Video,
  Upload,
  Expand,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WYSIWYGEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
  onTitleExtracted?: (titles: string[]) => void;
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export function WYSIWYGEditor({
  content,
  onChange,
  placeholder = "Digite aqui...",
  className = "",
  showToolbar = true,
  onTitleExtracted
}: WYSIWYGEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState<MediaItem | null>(null);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-xs rounded-lg cursor-pointer hover:opacity-80 transition-opacity',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start gap-2 my-1',
        },
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      onChange(newContent);
      
      // Extract H2 titles for table of contents
      if (onTitleExtracted) {
        const doc = editor.getJSON();
        const titles = extractTitles(doc);
        onTitleExtracted(titles);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 text-sm leading-relaxed',
      },
    },
  });

  const extractTitles = (doc: any): string[] => {
    const titles: string[] = [];
    
    if (doc.content) {
      doc.content.forEach((node: any) => {
        if (node.type === 'heading' && node.attrs?.level === 2) {
          const title = node.content?.map((c: any) => c.text).join('') || '';
          if (title.trim()) {
            titles.push(title.trim());
          }
        }
      });
    }
    
    return titles;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-pauta-media', {
        body: formData,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload do arquivo",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    const uploadResult = await uploadFile(file);
    if (!uploadResult) return;

    if (uploadResult.isVideo) {
      // Insert video as HTML element
      const videoHtml = `<video controls class="max-w-md rounded-lg my-4">
        <source src="${uploadResult.url}" type="${uploadResult.fileType}">
        Seu navegador não suporta vídeos.
      </video>`;
      editor.commands.insertContent(videoHtml);
    } else {
      // Insert image
      editor.commands.setImage({ 
        src: uploadResult.url,
        alt: uploadResult.fileName
      });
    }

    toast({
      title: "Upload concluído",
      description: "Mídia adicionada com sucesso"
    });

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;

    if (linkText.trim()) {
      // Insert new link with text
      editor.commands.insertContent(`<a href="${linkUrl.trim()}" class="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors">${linkText.trim()}</a>`);
    } else {
      // Set link on selected text
      editor.commands.setLink({ href: linkUrl.trim() });
    }

    setShowLinkDialog(false);
    setLinkText('');
    setLinkUrl('');
  }, [editor, linkText, linkUrl]);

  const insertEmbed = useCallback(() => {
    if (!editor || !embedUrl.trim()) return;

    let embedHtml = '';
    const url = embedUrl.trim();

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop()?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      
      if (videoId) {
        embedHtml = `<div class="aspect-video my-4">
          <iframe 
            src="https://www.youtube.com/embed/${videoId}" 
            class="w-full h-full rounded-lg"
            frameborder="0" 
            allowfullscreen>
          </iframe>
        </div>`;
      }
    }
    // Vimeo
    else if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      if (videoId) {
        embedHtml = `<div class="aspect-video my-4">
          <iframe 
            src="https://player.vimeo.com/video/${videoId}" 
            class="w-full h-full rounded-lg"
            frameborder="0" 
            allowfullscreen>
          </iframe>
        </div>`;
      }
    }
    // Loom
    else if (url.includes('loom.com')) {
      embedHtml = `<div class="aspect-video my-4">
        <iframe 
          src="${url.replace('/share/', '/embed/')}" 
          class="w-full h-full rounded-lg"
          frameborder="0" 
          allowfullscreen>
        </iframe>
      </div>`;
    }
    // Google Drive
    else if (url.includes('drive.google.com')) {
      embedHtml = `<div class="my-4">
        <iframe 
          src="${url.replace('/view', '/preview')}" 
          class="w-full h-96 rounded-lg border"
          frameborder="0">
        </iframe>
      </div>`;
    }
    
    if (embedHtml) {
      editor.commands.insertContent(embedHtml);
      toast({
        title: "Embed inserido",
        description: "Conteúdo externo adicionado com sucesso"
      });
    } else {
      toast({
        title: "URL não suportada",
        description: "Verifique se é um link válido do YouTube, Vimeo, Loom ou Google Drive",
        variant: "destructive"
      });
    }

    setShowEmbedDialog(false);
    setEmbedUrl('');
  }, [editor, embedUrl, toast]);

  const transformToHeading = useCallback(() => {
    if (!editor) return;
    editor.commands.toggleHeading({ level: 2 });
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      {showToolbar && (
        <div className="border-b p-2 flex items-center gap-1 flex-wrap bg-muted/30">
          {/* Text formatting */}
          <Button
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.commands.toggleBold()}
            className="h-7 w-7 p-0"
            title="Negrito (Ctrl+B)"
          >
            <Bold className="h-3 w-3" />
          </Button>
          <Button
            variant={editor.isActive('italic') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.commands.toggleItalic()}
            className="h-7 w-7 p-0"
            title="Itálico (Ctrl+I)"
          >
            <Italic className="h-3 w-3" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Headings */}
          <Button
            variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={transformToHeading}
            className="h-7 px-2 text-xs"
            title="Título (aparece no índice)"
          >
            <Type className="h-3 w-3 mr-1" />
            H2
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <Button
            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.commands.toggleBulletList()}
            className="h-7 w-7 p-0"
            title="Lista"
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            variant={editor.isActive('taskList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.commands.toggleTaskList()}
            className="h-7 w-7 p-0"
            title="Checklist"
          >
            <CheckSquare className="h-3 w-3" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Links and Media */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkDialog(true)}
            className="h-7 w-7 p-0"
            title="Adicionar Link"
          >
            <LinkIcon className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 w-7 p-0"
            title="Upload Imagem/Vídeo"
            disabled={isUploading}
          >
            <ImageIcon className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmbedDialog(true)}
            className="h-7 w-7 p-0"
            title="Embed YouTube/Vimeo/Loom"
          >
            <Video className="h-3 w-3" />
          </Button>

          {isUploading && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
              Enviando...
            </div>
          )}
        </div>
      )}

      <EditorContent 
        editor={editor} 
        onClick={(e) => {
          // Handle image clicks for preview
          const target = e.target as HTMLElement;
          if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            setShowMediaPreview({
              type: 'image',
              url: img.src,
              caption: img.alt
            });
          }
        }}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="link-text">Texto do Link (opcional)</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Deixe vazio para usar o texto selecionado"
              />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://exemplo.com"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={insertLink} disabled={!linkUrl.trim()}>
                Inserir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Embed</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="embed-url">URL do Vídeo/Documento</Label>
              <Input
                id="embed-url"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="YouTube, Vimeo, Loom ou Google Drive"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Suportado: YouTube, Vimeo, Loom e Google Drive
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEmbedDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={insertEmbed} disabled={!embedUrl.trim()}>
                Inserir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Preview Dialog */}
      <Dialog open={!!showMediaPreview} onOpenChange={() => setShowMediaPreview(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Visualizar Mídia
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMediaPreview(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {showMediaPreview && (
            <div className="max-h-[70vh] overflow-auto">
              {showMediaPreview.type === 'image' ? (
                <img 
                  src={showMediaPreview.url} 
                  alt={showMediaPreview.caption || 'Imagem'}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <video 
                  src={showMediaPreview.url} 
                  controls 
                  className="w-full rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}