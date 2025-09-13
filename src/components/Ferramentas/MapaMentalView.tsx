import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Trash2, Edit, Brain, Move } from "lucide-react";
import { toast } from "sonner";

interface MapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface MapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

interface MapaMental {
  id: string;
  titulo: string;
  dados_mapa: {
    nodes: MapNode[];
    connections: MapConnection[];
  };
  created_at: string;
  updated_at: string;
}

interface MapaMentalDB {
  id: string;
  titulo: string;
  dados_mapa: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const MapaMentalView = () => {
  const { user } = useAuth();
  const [mapas, setMapas] = useState<MapaMental[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMapa, setCurrentMapa] = useState<MapaMental | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [nodeText, setNodeText] = useState("");
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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
      const mappedData = (data || []).map((item: MapaMentalDB) => ({
        ...item,
        dados_mapa: item.dados_mapa as unknown as { nodes: MapNode[]; connections: MapConnection[]; }
      }));
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
              x: 300,
              y: 200,
              color: '#3b82f6'
            }],
            connections: []
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      const mappedData = {
        ...data,
        dados_mapa: data.dados_mapa as unknown as { nodes: MapNode[]; connections: MapConnection[]; }
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

  const addNode = () => {
    if (!currentMapa) return;

    const newNode: MapNode = {
      id: `node_${Date.now()}`,
      text: 'Nova Ideia',
      x: Math.random() * 500 + 50,
      y: Math.random() * 300 + 50,
      color: '#10b981'
    };

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        nodes: [...currentMapa.dados_mapa.nodes, newNode]
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

  const deleteNode = (nodeId: string) => {
    if (!currentMapa || nodeId === 'central') return;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        nodes: currentMapa.dados_mapa.nodes.filter(node => node.id !== nodeId),
        connections: currentMapa.dados_mapa.connections.filter(
          conn => conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId
        )
      }
    });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const node = currentMapa?.dados_mapa.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode || !currentMapa || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    setCurrentMapa({
      ...currentMapa,
      dados_mapa: {
        ...currentMapa.dados_mapa,
        nodes: currentMapa.dados_mapa.nodes.map(node =>
          node.id === draggedNode 
            ? { ...node, x: Math.max(0, Math.min(newX, 560)), y: Math.max(0, Math.min(newY, 360)) }
            : node
        )
      }
    });
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

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
            <Button 
              onClick={addNode} 
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-3" />
              Adicionar Nó
            </Button>
            
            <Button 
              onClick={saveMapa}
              className="w-full justify-start"
            >
              <Save className="h-4 w-4 mr-3" />
              Salvar Mapa
            </Button>
          </div>

          {/* Node Colors */}
          <div className="p-4 border-t border-border">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">CORES DOS NÓS</h3>
            <div className="grid grid-cols-4 gap-2">
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'].map(color => (
                <div
                  key={color}
                  className="w-8 h-8 rounded-lg cursor-pointer border-2 border-transparent hover:border-ring transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    if (!currentMapa) return;
                    const centralNode = currentMapa.dados_mapa.nodes.find(n => n.id === 'central');
                    if (centralNode) {
                      setCurrentMapa({
                        ...currentMapa,
                        dados_mapa: {
                          ...currentMapa.dados_mapa,
                          nodes: currentMapa.dados_mapa.nodes.map(node =>
                            node.id === 'central' ? { ...node, color } : node
                          )
                        }
                      });
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-auto p-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 <strong>Dicas de uso:</strong></p>
              <p>• Clique no texto para editar</p>
              <p>• Arraste os nós para reposicionar</p>
              <p>• Use as cores para organizar ideias</p>
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
                  {currentMapa.dados_mapa.nodes.length} nós
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Zoom: 100%
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-muted/20 to-muted/40">
            <div 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                backgroundImage: `
                  radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            >
              {/* Render connections with curves */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {currentMapa.dados_mapa.connections.map(connection => {
                  const fromNode = currentMapa.dados_mapa.nodes.find(n => n.id === connection.fromNodeId);
                  const toNode = currentMapa.dados_mapa.nodes.find(n => n.id === connection.toNodeId);
                  if (!fromNode || !toNode) return null;

                  const x1 = fromNode.x + 75;
                  const y1 = fromNode.y + 30;
                  const x2 = toNode.x + 75;
                  const y2 = toNode.y + 30;
                  
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const dr = Math.sqrt(dx * dx + dy * dy);
                  
                  return (
                    <path
                      key={connection.id}
                      d={`M ${x1} ${y1} Q ${x1 + dx/2} ${y1 + dy/2 - 30} ${x2} ${y2}`}
                      stroke="hsl(var(--muted-foreground) / 0.4)"
                      strokeWidth="2"
                      fill="none"
                      className="drop-shadow-sm"
                    />
                  );
                })}
              </svg>

              {/* Render nodes */}
              {currentMapa.dados_mapa.nodes.map(node => (
                <div
                  key={node.id}
                  className="absolute bg-background border-2 rounded-xl p-3 cursor-move shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  style={{
                    left: node.x,
                    top: node.y,
                    borderColor: node.color,
                    minWidth: '150px',
                    maxWidth: '200px',
                    boxShadow: `0 8px 25px -8px ${node.color}30`
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
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
                      <span 
                        className="text-sm font-medium text-center flex-1 cursor-text leading-relaxed"
                        onClick={() => {
                          setEditingNode(node.id);
                          setNodeText(node.text);
                        }}
                      >
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
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {mapa.dados_mapa.nodes.length} nós
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