import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Edit, Workflow, Monitor, Mail, MousePointer, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";

interface FunnelElement {
  id: string;
  type: 'landing' | 'ad' | 'email' | 'checkout' | 'traffic';
  title: string;
  description: string;
  x: number;
  y: number;
  icon: string;
}

interface FunnelConnection {
  id: string;
  fromElementId: string;
  toElementId: string;
}

interface FunilMarketing {
  id: string;
  titulo: string;
  descricao: string;
  dados_funil: {
    elements: FunnelElement[];
    connections: FunnelConnection[];
  };
  created_at: string;
  updated_at: string;
}

interface FunilMarketingDB {
  id: string;
  titulo: string;
  descricao: string;
  dados_funil: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const elementTypes = [
  { value: 'traffic', label: 'Tráfego', icon: Users, color: '#ef4444' },
  { value: 'ad', label: 'Anúncio', icon: MousePointer, color: '#f59e0b' },
  { value: 'landing', label: 'Landing Page', icon: Monitor, color: '#3b82f6' },
  { value: 'email', label: 'E-mail', icon: Mail, color: '#10b981' },
  { value: 'checkout', label: 'Checkout', icon: ShoppingCart, color: '#8b5cf6' }
];

export const CriadorFunilView = () => {
  const { user } = useAuth();
  const [funis, setFunis] = useState<FunilMarketing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFunil, setCurrentFunil] = useState<FunilMarketing | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isElementDialogOpen, setIsElementDialogOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [elementType, setElementType] = useState<string>("");
  const [elementTitle, setElementTitle] = useState("");
  const [elementDescription, setElementDescription] = useState("");
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFunis();
  }, [user]);

  const fetchFunis = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('funis_marketing')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const mappedData = (data || []).map((item: FunilMarketingDB) => ({
        ...item,
        dados_funil: item.dados_funil as unknown as { elements: FunnelElement[]; connections: FunnelConnection[]; }
      }));
      setFunis(mappedData);
    } catch (error) {
      console.error('Erro ao buscar funis:', error);
      toast.error('Erro ao carregar funis de marketing');
    } finally {
      setLoading(false);
    }
  };

  const createNewFunil = async () => {
    if (!user || !titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('funis_marketing')
        .insert({
          user_id: user.id,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          dados_funil: {
            elements: [],
            connections: []
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      const mappedData = {
        ...data,
        dados_funil: data.dados_funil as unknown as { elements: FunnelElement[]; connections: FunnelConnection[]; }
      };
      setCurrentFunil(mappedData);
      setTitulo("");
      setDescricao("");
      setIsDialogOpen(false);
      toast.success('Funil criado com sucesso');
      await fetchFunis();
    } catch (error) {
      console.error('Erro ao criar funil:', error);
      toast.error('Erro ao criar funil');
    }
  };

  const saveFunil = async () => {
    if (!currentFunil) return;

    try {
      const { error } = await supabase
        .from('funis_marketing')
        .update({
          dados_funil: currentFunil.dados_funil as any
        })
        .eq('id', currentFunil.id);

      if (error) throw error;
      toast.success('Funil salvo com sucesso');
      await fetchFunis();
    } catch (error) {
      console.error('Erro ao salvar funil:', error);
      toast.error('Erro ao salvar funil');
    }
  };

  const deleteFunil = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funil?')) return;

    try {
      const { error } = await supabase
        .from('funis_marketing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Funil excluído com sucesso');
      if (currentFunil?.id === id) {
        setCurrentFunil(null);
      }
      await fetchFunis();
    } catch (error) {
      console.error('Erro ao excluir funil:', error);
      toast.error('Erro ao excluir funil');
    }
  };

  const addElement = () => {
    if (!currentFunil || !elementType || !elementTitle.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const typeConfig = elementTypes.find(t => t.value === elementType);
    if (!typeConfig) return;

    const newElement: FunnelElement = {
      id: `element_${Date.now()}`,
      type: elementType as any,
      title: elementTitle.trim(),
      description: elementDescription.trim(),
      x: Math.random() * 400 + 50,
      y: Math.random() * 250 + 50,
      icon: typeConfig.icon.name
    };

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        ...currentFunil.dados_funil,
        elements: [...currentFunil.dados_funil.elements, newElement]
      }
    });

    setElementType("");
    setElementTitle("");
    setElementDescription("");
    setIsElementDialogOpen(false);
  };

  const deleteElement = (elementId: string) => {
    if (!currentFunil) return;

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        elements: currentFunil.dados_funil.elements.filter(el => el.id !== elementId),
        connections: currentFunil.dados_funil.connections.filter(
          conn => conn.fromElementId !== elementId && conn.toElementId !== elementId
        )
      }
    });
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const element = currentFunil?.dados_funil.elements.find(el => el.id === elementId);
    if (!element) return;

    setDraggedElement(elementId);
    setDragOffset({
      x: e.clientX - rect.left - element.x,
      y: e.clientY - rect.top - element.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedElement || !currentFunil || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        ...currentFunil.dados_funil,
        elements: currentFunil.dados_funil.elements.map(element =>
          element.id === draggedElement 
            ? { ...element, x: Math.max(0, Math.min(newX, 460)), y: Math.max(0, Math.min(newY, 260)) }
            : element
        )
      }
    });
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
  };

  const getElementIcon = (element: FunnelElement) => {
    const typeConfig = elementTypes.find(t => t.value === element.type);
    return typeConfig?.icon || Monitor;
  };

  const getElementColor = (element: FunnelElement) => {
    const typeConfig = elementTypes.find(t => t.value === element.type);
    return typeConfig?.color || '#3b82f6';
  };

  if (loading) {
    return <div className="text-center py-8">Carregando funis...</div>;
  }

  if (currentFunil) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{currentFunil.titulo}</h2>
            <p className="text-muted-foreground">{currentFunil.descricao}</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isElementDialogOpen} onOpenChange={setIsElementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Elemento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Elemento ao Funil</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={elementType} onValueChange={setElementType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de elemento" />
                    </SelectTrigger>
                    <SelectContent>
                      {elementTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Título do elemento"
                    value={elementTitle}
                    onChange={(e) => setElementTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Descrição (opcional)"
                    value={elementDescription}
                    onChange={(e) => setElementDescription(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsElementDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={addElement}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={saveFunil}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button onClick={() => setCurrentFunil(null)} variant="outline">
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
              {/* Render elements */}
              {currentFunil.dados_funil.elements.map(element => {
                const Icon = getElementIcon(element);
                const color = getElementColor(element);
                
                return (
                  <div
                    key={element.id}
                    className="absolute bg-white border-2 rounded-lg p-3 cursor-move shadow-md hover:shadow-lg transition-shadow"
                    style={{
                      left: element.x,
                      top: element.y,
                      borderColor: color,
                      minWidth: '140px',
                      maxWidth: '180px'
                    }}
                    onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="h-5 w-5" style={{ color }} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteElement(element.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <h4 className="text-sm font-medium mb-1">{element.title}</h4>
                    {element.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {element.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          <p>💡 Dicas: Arraste os elementos para reposicionar • Clique no ícone de lixeira para remover</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Criador de Funis</h2>
          <p className="text-muted-foreground">
            Crie e visualize funis de marketing
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Funil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Funil de Marketing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título do funil"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <Textarea
                placeholder="Descrição do funil (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createNewFunil}>
                  Criar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {funis.length === 0 ? (
        <div className="text-center py-12">
          <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum funil criado ainda</h3>
          <p className="text-muted-foreground mb-4">
            Comece criando seu primeiro funil de marketing
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Funil
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funis.map((funil) => (
            <Card key={funil.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">
                    {funil.titulo}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFunil(funil.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {funil.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {funil.descricao}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {funil.dados_funil.elements.length} elementos
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentFunil(funil)}
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