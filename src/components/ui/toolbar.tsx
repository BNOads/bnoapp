import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Heading,
  Link as LinkIcon,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  visible: boolean;
  position: { x: number; y: number };
  onFormat: (command: string) => void;
  onFixarIndice: () => void;
  activeFormats: Set<string>;
}

interface ToolbarButtonProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  tooltip: (label: string) => void;
  showTooltip: boolean;
  hideTooltip: () => void;
}

function ToolbarButton({ 
  label, 
  icon: Icon, 
  isActive, 
  onClick, 
  tooltip,
  showTooltip,
  hideTooltip 
}: ToolbarButtonProps) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => tooltip(label)}
        onMouseLeave={hideTooltip}
        className={cn(
          "p-2 rounded hover:bg-accent transition-colors",
          isActive && "bg-accent text-primary"
        )}
        aria-label={label}
      >
        <Icon className="w-4 h-4" />
      </button>
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded whitespace-nowrap shadow-md"
        >
          {label}
        </motion.div>
      )}
    </div>
  );
}

export function Toolbar({ 
  visible, 
  position, 
  onFormat, 
  onFixarIndice,
  activeFormats 
}: ToolbarProps) {
  const [tooltipLabel, setTooltipLabel] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltip = (label: string) => {
    setTooltipLabel(label);
    setShowTooltip(true);
  };

  const hideTooltip = () => {
    setShowTooltip(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 1000,
          }}
          className="flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1 overflow-x-auto"
        >
          <ToolbarButton
            label="Negrito"
            icon={Bold}
            isActive={activeFormats.has('bold')}
            onClick={() => onFormat('bold')}
            tooltip={tooltip}
            showTooltip={showTooltip && tooltipLabel === 'Negrito'}
            hideTooltip={hideTooltip}
          />
          
          <ToolbarButton
            label="Itálico"
            icon={Italic}
            isActive={activeFormats.has('italic')}
            onClick={() => onFormat('italic')}
            tooltip={tooltip}
            showTooltip={showTooltip && tooltipLabel === 'Itálico'}
            hideTooltip={hideTooltip}
          />
          
          <ToolbarButton
            label="Sublinhado"
            icon={Underline}
            isActive={activeFormats.has('underline')}
            onClick={() => onFormat('underline')}
            tooltip={tooltip}
            showTooltip={showTooltip && tooltipLabel === 'Sublinhado'}
            hideTooltip={hideTooltip}
          />
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <ToolbarButton
            label="Lista"
            icon={List}
            isActive={activeFormats.has('bullet')}
            onClick={() => onFormat('bullet')}
            tooltip={tooltip}
            showTooltip={showTooltip && tooltipLabel === 'Lista'}
            hideTooltip={hideTooltip}
          />
          
          <ToolbarButton
            label="Lista Numerada"
            icon={ListOrdered}
            isActive={activeFormats.has('number')}
            onClick={() => onFormat('number')}
            tooltip={tooltip}
            showTooltip={showTooltip && tooltipLabel === 'Lista Numerada'}
            hideTooltip={hideTooltip}
          />
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <ToolbarButton
            label="Fixar no Índice"
            icon={Heading}
            isActive={false}
            onClick={onFixarIndice}
            tooltip={tooltip}
            showTooltip={showTooltip && tooltipLabel === 'Fixar no Índice'}
            hideTooltip={hideTooltip}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
