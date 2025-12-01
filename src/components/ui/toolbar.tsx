import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, Underline, List, ListOrdered, Pin, Palette, Link2, Undo2, Redo2, Image } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  visible: boolean;
  position: { x: number; y: number };
  onFormat: (format: string) => void;
  onFixarIndice: () => void;
  onColorChange: (color: string) => void;
  onLinkInsert: () => void;
  onImageUpload?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  activeFormats: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
}

interface ToolbarButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
}

const ToolbarButton = ({ icon: Icon, isActive, onClick, tooltip }: ToolbarButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "p-2 rounded-md transition-all duration-200 hover:bg-accent",
          isActive && "bg-primary/10 text-primary"
        )}
        aria-label={tooltip}
      >
        <Icon className="w-4 h-4" />
      </button>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap z-50 border"
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const COLORS = [
  { name: 'Padrão', value: '' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
];

export function Toolbar({ 
  visible, 
  position, 
  onFormat, 
  onFixarIndice, 
  onColorChange, 
  onLinkInsert,
  onImageUpload,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  activeFormats 
}: ToolbarProps) {
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="fixed z-50 bg-card border border-border rounded-lg shadow-elegant p-1 flex items-center gap-1 max-w-[90vw] md:max-w-none overflow-x-auto"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          {/* Undo/Redo */}
          {onUndo && (
            <ToolbarButton
              label="Desfazer"
              icon={Undo2}
              isActive={false}
              onClick={onUndo}
              tooltip="Desfazer (Ctrl+Z)"
            />
          )}
          
          {onRedo && (
            <ToolbarButton
              label="Refazer"
              icon={Redo2}
              isActive={false}
              onClick={onRedo}
              tooltip="Refazer (Ctrl+Y)"
            />
          )}
          
          {(onUndo || onRedo) && (
            <div className="w-px h-6 bg-border mx-1" />
          )}
          
          <ToolbarButton
            label="Negrito"
            icon={Bold}
            isActive={activeFormats.bold}
            onClick={() => onFormat('bold')}
            tooltip="Negrito (Ctrl+B)"
          />
          
          <ToolbarButton
            label="Itálico"
            icon={Italic}
            isActive={activeFormats.italic}
            onClick={() => onFormat('italic')}
            tooltip="Itálico (Ctrl+I)"
          />
          
          <ToolbarButton
            label="Sublinhado"
            icon={Underline}
            isActive={activeFormats.underline}
            onClick={() => onFormat('underline')}
            tooltip="Sublinhado (Ctrl+U)"
          />
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-md transition-all duration-200 hover:bg-accent"
                aria-label="Cor do texto"
              >
                <Palette className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 pointer-events-auto">
              <div className="grid grid-cols-4 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color.value || 'default'}
                    type="button"
                    className={cn(
                      "h-8 rounded border-2 transition-all hover:scale-110",
                      !color.value && "bg-gradient-to-br from-background to-muted"
                    )}
                    style={color.value ? { backgroundColor: color.value } : {}}
                    onClick={() => {
                      onColorChange(color.value);
                      setColorPopoverOpen(false);
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <ToolbarButton
            label="Link"
            icon={Link2}
            isActive={false}
            onClick={onLinkInsert}
            tooltip="Inserir link"
          />
          
          {onImageUpload && (
            <ToolbarButton
              label="Imagem"
              icon={Image}
              isActive={false}
              onClick={onImageUpload}
              tooltip="Inserir imagem"
            />
          )}
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <ToolbarButton
            label="Lista"
            icon={List}
            isActive={false}
            onClick={() => onFormat('bullet')}
            tooltip="Lista com marcadores"
          />
          
          <ToolbarButton
            label="Lista Numerada"
            icon={ListOrdered}
            isActive={false}
            onClick={() => onFormat('number')}
            tooltip="Lista numerada"
          />
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <ToolbarButton
            label="Fixar no Índice"
            icon={Pin}
            isActive={false}
            onClick={onFixarIndice}
            tooltip="Fixar como título no índice"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
