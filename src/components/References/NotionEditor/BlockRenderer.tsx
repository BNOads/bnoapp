import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  Image, 
  Video, 
  Link2, 
  CheckSquare, 
  Minus, 
  Upload,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Grip
} from "lucide-react";
import { BlockComponentProps, EditorBlock } from "./types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const BlockRenderer = ({ 
  block, 
  onChange, 
  onDelete, 
  onAddBlock, 
  onMoveUp, 
  onMoveDown,
  readOnly = false,
  isFirst = false,
  isLast = false
}: BlockComponentProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
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

      onChange({
        ...block,
        content: {
          ...block.content,
          url: publicUrl,
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      });

      toast({
        title: "Upload realizado",
        description: "Arquivo enviado com sucesso!",
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', block.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const blockTypes = [
    { type: 'text' as const, icon: Type, label: 'Texto' },
    { type: 'heading' as const, icon: Heading1, label: 'Título' },
    { type: 'image' as const, icon: Image, label: 'Imagem' },
    { type: 'video' as const, icon: Video, label: 'Vídeo' },
    { type: 'link' as const, icon: Link2, label: 'Link' },
    { type: 'checklist' as const, icon: CheckSquare, label: 'Checklist' },
    { type: 'divider' as const, icon: Minus, label: 'Divisor' },
  ];

  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        if (readOnly && !block.content.text?.trim()) {
          return <div className="min-h-[20px]" />; // Show minimal space instead of hiding completely
        }
        return (
          <Textarea
            value={block.content.text || ''}
            onChange={(e) => onChange({
              ...block,
              content: { ...block.content, text: e.target.value }
            })}
            placeholder={readOnly ? "" : "Digite seu texto..."}
            className="border-none resize-none min-h-[40px] p-0 text-base leading-relaxed focus:ring-0"
            readOnly={readOnly}
          />
        );

      case 'heading':
        if (readOnly && !block.content.text?.trim()) {
          return <div className="min-h-[30px]" />; // Show minimal space for empty headings
        }
        
        const HeadingComponent = block.content.level === 1 ? 'h1' : 
                                block.content.level === 2 ? 'h2' : 'h3';
        const HeadingIcon = block.content.level === 1 ? Heading1 : 
                           block.content.level === 2 ? Heading2 : Heading3;
        
        if (readOnly && block.content.text?.trim()) {
          // In read-only mode with content, render as actual heading
          const Component = HeadingComponent as any;
          return (
            <Component className={`font-bold ${
              block.content.level === 1 ? 'text-3xl' :
              block.content.level === 2 ? 'text-2xl' : 'text-xl'
            }`}>
              {block.content.text}
            </Component>
          );
        }
        
        return (
          <div className="flex items-center gap-2">
            {!readOnly && (
              <HeadingIcon className="w-5 h-5 text-muted-foreground" />
            )}
            <Input
              value={block.content.text || ''}
              onChange={(e) => onChange({
                ...block,
                content: { ...block.content, text: e.target.value }
              })}
              placeholder={readOnly ? "" : "Título"}
              className={`border-none p-0 font-bold focus:ring-0 ${
                block.content.level === 1 ? 'text-3xl' :
                block.content.level === 2 ? 'text-2xl' : 'text-xl'
              }`}
              readOnly={readOnly}
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {block.content.url ? (
              <div className="relative group">
                <img 
                  src={block.content.url} 
                  alt={block.content.caption || 'Imagem'}
                  className="w-full max-w-2xl rounded-lg shadow-sm"
                />
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onChange({
                      ...block,
                      content: { ...block.content, url: '', filename: '', fileSize: 0 }
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : !readOnly && (
              <div 
                className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span>Clique para adicionar uma imagem</span>
                    <span className="text-sm text-muted-foreground">JPG, PNG, WEBP até 200MB</span>
                  </div>
                )}
              </div>
            )}
            
            {(block.content.url || !readOnly) && (
              <Input
                value={block.content.caption || ''}
                onChange={(e) => onChange({
                  ...block,
                  content: { ...block.content, caption: e.target.value }
                })}
                placeholder={readOnly ? "" : "Adicione uma legenda..."}
                className="border-none p-0 text-sm text-muted-foreground focus:ring-0"
                readOnly={readOnly}
              />
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            {block.content.url ? (
              <div className="relative group">
                <video 
                  src={block.content.url} 
                  controls
                  className="w-full max-w-2xl rounded-lg shadow-sm"
                >
                  Seu navegador não suporta vídeos.
                </video>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onChange({
                      ...block,
                      content: { ...block.content, url: '', filename: '', fileSize: 0 }
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : !readOnly && (
              <div 
                className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span>Clique para adicionar um vídeo</span>
                    <span className="text-sm text-muted-foreground">MP4, MOV, WEBM até 200MB</span>
                  </div>
                )}
              </div>
            )}
            
            {(block.content.url || !readOnly) && (
              <Input
                value={block.content.caption || ''}
                onChange={(e) => onChange({
                  ...block,
                  content: { ...block.content, caption: e.target.value }
                })}
                placeholder={readOnly ? "" : "Adicione uma legenda..."}
                className="border-none p-0 text-sm text-muted-foreground focus:ring-0"
                readOnly={readOnly}
              />
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/mov,video/webm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        );

      case 'link':
        if (readOnly && !block.content.url?.trim()) {
          return <div className="min-h-[20px]" />; // Show space for empty links
        }
        
        return (
          <div className="space-y-2">
            {!readOnly && (
              <>
                <Input
                  value={block.content.url || ''}
                  onChange={(e) => onChange({
                    ...block,
                    content: { ...block.content, url: e.target.value }
                  })}
                  placeholder="Cole ou digite um link..."
                  className="border-none p-0 focus:ring-0"
                  readOnly={readOnly}
                />
                <Input
                  value={block.content.title || ''}
                  onChange={(e) => onChange({
                    ...block,
                    content: { ...block.content, title: e.target.value }
                  })}
                  placeholder="Título do link (opcional)"
                  className="border-none p-0 text-sm focus:ring-0"
                  readOnly={readOnly}
                />
              </>
            )}
            {block.content.url && (
              <a 
                href={block.content.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
              >
                <Link2 className="w-4 h-4" />
                {block.content.title || block.content.url}
              </a>
            )}
          </div>
        );

      case 'checklist':
        if (readOnly && !block.content.text?.trim()) {
          return <div className="min-h-[20px]" />; // Show space for empty checklists
        }
        
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={block.content.checked || false}
              onCheckedChange={(checked) => onChange({
                ...block,
                content: { ...block.content, checked: !!checked }
              })}
              disabled={readOnly}
            />
            {readOnly && block.content.text?.trim() ? (
              <span className={`text-sm ${
                block.content.checked ? 'line-through text-muted-foreground' : ''
              }`}>
                {block.content.text}
              </span>
            ) : !readOnly && (
              <Input
                value={block.content.text || ''}
                onChange={(e) => onChange({
                  ...block,
                  content: { ...block.content, text: e.target.value }
                })}
                placeholder="Lista de tarefas"
                className={`border-none p-0 focus:ring-0 ${
                  block.content.checked ? 'line-through text-muted-foreground' : ''
                }`}
                readOnly={readOnly}
              />
            )}
          </div>
        );

      case 'divider':
        return (
          <div className="py-4">
            <hr className="border-muted" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className={`group relative py-2 ${isDragging ? 'opacity-50' : ''}`}
      draggable={!readOnly}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Controls */}
      {!readOnly && (
        <div className="absolute left-0 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -ml-12">
          <Button
            size="sm"
            variant="ghost"
            className="w-6 h-6 p-0 cursor-grab active:cursor-grabbing"
          >
            <Grip className="w-3 h-3" />
          </Button>
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="w-6 h-6 p-0"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus className="w-3 h-3" />
            </Button>
            
            {showAddMenu && (
              <div className="absolute top-8 left-0 bg-background border rounded-lg shadow-lg p-2 z-10 min-w-40">
                {blockTypes.map(({ type, icon: Icon, label }) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start gap-2 h-8"
                    onClick={() => {
                      onAddBlock(type);
                      setShowAddMenu(false);
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block Content */}
      <div className="ml-0">
        {renderBlockContent()}
      </div>

      {/* Move/Delete Controls */}
      {!readOnly && (
        <div className="absolute right-0 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-12">
          {!isFirst && (
            <Button
              size="sm"
              variant="ghost"
              className="w-6 h-6 p-0"
              onClick={onMoveUp}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
          )}
          {!isLast && (
            <Button
              size="sm"
              variant="ghost"
              className="w-6 h-6 p-0"
              onClick={onMoveDown}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="w-6 h-6 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};