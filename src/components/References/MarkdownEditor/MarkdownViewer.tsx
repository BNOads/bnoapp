import { useState } from "react";
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Image } from '@tiptap/extension-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZoomIn, Video } from "lucide-react";

interface MarkdownViewerProps {
  content: string;
  className?: string;
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
            {mediaType === 'image' ? <ZoomIn className="w-5 h-5" /> : <Video className="w-5 h-5" />}
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

export const MarkdownViewer = ({ content, className = "" }: MarkdownViewerProps) => {
  const [mediaModal, setMediaModal] = useState<{
    isOpen: boolean;
    url: string;
    type: 'image' | 'video';
    title?: string;
  }>({ isOpen: false, url: '', type: 'image' });

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
        openOnClick: true,
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
          class: 'editor-image cursor-pointer hover:opacity-80 transition-opacity max-w-full h-auto rounded-lg',
        },
      })
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none'
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
        
        // Detectar clique em vídeos para abrir modal
        const target = event.target as HTMLElement;
        if (target.tagName === 'VIDEO' || target.closest('video')) {
          const video = target.tagName === 'VIDEO' ? target as HTMLVideoElement : target.closest('video') as HTMLVideoElement;
          if (video) {
            const src = video.src;
            const title = video.getAttribute('data-video-title') || 'Vídeo';
            setMediaModal({
              isOpen: true,
              url: src,
              type: 'video',
              title
            });
            return true;
          }
        }
        
        return false;
      }
    }
  });

  if (!editor) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div className={className}>
      <EditorContent editor={editor} />
      
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