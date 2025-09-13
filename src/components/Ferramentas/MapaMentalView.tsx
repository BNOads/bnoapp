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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{currentMapa.titulo}</h2>
            <p className="text-muted-foreground">Editor de Mapa Mental</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={addNode} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Nó
            </Button>
            <Button onClick={saveMapa}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button onClick={() => setCurrentMapa(null)} variant="outline">
              Voltar
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div 
              ref={canvasRef}
              className="relative w-full h-96 bg-gradient-to-br from-background to-muted rounded-lg border overflow-hidden cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Render connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {currentMapa.dados_mapa.connections.map(connection => {
                  const fromNode = currentMapa.dados_mapa.nodes.find(n => n.id === connection.fromNodeId);
                  const toNode = currentMapa.dados_mapa.nodes.find(n => n.id === connection.toNodeId);
                  if (!fromNode || !toNode) return null;

                  return (
                    <line
                      key={connection.id}
                      x1={fromNode.x + 50}
                      y1={fromNode.y + 25}
                      x2={toNode.x + 50}
                      y2={toNode.y + 25}
                      stroke="#6b7280"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>

              {/* Render nodes */}
              {currentMapa.dados_mapa.nodes.map(node => (
                <div
                  key={node.id}
                  className="absolute bg-white border-2 rounded-lg p-2 cursor-move shadow-md hover:shadow-lg transition-shadow"
                  style={{
                    left: node.x,
                    top: node.y,
                    borderColor: node.color,
                    minWidth: '100px',
                    maxWidth: '150px'
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
                      className="text-xs"
                      autoFocus
                    />
                  ) : (
                    <div className="flex justify-between items-center">
                      <span 
                        className="text-xs font-medium text-center flex-1 cursor-text"
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
                          className="h-4 w-4 p-0 ml-1"
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
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          <p>💡 Dicas: Clique no texto para editar • Arraste os nós para reposicionar • O nó central não pode ser removido</p>
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