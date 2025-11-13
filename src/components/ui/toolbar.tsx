import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, Underline, List, ListOrdered, Pin } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  visible: boolean;
  position: { x: number; y: number };
  onFormat: (format: string) => void;
  onFixarIndice: () => void;
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

export function Toolbar({ visible, position, onFormat, onFixarIndice, activeFormats }: ToolbarProps) {
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
