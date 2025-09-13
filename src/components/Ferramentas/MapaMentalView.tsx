import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, Trash2, Edit, Brain, Share2, Link2, Square, Circle, Triangle, StickyNote, Mouse } from "lucide-react";
import { toast } from "sonner";

interface MapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  type: 'text' | 'shape';
  shapeType?: 'circle' | 'rectangle' | 'triangle';
  link?: string;
  width?: number;
  height?: number;
}

interface MapNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  link?: string;
}

interface MapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromType?: 'node' | 'note';
  toType?: 'node' | 'note';
}

interface MapaMental {
  id: string;
  titulo: string;
  dados_mapa: {
    nodes: MapNode[];
    connections: MapConnection[];
    notes: MapNote[];
  };
  created_at: string;
  updated_at: string;
  publico?: boolean;
  link_publico?: string;
  compartilhado_em?: string;
}

interface MapaMentalDB {
  id: string;
  titulo: string;
  dados_mapa: any;
  created_at: string;
  updated_at: string;
  user_id: string;
  publico?: boolean;
  link_publico?: string;
  compartilhado_em?: string;
}

type Tool = 'select' | 'node' | 'note' | 'connection' | 'circle' | 'rectangle' | 'triangle';

export const MapaMentalView = () => {
  const { user } = useAuth();
  const [mapas, setMapas] = useState<MapaMental[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMapa, setCurrentMapa] = useState<MapaMental | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [nodeText, setNodeText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [connectionStart, setConnectionStart] = useState<{id: string, type: 'node' | 'note'} | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMapas();
  }, [user]);

  const fetchMapas = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('mapas_mentais')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const mappedData = (data || []).map((item: MapaMentalDB) => {
        const dadosMapa = item.dados_mapa as any;
        return {
          ...item,
          dados_mapa: {
            nodes: dadosMapa?.nodes || [],
            connections: dadosMapa?.connections || [],
            notes: dadosMapa?.notes || []
          }
        };
      });
      setMapas(mappedData);
    } catch (error) {
      console.error('Erro ao buscar mapas mentais:', error);
      toast.error('Erro ao carregar mapas mentais');
    } finally {
      setLoading(false);
    }
  };

  const createNewMapa = async () => {
    if (!user || !titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mapas_mentais')
        .insert({
          user_id: user.id,
          titulo: titulo.trim(),
          dados_mapa: {
            nodes: [{
              id: 'central',
              text: 'Ideia Central',
              x: 375,
              y: 250,
              color: '#3b82f6',
              type: 'text'
            }],
            connections: [],
            notes: []
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      
      const mappedData = {
        ...data,
        dados_mapa: {
          nodes: (data.dados_mapa as any)?.nodes || [],
          connections: (data.dados_mapa as any)?.connections || [],
          notes: (data.dados_mapa as any)?.notes || []
        }
      };
      setCurrentMapa(mappedData);
      setTitulo("");
      setIsDialogOpen(false);
      toast.success('Mapa mental criado com sucesso');
      await fetchMapas();
    } catch (error) {
      console.error('Erro ao criar mapa mental:', error);
      toast.error('Erro ao criar mapa mental');
    }
  };

  const saveMapa = async () => {
    if (!currentMapa) return;

    try {
      const { error } = await supabase
        .from('mapas_mentais')
        .update({
          dados_mapa: currentMapa.dados_mapa as any
        })
        .eq('id', currentMapa.id);

      if (error) throw error;
      toast.success('Mapa mental salvo com sucesso');
      await fetchMapas();
    } catch (error) {
      console.error('Erro ao salvar mapa mental:', error);
      toast.error('Erro ao salvar mapa mental');
    }
  };

  const shareMap = async () => {
    if (!currentMapa) return;

    try {
      const { data, error } = await supabase
        .from('mapas_mentais')
        .update({ publico: true })
        .eq('id', currentMapa.id)
        .select()
        .single();

      if (error) throw error;

      const mappedData = {
        ...data,
        dados_mapa: {
          nodes: (data.dados_mapa as any)?.nodes || [],
          connections: (data.dados_mapa as any)?.connections || [],
          notes: (data.dados_mapa as any)?.notes || []
        }
      };
      
      setCurrentMapa(mappedData);
      const publicUrl = `${window.location.origin}/mapa-mental/publico/${currentMapa.id}`;
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link público copiado para a área de transferência!');
      setShareDialogOpen(false);
      await fetchMapas();
    } catch (error) {
      console.error('Erro ao compartilhar mapa:', error);
      toast.error('Erro ao compartilhar mapa mental');
    }
  };

  const deleteMapa = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mapa mental?')) return;

    try {
      const { error } = await supabase
        .from('mapas_mentais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Mapa mental excluído com sucesso');
      if (currentMapa?.id === id) {
        setCurrentMapa(null);
      }
      await fetchMapas();
    } catch (error) {
      console.error('Erro ao excluir mapa mental:', error);
      toast.error('Erro ao excluir mapa mental');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!currentMapa || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'node' || activeTool === 'circle' || activeTool === 'rectangle' || activeTool === 'triangle') {
      addNode(x, y, activeTool);
    } else if (activeTool === 'note') {
      addNote(x, y);
    }
  };

  const addNode = (x: number, y: number, tool: Tool) => {
    if (!currentMapa) return;

    const isShape = ['circle', 'rectangle', 'triangle'].includes(tool);
    const newNode: MapNode = {
      id: `node_${Date.now()}`,
      text: isShape ? 'Forma' : 'Nova Ideia',
      x: x - 75,
      y: y - 30,
      color: '#10b981',
      type: isShape ? 'shape' : 'text',
      shapeType: isShape ? tool as any : undefined,
      width: isShape ? 100 : undefined,
      height: isShape ? 60 : undefined
    };

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        nodes: [...currentMapa.dados_mapa.nodes, newNode]
      }
    });
  };

  const addNote = (x: number, y: number) => {
    if (!currentMapa) return;

    const newNote: MapNote = {
      id: `note_${Date.now()}`,
      text: 'Nova anotação...',
      x: x - 100,
      y: y - 50,
      width: 200,
      height: 100
    };

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        notes: [...currentMapa.dados_mapa.notes, newNote]
      }
    });
  };

  const updateNodeText = (nodeId: string, text: string) => {
    if (!currentMapa) return;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        nodes: currentMapa.dados_mapa.nodes.map(node =>
          node.id === nodeId ? { ...node, text } : node
        )
      }
    });
  };

  const updateNoteText = (noteId: string, text: string) => {
    if (!currentMapa) return;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        notes: currentMapa.dados_mapa.notes.map(note =>
          note.id === noteId ? { ...note, text } : note
        )
      }
    });
  };

  const addNodeLink = (nodeId: string, link: string) => {
    if (!currentMapa) return;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        nodes: currentMapa.dados_mapa.nodes.map(node =>
          node.id === nodeId ? { ...node, link } : node
        )
      }
    });
  };

  const addNoteLink = (noteId: string, link: string) => {
    if (!currentMapa) return;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        notes: currentMapa.dados_mapa.notes.map(note =>
          note.id === noteId ? { ...note, link } : note
        )
      }
    });
  };

  const deleteNode = (nodeId: string) => {
    if (!currentMapa || nodeId === 'central') return;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        nodes: currentMapa.dados_mapa.nodes.filter(node => node.id !== nodeId),
        connections: currentMapa.dados_mapa.connections.filter(
          conn => conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId
        ),
        notes: currentMapa.dados_mapa.notes
      }
    });
  };

  const deleteNote = (noteId: string) => {
    if (!currentMapa) return;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        notes: currentMapa.dados_mapa.notes.filter(note => note.id !== noteId),
        connections: currentMapa.dados_mapa.connections.filter(
          conn => !(conn.fromNodeId === noteId && conn.fromType === 'note') && 
                   !(conn.toNodeId === noteId && conn.toType === 'note')
        )
      }
    });
  };

  const handleElementClick = (elementId: string, elementType: 'node' | 'note') => {
    if (activeTool === 'connection') {
      if (!connectionStart) {
        setConnectionStart({ id: elementId, type: elementType });
        toast.info('Clique em outro elemento para criar a conexão');
      } else {
        if (connectionStart.id !== elementId) {
          createConnection(connectionStart, { id: elementId, type: elementType });
        }
        setConnectionStart(null);
      }
    }
  };

  const createConnection = (from: {id: string, type: 'node' | 'note'}, to: {id: string, type: 'node' | 'note'}) => {
    if (!currentMapa) return;

    const newConnection: MapConnection = {
      id: `conn_${Date.now()}`,
      fromNodeId: from.id,
      toNodeId: to.id,
      fromType: from.type,
      toType: to.type
    };

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        connections: [...currentMapa.dados_mapa.connections, newConnection]
      }
    });

    toast.success('Conexão criada com sucesso');
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (activeTool !== 'select') return;
    if (!canvasRef.current) return;
    
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const node = currentMapa?.dados_mapa.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });
  };

  const handleNoteMouseDown = (e: React.MouseEvent, noteId: string) => {
    if (activeTool !== 'select') return;
    if (!canvasRef.current) return;
    
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const note = currentMapa?.dados_mapa.notes.find(n => n.id === noteId);
    if (!note) return;

    setDraggedNote(noteId);
    setDragOffset({
      x: e.clientX - rect.left - note.x,
      y: e.clientY - rect.top - note.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentMapa || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    if (draggedNode) {
      setCurrentMapa({
        ...currentMapa,
        dados_mapa: {
          ...currentMapa.dados_mapa,
          nodes: currentMapa.dados_mapa.nodes.map(node =>
            node.id === draggedNode 
              ? { ...node, x: Math.max(0, Math.min(newX, 700)), y: Math.max(0, Math.min(newY, 450)) }
              : node
          )
        }
      });
    }

    if (draggedNote) {
      setCurrentMapa({
        ...currentMapa,
        dados_mapa: {
          ...currentMapa.dados_mapa,
          notes: currentMapa.dados_mapa.notes.map(note =>
            note.id === draggedNote 
              ? { ...note, x: Math.max(0, Math.min(newX, 600)), y: Math.max(0, Math.min(newY, 400)) }
              : note
          )
        }
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setDraggedNote(null);
  };

  const getElementPosition = (elementId: string, elementType: 'node' | 'note') => {
    if (elementType === 'node') {
      const node = currentMapa?.dados_mapa.nodes.find(n => n.id === elementId);
      return node ? { x: node.x + 75, y: node.y + 30 } : { x: 0, y: 0 };
    } else {
      const note = currentMapa?.dados_mapa.notes.find(n => n.id === elementId);
      return note ? { x: note.x + note.width/2, y: note.y + note.height/2 } : { x: 0, y: 0 };
    }
  };

  const renderShape = (node: MapNode) => {
    const commonProps = {
      className: "cursor-pointer hover:opacity-80 transition-opacity",
      style: { fill: node.color, stroke: node.color, strokeWidth: 2 }
    };

    switch (node.shapeType) {
      case 'circle':
        return (
          <ellipse
            cx={node.width! / 2}
            cy={node.height! / 2}
            rx={node.width! / 2 - 2}
            ry={node.height! / 2 - 2}
            {...commonProps}
          />
        );
      case 'triangle':
        const points = `${node.width!/2},2 2,${node.height!-2} ${node.width!-2},${node.height!-2}`;
        return <polygon points={points} {...commonProps} />;
      case 'rectangle':
      default:
        return (
          <rect
            x={2}
            y={2}
            width={node.width! - 4}
            height={node.height! - 4}
            rx={4}
            {...commonProps}
          />
        );
    }
  };

  const tools = [
    { id: 'select', icon: Mouse, label: 'Selecionar' },
    { id: 'node', icon: Plus, label: 'Adicionar Nó' },
    { id: 'note', icon: StickyNote, label: 'Adicionar Nota' },
    { id: 'connection', icon: Link2, label: 'Conectar' },
    { id: 'circle', icon: Circle, label: 'Círculo' },
    { id: 'rectangle', icon: Square, label: 'Retângulo' },
    { id: 'triangle', icon: Triangle, label: 'Triângulo' }
  ];

  if (loading) {
    return <div className="text-center py-8">Carregando mapas mentais...</div>;
  }

  if (currentMapa) {
    return (
      <div className="h-screen flex bg-background">
        {/* Sidebar */}
        <div className="w-80 bg-card border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold truncate">{currentMapa.titulo}</h2>
              <Button 
                onClick={() => setCurrentMapa(null)} 
                variant="ghost" 
                size="sm"
              >
                ✕
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Editor de Mapa Mental</p>
          </div>

          {/* Tools */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id as Tool)}
                    variant={activeTool === tool.id ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="text-xs">{tool.label}</span>
                  </Button>
                );
              })}
            </div>
            
            <div className="border-t pt-3 space-y-2">
              <Button 
                onClick={saveMapa}
                className="w-full justify-start"
              >
                <Save className="h-4 w-4 mr-3" />
                Salvar Mapa
              </Button>

              <Button 
                onClick={() => setShareDialogOpen(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Share2 className="h-4 w-4 mr-3" />
                Compartilhar
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-auto p-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 <strong>Como usar:</strong></p>
              <p>• Use "Selecionar" para mover elementos</p>
              <p>• "Conectar" para ligar elementos</p>
              <p>• Clique duplo para editar texto</p>
              <p>• Ctrl+clique para adicionar links</p>
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Header */}
          <div className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  {currentMapa.dados_mapa.nodes.length} nós • {currentMapa.dados_mapa.notes.length} notas • {currentMapa.dados_mapa.connections.length} conexões
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Ferramenta: {tools.find(t => t.id === activeTool)?.label}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-muted/20 to-muted/40">
            <div 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
              style={{
                backgroundImage: `
                  radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                cursor: activeTool === 'select' ? 'default' : 'crosshair'
              }}
            >
              {/* Render connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {currentMapa.dados_mapa.connections.map(connection => {
                  const fromPos = getElementPosition(connection.fromNodeId, connection.fromType || 'node');
                  const toPos = getElementPosition(connection.toNodeId, connection.toType || 'node');
                  
                  const dx = toPos.x - fromPos.x;
                  const dy = toPos.y - fromPos.y;
                  
                  return (
                    <path
                      key={connection.id}
                      d={`M ${fromPos.x} ${fromPos.y} Q ${fromPos.x + dx/2} ${fromPos.y + dy/2 - 30} ${toPos.x} ${toPos.y}`}
                      stroke="hsl(var(--muted-foreground) / 0.4)"
                      strokeWidth="2"
                      fill="none"
                      className="drop-shadow-sm"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
                
                {/* Arrow marker */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="hsl(var(--muted-foreground) / 0.4)"
                    />
                  </marker>
                </defs>
              </svg>

              {/* Render notes */}
              {currentMapa.dados_mapa.notes.map(note => (
                <div
                  key={note.id}
                  className="absolute bg-yellow-100 border-2 border-yellow-300 rounded-lg p-2 shadow-lg resize-none"
                  style={{
                    left: note.x,
                    top: note.y,
                    width: note.width,
                    height: note.height,
                    cursor: activeTool === 'select' ? 'move' : activeTool === 'connection' ? 'pointer' : 'default'
                  }}
                  onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.ctrlKey || e.metaKey) {
                      const link = prompt('Digite o link (deixe vazio para remover):', note.link || '');
                      if (link !== null) {
                        addNoteLink(note.id, link);
                      }
                    } else {
                      handleElementClick(note.id, 'note');
                    }
                  }}
                  onDoubleClick={() => {
                    setEditingNote(note.id);
                    setNoteText(note.text);
                  }}
                >
                  {note.link && (
                    <a 
                      href={note.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute top-1 right-1 text-blue-600 hover:text-blue-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 className="h-3 w-3" />
                    </a>
                  )}
                  
                  {editingNote === note.id ? (
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onBlur={() => {
                        updateNoteText(note.id, noteText);
                        setEditingNote(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          updateNoteText(note.id, noteText);
                          setEditingNote(null);
                        }
                      }}
                      className="w-full h-full resize-none border-none bg-transparent p-0 text-xs"
                      autoFocus
                    />
                  ) : (
                    <div className="flex justify-between items-start h-full">
                      <span className="text-xs leading-relaxed flex-1 overflow-hidden">
                        {note.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Render nodes */}
              {currentMapa.dados_mapa.nodes.map(node => (
                <div
                  key={node.id}
                  className="absolute bg-background border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{
                    left: node.x,
                    top: node.y,
                    borderColor: node.color,
                    minWidth: node.type === 'shape' ? node.width : '150px',
                    width: node.type === 'shape' ? node.width : 'auto',
                    height: node.type === 'shape' ? node.height : 'auto',
                    maxWidth: node.type === 'shape' ? node.width : '200px',
                    boxShadow: `0 8px 25px -8px ${node.color}30`,
                    cursor: activeTool === 'select' ? 'move' : activeTool === 'connection' ? 'pointer' : 'default'
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.ctrlKey || e.metaKey) {
                      const link = prompt('Digite o link (deixe vazio para remover):', node.link || '');
                      if (link !== null) {
                        addNodeLink(node.id, link);
                      }
                    } else {
                      handleElementClick(node.id, 'node');
                    }
                  }}
                  onDoubleClick={() => {
                    setEditingNode(node.id);
                    setNodeText(node.text);
                  }}
                >
                  {node.link && (
                    <a 
                      href={node.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 className="h-3 w-3" />
                    </a>
                  )}

                  {node.type === 'shape' ? (
                    <div className="relative w-full h-full">
                      <svg width="100%" height="100%" className="absolute inset-0">
                        {renderShape(node)}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        {editingNode === node.id ? (
                          <Input
                            value={nodeText}
                            onChange={(e) => setNodeText(e.target.value)}
                            onBlur={() => {
                              updateNodeText(node.id, nodeText);
                              setEditingNode(null);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateNodeText(node.id, nodeText);
                                setEditingNode(null);
                              }
                            }}
                            className="text-sm font-medium border-none p-0 h-auto bg-transparent focus-visible:ring-0 text-center"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-medium text-center text-white">
                            {node.text}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3">
                      {editingNode === node.id ? (
                        <Input
                          value={nodeText}
                          onChange={(e) => setNodeText(e.target.value)}
                          onBlur={() => {
                            updateNodeText(node.id, nodeText);
                            setEditingNode(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateNodeText(node.id, nodeText);
                              setEditingNode(null);
                            }
                          }}
                          className="text-sm font-medium border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                          autoFocus
                        />
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-center flex-1 leading-relaxed">
                            {node.text}
                          </span>
                          {node.id !== 'central' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2 opacity-60 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNode(node.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Node indicator */}
                  <div 
                    className="absolute -top-1 -left-1 w-3 h-3 rounded-full"
                    style={{ backgroundColor: node.color }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compartilhar Mapa Mental</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ao compartilhar, qualquer pessoa com o link poderá visualizar este mapa mental (somente leitura).
              </p>
              {currentMapa.publico ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800 mb-2">✓ Mapa já está público</p>
                  <div className="flex gap-2">
                    <Input 
                      value={`${window.location.origin}/mapa-mental/publico/${currentMapa.id}`}
                      readOnly 
                      className="text-xs"
                    />
                    <Button 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/mapa-mental/publico/${currentMapa.id}`);
                        toast.success('Link copiado!');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={shareMap}>
                    Tornar Público
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mapas Mentais</h2>
          <p className="text-muted-foreground">
            Organize suas ideias visualmente
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Mapa Mental
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Mapa Mental</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título do mapa mental"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createNewMapa}>
                  Criar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {mapas.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum mapa mental criado ainda</h3>
          <p className="text-muted-foreground mb-4">
            Comece criando seu primeiro mapa mental para organizar ideias
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Mapa
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mapas.map((mapa) => (
            <Card key={mapa.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">
                    {mapa.titulo}
                  </CardTitle>
                  <div className="flex gap-1">
                    {mapa.publico && (
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        Público
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMapa(mapa.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {mapa.dados_mapa.nodes.length} nós • {mapa.dados_mapa.notes.length} notas
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentMapa(mapa)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};