import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Type } from "lucide-react";
import { NotionEditorProps, EditorBlock } from "./types";
import { BlockRenderer } from "./BlockRenderer";

export const NotionEditor = ({ 
  blocks, 
  onChange, 
  readOnly = false, 
  className = "" 
}: NotionEditorProps) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const createNewBlock = useCallback((type: EditorBlock['type'], order?: number) => {
    const newBlock: EditorBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      type,
      content: type === 'heading' ? { level: 1 } : {},
      order: order ?? blocks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedBlocks = [...blocks];
    if (order !== undefined) {
      updatedBlocks.splice(order, 0, newBlock);
      // Reordenar blocos subsequentes
      updatedBlocks.forEach((block, index) => {
        block.order = index;
      });
    } else {
      updatedBlocks.push(newBlock);
    }

    onChange(updatedBlocks);
    return newBlock.id;
  }, [blocks, onChange]);

  const updateBlock = useCallback((blockId: string, updatedBlock: EditorBlock) => {
    const updatedBlocks = blocks.map(block => 
      block.id === blockId 
        ? { ...updatedBlock, updated_at: new Date().toISOString() }
        : block
    );
    onChange(updatedBlocks);
  }, [blocks, onChange]);

  const deleteBlock = useCallback((blockId: string) => {
    const updatedBlocks = blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({ ...block, order: index }));
    onChange(updatedBlocks);
  }, [blocks, onChange]);

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const blockIndex = blocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;

    const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const updatedBlocks = [...blocks];
    [updatedBlocks[blockIndex], updatedBlocks[newIndex]] = 
    [updatedBlocks[newIndex], updatedBlocks[blockIndex]];

    // Atualizar ordem
    updatedBlocks.forEach((block, index) => {
      block.order = index;
    });

    onChange(updatedBlocks);
  }, [blocks, onChange]);

  const addBlockAfter = useCallback((afterBlockId: string, type: EditorBlock['type']) => {
    const blockIndex = blocks.findIndex(block => block.id === afterBlockId);
    if (blockIndex === -1) return;

    createNewBlock(type, blockIndex + 1);
  }, [blocks, createNewBlock]);

  // Ordenar blocos por ordem
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  // Keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Slash command para mostrar menu
      if (e.key === '/' && activeBlockId) {
        e.preventDefault();
        setShowSlashMenu(true);
        // Capturar posição do cursor seria ideal aqui
      }

      // ESC para fechar menu
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, activeBlockId]);

  if (readOnly && blocks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum conteúdo disponível.
      </div>
    );
  }

  return (
    <div className={`notion-editor space-y-1 ${className}`}>
      {/* Blocos */}
      {sortedBlocks.map((block, index) => (
        <BlockRenderer
          key={block.id}
          block={block}
          onChange={(updatedBlock) => updateBlock(block.id, updatedBlock)}
          onDelete={() => deleteBlock(block.id)}
          onAddBlock={(type) => addBlockAfter(block.id, type)}
          onMoveUp={() => moveBlock(block.id, 'up')}
          onMoveDown={() => moveBlock(block.id, 'down')}
          readOnly={readOnly}
          isFirst={index === 0}
          isLast={index === sortedBlocks.length - 1}
        />
      ))}

      {/* Adicionar primeiro bloco ou botão de adicionar */}
      {!readOnly && (
        <div className="py-4">
          {blocks.length === 0 ? (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => createNewBlock('text')}
            >
              <Type className="w-4 h-4 mr-2" />
              Digite '/' para comandos ou comece escrevendo...
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-60 hover:opacity-100"
              onClick={() => createNewBlock('text')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar bloco
            </Button>
          )}
        </div>
      )}

      {/* Menu de slash commands */}
      {showSlashMenu && (
        <div 
          className="fixed bg-background border rounded-lg shadow-lg p-2 z-50 min-w-40"
          style={{ 
            left: slashMenuPosition.x, 
            top: slashMenuPosition.y 
          }}
        >
          {/* Implementar menu de comandos aqui */}
        </div>
      )}
    </div>
  );
};