import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Facebook, Youtube, Mail, Globe, ShoppingCart, 
  MessageCircle, Users, Calendar, BookOpen, Zap,
  ArrowRight, Play, Eye
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
}

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

export default function FunilPublico() {
  const { id } = useParams<{ id: string }>();
  const [funil, setFunil] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFunil = async () => {
      if (!id) {
        setError('ID do funil não encontrado');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('funis_marketing')
          .select('*')
          .eq('id', id)
          .eq('publico', true)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setError('Funil não encontrado ou não é público');
          } else {
            setError('Erro ao carregar funil');
          }
          setLoading(false);
          return;
        }

        setFunil({
          ...data,
          dados_funil: (data.dados_funil as any) || { elements: [], connections: [] }
        });
      } catch (error) {
        console.error('Erro ao buscar funil:', error);
        setError('Erro ao carregar funil');
      } finally {
        setLoading(false);
      }
    };

    fetchFunil();
  }, [id]);

  const getElementPosition = (elementId: string) => {
    const element = funil?.dados_funil.elements.find(el => el.id === elementId);
    return element ? { x: element.x + element.width/2, y: element.y + element.height/2 } : { x: 0, y: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando funil...</p>
        </div>
      </div>
    );
  }

  if (error || !funil) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Funil não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'Este funil não existe ou não é público.'}
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Voltar à página inicial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{funil.titulo}</h1>
              {funil.descricao && (
                <p className="text-muted-foreground mt-1">{funil.descricao}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Visualização pública
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{funil.dados_funil.elements.length}</div>
              <div className="text-sm text-muted-foreground">Elementos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{funil.dados_funil.connections.length}</div>
              <div className="text-sm text-muted-foreground">Conexões</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {funil.dados_funil.elements.filter(el => el.category === 'traffic').length}
              </div>
              <div className="text-sm text-muted-foreground">Canais de Tráfego</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {funil.dados_funil.elements.filter(el => el.category === 'pages').length}
              </div>
              <div className="text-sm text-muted-foreground">Páginas</div>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Canvas */}
        <Card>
          <CardHeader>
            <CardTitle>Visualização do Funil</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full h-[600px] bg-gradient-to-br from-muted/20 to-muted/40 overflow-hidden">
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  backgroundImage: `
                    radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              >
                {/* Render connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {funil.dados_funil.connections.map(connection => {
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
                        fill="hsl(var(--primary))"
                      />
                    </marker>
                  </defs>
                </svg>

                {/* Render elements */}
                {funil.dados_funil.elements.map(element => {
                  const IconComponent = getIconComponent(element.icon);
                  return (
                    <div
                      key={element.id}
                      className="absolute bg-background border-2 rounded-lg shadow-lg transition-all duration-200"
                      style={{
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        height: element.height,
                        borderColor: element.color
                      }}
                    >
                      <div className="p-3 h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center text-white"
                            style={{ backgroundColor: element.color }}
                          >
                            <IconComponent className="h-3 w-3" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {element.category}
                          </span>
                        </div>
                        
                        <h4 className="text-xs font-semibold mb-1 line-clamp-2">
                          {element.title}
                        </h4>
                        
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
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Elements List */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Elementos do Funil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funil.dados_funil.elements.map(element => {
              const IconComponent = getIconComponent(element.icon);
              return (
                <Card key={element.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: element.color }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{element.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {element.category.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    {element.description && (
                      <p className="text-sm text-muted-foreground">
                        {element.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Este funil foi criado usando o Criador de Funis</p>
          <p className="mt-1">
            Criado em {new Date(funil.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}