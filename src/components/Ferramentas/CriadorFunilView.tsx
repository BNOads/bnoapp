import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Plus, Save, Trash2, Edit, Share2, Download, 
  Facebook, Youtube, Mail, Globe, ShoppingCart, 
  MessageCircle, Users, Calendar, BookOpen, Zap,
  MousePointer, ArrowRight, Settings, Eye, Link2, Play
} from "lucide-react";
import { toast } from "sonner";

interface FunnelElement {
  id: string;
  type: string;
  category: string;
  title: string;
  description?: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  metrics?: {
    conversion?: number;
    leads?: number;
    sales?: number;
    cost?: number;
  };
}

interface FunnelConnection {
  id: string;
  fromElementId: string;
  toElementId: string;
  label?: string;
}

interface FunnelData {
  elements: FunnelElement[];
  connections: FunnelConnection[];
}

interface Funnel {
  id: string;
  titulo: string;
  descricao?: string;
  dados_funil: FunnelData;
  created_at: string;
  updated_at: string;
  publico?: boolean;
  link_publico?: string;
}

const ELEMENT_TEMPLATES = {
  traffic: [
    { type: 'facebook_ad', title: 'Anúncio Facebook/Instagram', icon: 'facebook', color: '#1877f2', category: 'traffic' },
    { type: 'google_ad', title: 'Anúncio Google Ads', icon: 'globe', color: '#4285f4', category: 'traffic' },
    { type: 'youtube_ad', title: 'Anúncio YouTube', icon: 'youtube', color: '#ff0000', category: 'traffic' },
    { type: 'tiktok_ad', title: 'Anúncio TikTok', icon: 'zap', color: '#000000', category: 'traffic' },
    { type: 'linkedin_ad', title: 'Anúncio LinkedIn', icon: 'users', color: '#0077b5', category: 'traffic' },
  ],
  email: [
    { type: 'email_blast', title: 'Disparo de E-mail', icon: 'mail', color: '#ea4335', category: 'email' },
    { type: 'email_sequence', title: 'Sequência de Nutrição', icon: 'arrow-right', color: '#34a853', category: 'email' },
    { type: 'newsletter', title: 'Newsletter/Broadcast', icon: 'mail', color: '#fbbc04', category: 'email' },
  ],
  pages: [
    { type: 'landing_page', title: 'Página de Captura', icon: 'globe', color: '#9333ea', category: 'pages' },
    { type: 'thank_you', title: 'Página de Obrigado', icon: 'globe', color: '#10b981', category: 'pages' },
    { type: 'sales_page', title: 'Página de Vendas', icon: 'globe', color: '#f59e0b', category: 'pages' },
    { type: 'checkout', title: 'Checkout', icon: 'shopping-cart', color: '#ef4444', category: 'pages' },
    { type: 'content_page', title: 'Página de Conteúdo', icon: 'book-open', color: '#6366f1', category: 'pages' },
  ],
  other: [
    { type: 'whatsapp', title: 'WhatsApp/Chatbot', icon: 'message-circle', color: '#25d366', category: 'other' },
    { type: 'members_area', title: 'Área de Membros', icon: 'users', color: '#8b5cf6', category: 'other' },
    { type: 'webinar', title: 'Evento/Webinário', icon: 'calendar', color: '#06b6d4', category: 'other' },
    { type: 'product', title: 'Produto/Serviço', icon: 'shopping-cart', color: '#f97316', category: 'other' },
  ]
};

const getIconComponent = (iconName: string) => {
  const icons = {
    facebook: Facebook,
    youtube: Youtube,
    mail: Mail,
    globe: Globe,
    'shopping-cart': ShoppingCart,
    'message-circle': MessageCircle,
    users: Users,
    calendar: Calendar,
    'book-open': BookOpen,
    zap: Zap,
    'arrow-right': ArrowRight,
    play: Play,
  };
  return icons[iconName as keyof typeof icons] || Globe;
};

export const CriadorFunilView = () => {
  const { user } = useAuth();
  const [funis, setFunis] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFunil, setCurrentFunil] = useState<Funnel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selectedTool, setSelectedTool] = useState<'select' | 'connect'>('select');
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [tempConnection, setTempConnection] = useState<{ x: number; y: number } | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        dados_funil: item.dados_funil as FunnelData
      }));
      setFunis(mappedData);
    } catch (error) {
      console.error('Erro ao buscar funis:', error);
      toast.error('Erro ao carregar funis');
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
          descricao: descricao.trim() || null,
          dados_funil: {
            elements: [],
            connections: []
          } as any
        })
        .select()
        .single();

      if (error) throw error;
      
      const mappedData = {
        ...data,
        dados_funil: (data.dados_funil as any) || { elements: [], connections: [] }
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

  // Auto-save funcionalidade
  const autoSave = async () => {
    if (!currentFunil) return;

    try {
      const { error } = await supabase
        .from('funis_marketing')
        .update({
          dados_funil: currentFunil.dados_funil as any
        })
        .eq('id', currentFunil.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro no auto-save:', error);
    }
  };

  // Trigger auto-save quando os dados mudam
  useEffect(() => {
    if (!currentFunil) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 1000); // Auto-save após 1 segundo de inatividade

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentFunil?.dados_funil]);

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

  const shareFunnel = async () => {
    if (!currentFunil) return;

    try {
      const { data, error } = await supabase
        .from('funis_marketing')
        .update({ publico: true })
        .eq('id', currentFunil.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentFunil({
        ...data,
        dados_funil: (data.dados_funil as any) || { elements: [], connections: [] }
      });
      const publicUrl = `${window.location.origin}/funil/publico/${currentFunil.id}`;
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link público copiado para a área de transferência!');
      setShareDialogOpen(false);
      await fetchFunis();
    } catch (error) {
      console.error('Erro ao compartilhar funil:', error);
      toast.error('Erro ao compartilhar funil');
    }
  };

  const deleteConnection = (connectionId: string) => {
    if (!currentFunil) return;
    
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return;

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        ...currentFunil.dados_funil,
        connections: currentFunil.dados_funil.connections.filter(conn => conn.id !== connectionId)
      }
    });
    
    toast.success('Conexão excluída com sucesso');
  };

  const exportFunnel = async () => {
    if (!canvasRef.current) return;
    
    const { default: html2canvas } = await import('html2canvas');
    
    try {
      // Capture the canvas area
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 1200,
        height: 800
      });
      
      // Download as PNG
      const link = document.createElement('a');
      link.download = `funil-${currentFunil?.titulo || 'export'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Funil exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar o funil');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!currentFunil || !canvasRef.current) return;

    // Clear any temporary connection when clicking on empty canvas
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
      setTempConnection(null);
    }
  };

  const addElementToCanvas = (template: any, x: number, y: number) => {
    if (!currentFunil) return;

    const newElement: FunnelElement = {
      id: `element_${Date.now()}`,
      type: template.type,
      category: template.category || 'other',
      title: template.title,
      description: '',
      icon: template.icon,
      x: x - 75,
      y: y - 40,
      width: 150,
      height: 80,
      color: template.color,
      metrics: {}
    };

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        ...currentFunil.dados_funil,
        elements: [...currentFunil.dados_funil.elements, newElement]
      }
    });
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (selectedTool === 'connect') {
      e.stopPropagation();
      if (!connectionStart) {
        setConnectionStart(elementId);
        setIsConnecting(true);
        toast.info('Clique em outro elemento para criar a conexão');
      } else if (connectionStart !== elementId) {
        createConnection(connectionStart, elementId);
        setConnectionStart(null);
        setIsConnecting(false);
      }
      return;
    }

    if (selectedTool !== 'select') return;
    if (!canvasRef.current) return;
    
    e.stopPropagation();
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
    if (!currentFunil || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle connection dragging
    if (isConnecting && connectionStart) {
      setTempConnection({ x: mouseX, y: mouseY });
      return;
    }

    // Handle element dragging
    if (draggedElement) {
      const newX = mouseX - dragOffset.x;
      const newY = mouseY - dragOffset.y;

      setCurrentFunil({
        ...currentFunil,
        dados_funil: {
          ...currentFunil.dados_funil,
          elements: currentFunil.dados_funil.elements.map(element =>
            element.id === draggedElement 
              ? { ...element, x: Math.max(0, Math.min(newX, 1000)), y: Math.max(0, Math.min(newY, 600)) }
              : element
          )
        }
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
    if (!isConnecting) {
      setConnectionStart(null);
      setTempConnection(null);
    }
  };

  const createConnection = (fromId: string, toId: string) => {
    if (!currentFunil) return;

    const newConnection: FunnelConnection = {
      id: `conn_${Date.now()}`,
      fromElementId: fromId,
      toElementId: toId
    };

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        ...currentFunil.dados_funil,
        connections: [...currentFunil.dados_funil.connections, newConnection]
      }
    });

    toast.success('Conexão criada com sucesso');
  };

  const getElementPosition = (elementId: string) => {
    const element = currentFunil?.dados_funil.elements.find(el => el.id === elementId);
    return element ? { x: element.x + element.width/2, y: element.y + element.height/2 } : { x: 0, y: 0 };
  };

  const deleteElement = (elementId: string) => {
    if (!currentFunil) return;
    
    if (!confirm('Tem certeza que deseja excluir este elemento e suas conexões?')) return;

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        elements: currentFunil.dados_funil.elements.filter(el => el.id !== elementId),
        connections: currentFunil.dados_funil.connections.filter(
          conn => conn.fromElementId !== elementId && conn.toElementId !== elementId
        )
      }
    });
    
    setSelectedElement(null);
    toast.success('Elemento excluído com sucesso');
  };

  const updateElement = (elementId: string, updates: Partial<FunnelElement>) => {
    if (!currentFunil) return;

    setCurrentFunil({
      ...currentFunil,
      dados_funil: {
        ...currentFunil.dados_funil,
        elements: currentFunil.dados_funil.elements.map(element =>
          element.id === elementId ? { ...element, ...updates } : element
        )
      }
    });
  };

  // Duplo clique para editar
  const handleElementDoubleClick = (elementId: string) => {
    const element = currentFunil?.dados_funil.elements.find(el => el.id === elementId);
    if (!element) return;
    
    setEditingElement(elementId);
    setEditingText(element.title);
  };

  // Controles de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentFunil) return;
      
      // Delete key - excluir elemento selecionado
      if (e.key === 'Delete' && selectedElement) {
        deleteElement(selectedElement);
      }
      
      // Enter key - iniciar edição
      if (e.key === 'Enter' && selectedElement) {
        handleElementDoubleClick(selectedElement);
      }
      
      // Escape - cancelar edição
      if (e.key === 'Escape') {
        setEditingElement(null);
        setSelectedElement(null);
        setConnectionStart(null);
        setIsConnecting(false);
        setTempConnection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFunil, selectedElement]);

  // Click simples para selecionar elemento
  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (selectedTool === 'connect') {
      if (!connectionStart) {
        setConnectionStart(elementId);
        setIsConnecting(true);
        toast.info('Clique em outro elemento para criar a conexão');
      } else if (connectionStart !== elementId) {
        createConnection(connectionStart, elementId);
        setConnectionStart(null);
        setIsConnecting(false);
      }
    } else {
      setSelectedElement(elementId);
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

  if (loading) {
    return <div className="text-center py-8">Carregando funis...</div>;
  }

  if (currentFunil) {
    return (
      <div className="h-screen flex bg-background">
        {/* Sidebar */}
        <div className="w-80 bg-card border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold truncate">{currentFunil.titulo}</h2>
              <Button 
                onClick={() => setCurrentFunil(null)} 
                variant="ghost" 
                size="sm"
              >
                ✕
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Editor de Funil de Marketing</p>
          </div>

          {/* Tools */}
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedTool('select')}
                variant={selectedTool === 'select' ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                <MousePointer className="h-4 w-4 mr-2" />
                Selecionar
              </Button>
              <Button
                onClick={() => setSelectedTool('connect')}
                variant={selectedTool === 'connect' ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Conectar
              </Button>
            </div>
            
            <div className="border-t pt-3 space-y-2">
              <Button 
                onClick={saveFunil}
                className="w-full justify-start"
              >
                <Save className="h-4 w-4 mr-3" />
                Salvar Funil
              </Button>

              <Button 
                onClick={() => setShareDialogOpen(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Share2 className="h-4 w-4 mr-3" />
                Compartilhar
              </Button>

              <Button 
                onClick={exportFunnel}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-3" />
                Exportar PNG
              </Button>
            </div>
          </div>

          {/* Element Library */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="font-medium mb-3">Biblioteca de Elementos</h3>
            <Accordion type="multiple" className="space-y-2">
              <AccordionItem value="traffic">
                <AccordionTrigger className="text-sm">Tráfego/Anúncios</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {ELEMENT_TEMPLATES.traffic.map((template) => {
                      const IconComponent = getIconComponent(template.icon);
                      return (
                        <div
                          key={template.type}
                          className="p-2 border rounded cursor-pointer hover:bg-muted transition-colors"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('element', JSON.stringify(template));
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: template.color }}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium">{template.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="email">
                <AccordionTrigger className="text-sm">E-mail Marketing</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {ELEMENT_TEMPLATES.email.map((template) => {
                      const IconComponent = getIconComponent(template.icon);
                      return (
                        <div
                          key={template.type}
                          className="p-2 border rounded cursor-pointer hover:bg-muted transition-colors"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('element', JSON.stringify(template));
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: template.color }}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium">{template.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pages">
                <AccordionTrigger className="text-sm">Páginas</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {ELEMENT_TEMPLATES.pages.map((template) => {
                      const IconComponent = getIconComponent(template.icon);
                      return (
                        <div
                          key={template.type}
                          className="p-2 border rounded cursor-pointer hover:bg-muted transition-colors"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('element', JSON.stringify(template));
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: template.color }}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium">{template.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="other">
                <AccordionTrigger className="text-sm">Outros</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {ELEMENT_TEMPLATES.other.map((template) => {
                      const IconComponent = getIconComponent(template.icon);
                      return (
                        <div
                          key={template.type}
                          className="p-2 border rounded cursor-pointer hover:bg-muted transition-colors"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('element', JSON.stringify(template));
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: template.color }}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium">{template.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Instructions */}
          <div className="mt-auto p-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 <strong>Como usar:</strong></p>
              <p>• Arraste elementos da biblioteca</p>
              <p>• Use "Conectar" para ligar elementos</p>
              <p>• Duplo clique para editar</p>
              <p>• Exporte como PNG ou compartilhe</p>
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Header */}
          <div className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                {currentFunil.dados_funil.elements.length} elementos • {currentFunil.dados_funil.connections.length} conexões
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Ferramenta: {selectedTool === 'select' ? 'Selecionar' : 'Conectar'}
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
              onDrop={(e) => {
                e.preventDefault();
                const elementData = e.dataTransfer.getData('element');
                if (elementData) {
                  const template = JSON.parse(elementData);
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (rect) {
                    addElementToCanvas(template, e.clientX - rect.left, e.clientY - rect.top);
                  }
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              style={{
                backgroundImage: `
                  radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                cursor: selectedTool === 'select' ? 'default' : 'crosshair'
              }}
            >
              {/* Render connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {currentFunil.dados_funil.connections.map(connection => {
                  const fromPos = getElementPosition(connection.fromElementId);
                  const toPos = getElementPosition(connection.toElementId);
                  
                  const dx = toPos.x - fromPos.x;
                  const dy = toPos.y - fromPos.y;
                  
                  return (
                    <path
                      key={connection.id}
                      d={`M ${fromPos.x} ${fromPos.y} Q ${fromPos.x + dx/2} ${fromPos.y + dy/2 - 30} ${toPos.x} ${toPos.y}`}
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      fill="none"
                      className="drop-shadow-sm cursor-pointer hover:opacity-70"
                      markerEnd="url(#arrowhead)"
                      onClick={(e) => { e.stopPropagation(); deleteConnection(connection.id); }}
                    />
                  );
                })}
                
                {/* Temporary connection line while dragging */}
                {isConnecting && connectionStart && tempConnection && (
                  <path
                    d={`M ${getElementPosition(connectionStart).x} ${getElementPosition(connectionStart).y} L ${tempConnection.x} ${tempConnection.y}`}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    fill="none"
                    className="pointer-events-none animate-pulse"
                  />
                )}
                
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
                      fill="hsl(var(--primary))"
                    />
                  </marker>
                </defs>
              </svg>

              {/* Render elements */}
              {currentFunil.dados_funil.elements.map(element => {
                const IconComponent = getIconComponent(element.icon);
                return (
                  <div
                    key={element.id}
                    className={`absolute bg-background border-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 group ${
                      selectedElement === element.id 
                        ? 'ring-2 ring-primary ring-offset-2' 
                        : ''
                    }`}
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      borderColor: element.color,
                      cursor: selectedTool === 'select' ? 'move' : selectedTool === 'connect' ? 'pointer' : 'default'
                    }}
                    onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                    onClick={(e) => handleElementClick(element.id, e)}
                    onDoubleClick={() => handleElementDoubleClick(element.id)}
                  >
                    <div className="p-3 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center text-white"
                          style={{ backgroundColor: element.color }}
                        >
                          <IconComponent className="h-3 w-3" />
                        </div>
                      </div>
                      
                      <div className="text-xs font-semibold mb-1 line-clamp-2">
                        {editingElement === element.id ? (
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => {
                              updateElement(element.id, { title: editingText });
                              setEditingElement(null);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateElement(element.id, { title: editingText });
                                setEditingElement(null);
                              }
                            }}
                            className="text-xs font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                            autoFocus
                          />
                        ) : (
                          element.title
                        )}
                      </div>
                      
                      {element.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {element.description}
                        </p>
                      )}
                      
                      {element.metrics && Object.keys(element.metrics).length > 0 && (
                        <div className="mt-auto pt-1 text-xs text-muted-foreground">
                          {element.metrics.conversion && (
                            <div>Conv: {element.metrics.conversion}%</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Botões de controle quando selecionado */}
                    {selectedElement === element.id && (
                      <div className="absolute -top-8 right-0 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 bg-background border shadow-sm hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleElementDoubleClick(element.id);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 bg-background border shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Pontos de conexão */}
                    {selectedTool === 'connect' && (
                      <>
                        {/* Ponto superior */}
                        <div 
                          className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full -top-1.5 left-1/2 transform -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleElementClick(element.id, e);
                          }}
                        />
                        {/* Ponto direito */}
                        <div 
                          className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full -right-1.5 top-1/2 transform -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleElementClick(element.id, e);
                          }}
                        />
                        {/* Ponto inferior */}
                        <div 
                          className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full -bottom-1.5 left-1/2 transform -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleElementClick(element.id, e);
                          }}
                        />
                        {/* Ponto esquerdo */}
                        <div 
                          className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full -left-1.5 top-1/2 transform -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleElementClick(element.id, e);
                          }}
                        />
                      </>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compartilhar Funil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ao compartilhar, qualquer pessoa com o link poderá visualizar este funil (somente leitura).
              </p>
              <div className="flex gap-2">
                <Button onClick={shareFunnel} className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Gerar Link Público
                </Button>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Element Dialog */}
        {editingElement && (
          <Dialog open={true} onOpenChange={() => setEditingElement(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Elemento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {(() => {
                  const element = currentFunil.dados_funil.elements.find(el => el.id === editingElement);
                  if (!element) return null;
                  
                  return (
                    <>
                      <div>
                        <label className="text-sm font-medium">Título</label>
                        <Input
                          value={element.title}
                          onChange={(e) => updateElement(element.id, { title: e.target.value })}
                          placeholder="Título do elemento"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Descrição</label>
                        <Textarea
                          value={element.description || ''}
                          onChange={(e) => updateElement(element.id, { description: e.target.value })}
                          placeholder="Descrição opcional"
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={() => setEditingElement(null)} className="flex-1">
                          Salvar
                        </Button>
                        <Button variant="outline" onClick={() => setEditingElement(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Criador de Funis</h2>
          <p className="text-muted-foreground">
            Crie funis visuais de marketing digital com elementos pré-prontos
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
          <ArrowRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum funil criado ainda</h3>
          <p className="text-muted-foreground mb-4">
            Comece criando seu primeiro funil de marketing visual
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
                  {funil.dados_funil.elements.length} elementos • {funil.dados_funil.connections.length} conexões
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentFunil(funil)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Funil
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};