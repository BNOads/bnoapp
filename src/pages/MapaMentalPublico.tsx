import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brain, ArrowLeft, ExternalLink } from "lucide-react";
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
  publico: boolean;
  compartilhado_em: string;
}

export const MapaMentalPublico = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mapa, setMapa] = useState<MapaMental | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMapa();
    }
  }, [id]);

  const fetchMapa = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('mapas_mentais')
        .select('*')
        .eq('id', id)
        .eq('publico', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setNotFound(true);
        } else {
          throw error;
        }
        return;
      }

      const mappedData = {
        ...data,
        dados_mapa: {
          nodes: (data.dados_mapa as any)?.nodes || [],
          connections: (data.dados_mapa as any)?.connections || [],
          notes: (data.dados_mapa as any)?.notes || []
        }
      };
      
      setMapa(mappedData);
    } catch (error) {
      console.error('Erro ao buscar mapa mental:', error);
      toast.error('Erro ao carregar mapa mental');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getElementPosition = (elementId: string, elementType: 'node' | 'note') => {
    if (elementType === 'node') {
      const node = mapa?.dados_mapa.nodes.find(n => n.id === elementId);
      return node ? { x: node.x + 75, y: node.y + 30 } : { x: 0, y: 0 };
    } else {
      const note = mapa?.dados_mapa.notes.find(n => n.id === elementId);
      return note ? { x: note.x + note.width/2, y: note.y + note.height/2 } : { x: 0, y: 0 };
    }
  };

  const renderShape = (node: MapNode) => {
    const commonProps = {
      className: "cursor-default",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando mapa mental...</p>
        </div>
      </div>
    );
  }

  if (notFound || !mapa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Mapa Mental não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Este mapa mental não existe ou não está mais disponível publicamente.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                {mapa.titulo}
              </h1>
              <p className="text-sm text-muted-foreground">
                Mapa Mental • {mapa.dados_mapa.nodes.length} nós • {mapa.dados_mapa.notes.length} notas • {mapa.dados_mapa.connections.length} conexões
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Compartilhado em {new Date(mapa.compartilhado_em).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <div 
          className="w-full h-[calc(100vh-5rem)] relative overflow-auto bg-gradient-to-br from-muted/20 to-muted/40"
          style={{
            backgroundImage: `
              radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        >
          {/* Render connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {mapa.dados_mapa.connections.map(connection => {
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
          {mapa.dados_mapa.notes.map(note => (
            <div
              key={note.id}
              className="absolute bg-yellow-100 border-2 border-yellow-300 rounded-lg p-2 shadow-lg"
              style={{
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height
              }}
            >
              {note.link && (
                <a 
                  href={note.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute top-1 right-1 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              
              <div className="text-xs leading-relaxed overflow-hidden h-full">
                {note.text}
              </div>
            </div>
          ))}

          {/* Render nodes */}
          {mapa.dados_mapa.nodes.map(node => (
            <div
              key={node.id}
              className="absolute bg-background border-2 rounded-xl shadow-lg"
              style={{
                left: node.x,
                top: node.y,
                borderColor: node.color,
                minWidth: node.type === 'shape' ? node.width : '150px',
                width: node.type === 'shape' ? node.width : 'auto',
                height: node.type === 'shape' ? node.height : 'auto',
                maxWidth: node.type === 'shape' ? node.width : '200px',
                boxShadow: `0 8px 25px -8px ${node.color}30`
              }}
            >
              {node.link && (
                <a 
                  href={node.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {node.type === 'shape' ? (
                <div className="relative w-full h-full">
                  <svg width="100%" height="100%" className="absolute inset-0">
                    {renderShape(node)}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <span className="text-sm font-medium text-center text-white">
                      {node.text}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <span className="text-sm font-medium text-center leading-relaxed">
                    {node.text}
                  </span>
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

      {/* Footer */}
      <div className="bg-card border-t border-border p-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            Este é um mapa mental público • Somente visualização
          </p>
        </div>
      </div>
    </div>
  );
};