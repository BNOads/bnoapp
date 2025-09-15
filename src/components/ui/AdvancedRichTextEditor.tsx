import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  List, 
  CheckSquare, 
  Type,
  Image,
  Video,
  Upload,
  Expand,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdvancedRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  caption?: string;
  thumbnail?: string;
}

export function AdvancedRichTextEditor({
  content,
  onChange,
  placeholder = "Digite aqui...",
  className = "",
  showToolbar = true
}: AdvancedRichTextEditorProps) {
  const [isWYSIWYG, setIsWYSIWYG] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Convert markdown-like text to HTML for display
  const convertToHTML = (text: string) => {
    let html = text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Underline
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-foreground mb-2 mt-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-foreground mb-3 mt-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-foreground mb-3 mt-4">$1</h1>')
      // Links - make them blue
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>')
      // Auto-link URLs
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      // Checklist
      .replace(/^\[ \] (.*$)/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" class="rounded"> <span>$1</span></div>')
      .replace(/^\[x\] (.*$)/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked class="rounded"> <span class="line-through text-muted-foreground">$1</span></div>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return html;
  };

  // Convert HTML back to markdown-like text
  const convertFromHTML = (html: string) => {
    return html
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<u>(.*?)<\/u>/g, '__$1__')
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<br>/g, '\n')
      .replace(/<[^>]*>/g, ''); // Remove remaining HTML tags
  };

  const insertFormatting = (before: string, after: string = before) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertLink = () => {
    if (linkUrl.trim()) {
      const linkMarkdown = `[${linkText.trim() || linkUrl}](${linkUrl.trim()})`;
      insertText(linkMarkdown);
      setShowLinkDialog(false);
      setLinkText('');
      setLinkUrl('');
    }
  };

  const insertText = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newText = content.substring(0, start) + text + content.substring(start);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB for video, 5MB for images
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo deve ter no máximo ${file.type.startsWith('video/') ? '100MB' : '5MB'}`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const bucket = file.type.startsWith('video/') ? 'videos' : 'images';

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const mediaMarkdown = file.type.startsWith('video/') 
        ? `\n[📹 Vídeo](${publicUrl})\n`
        : `\n![Imagem](${publicUrl})\n`;
      
      insertText(mediaMarkdown);
      
      toast({
        title: "Upload concluído",
        description: "Mídia adicionada com sucesso"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload do arquivo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const transformToHeading = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const lines = content.split('\n');
    
    // Find current line
    let currentPos = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      currentPos += lines[i].length + 1;
    }
    
    // Transform current line to H2
    if (lines[lineIndex] && !lines[lineIndex].startsWith('#')) {
      lines[lineIndex] = '## ' + lines[lineIndex];
      onChange(lines.join('\n'));
    }
  };

  return (
    <div className={`border rounded-lg ${className}`}>
      {showToolbar && (
        <div className="border-b p-2 flex items-center gap-1 flex-wrap">
          {/* Mode Toggle */}
          <div className="flex rounded border mr-2">
            <Button
              variant={isWYSIWYG ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsWYSIWYG(true)}
              className="h-7 px-2 text-xs rounded-r-none"
            >
              Visual
            </Button>
            <Button
              variant={!isWYSIWYG ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsWYSIWYG(false)}
              className="h-7 px-2 text-xs rounded-l-none"
            >
              Markdown
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Formatting */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('**')}
            className="h-7 w-7 p-0"
            title="Negrito"
          >
            <Bold className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('*')}
            className="h-7 w-7 p-0"
            title="Itálico"
          >
            <Italic className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('__')}
            className="h-7 w-7 p-0"
            title="Sublinhado"
          >
            <Underline className="h-3 w-3" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Headings and Structure */}
          <Button
            variant="ghost"
            size="sm"
            onClick={transformToHeading}
            className="h-7 px-2 text-xs"
            title="Transformar em Título"
          >
            <Type className="h-3 w-3 mr-1" />
            H2
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('\n• ')}
            className="h-7 w-7 p-0"
            title="Lista"
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('\n[ ] ')}
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
            title="Link"
          >
            <Link className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 w-7 p-0"
            title="Upload Imagem"
            disabled={isUploading}
          >
            <Image className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 w-7 p-0"
            title="Upload Vídeo"
            disabled={isUploading}
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

      <div className="p-3">
        {isWYSIWYG ? (
          <div
            className="min-h-[120px] prose prose-sm max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: convertToHTML(content) || `<p class="text-muted-foreground">${placeholder}</p>` }}
            onClick={() => textareaRef.current?.focus()}
          />
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[120px] border-none p-0 resize-none focus-visible:ring-0 font-mono text-sm"
          />
        )}
      </div>

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
              <Label htmlFor="link-text">Texto do Link</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Texto que aparecerá"
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
    </div>
  );
}