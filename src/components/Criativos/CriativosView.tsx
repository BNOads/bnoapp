import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ExternalLink, Edit, Trash2, FileImage, Video, FileText, File } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { NovoCriativoModal } from "./NovoCriativoModal";
import { EditarCriativoModal } from "./EditarCriativoModal";
import { DeleteCriativoModal } from "./DeleteCriativoModal";

interface Criativo {
  id: string;
  nome: string;
  link_externo: string;
  tipo_criativo: 'imagem' | 'video' | 'pdf' | 'outros';
  tags: string[];
  descricao?: string;
  created_at: string;
  updated_at: string;
}

interface CriativosViewProps {
  clienteId: string;
}

export const CriativosView = ({ clienteId }: CriativosViewProps) => {
  const { canCreateContent } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [criativoToEdit, setCriativoToEdit] = useState<Criativo | null>(null);
  const [criativoToDelete, setCriativoToDelete] = useState<{id: string, nome: string} | null>(null);
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const { toast } = useToast();
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(criativos, ['nome', 'descricao']);

  const carregarCriativos = async () => {
    try {
      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCriativos((data || []) as Criativo[]);
    } catch (error: any) {
      console.error('Erro ao carregar criativos:', error);
      toast({
        title: "Erro ao carregar criativos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCriativos();
  }, [clienteId]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'imagem':
        return <FileImage className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'imagem':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'video':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pdf':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEditClick = (criativo: Criativo) => {
    setCriativoToEdit(criativo);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (criativo: Criativo) => {
    setCriativoToDelete({ id: criativo.id, nome: criativo.nome });
    setDeleteModalOpen(true);
  };

  const handleSuccess = () => {
    carregarCriativos();
  };

  // Filtrar por tag selecionada
  const criativosFiltrados = selectedTag 
    ? filteredItems.filter(criativo => criativo.tags.includes(selectedTag))
    : filteredItems;

  // Obter todas as tags únicas
  const todasTags = Array.from(new Set(criativos.flatMap(c => c.tags))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold text-foreground">Criativos</h3>
          <p className="text-muted-foreground text-sm lg:text-base">
            Materiais criativos e assets do cliente
          </p>
        </div>
        {canCreateContent && (
          <Button 
            variant="hero" 
            size="sm"
            className="lg:size-default w-full sm:w-auto"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Criativo
          </Button>
        )}
      </div>

      {/* Indicator para usuários não-admin */}
      {!canCreateContent && <ViewOnlyBadge />}

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar criativos..."
            className="pl-10 bg-background border-border text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {todasTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTag === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag("")}
            >
              Todas
            </Button>
            {todasTags.map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Criativos */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : criativosFiltrados.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {criativos.length === 0 
              ? "Nenhum criativo cadastrado ainda." 
              : "Nenhum criativo encontrado com os filtros aplicados."
            }
          </p>
          {canCreateContent && criativos.length === 0 && (
            <Button 
              onClick={() => setModalOpen(true)}
              className="mt-4"
            >
              Adicionar Primeiro Criativo
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {criativosFiltrados.map((criativo) => (
            <Card key={criativo.id} className="bg-card border border-border shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base sm:text-lg font-semibold text-foreground line-clamp-2">
                      {criativo.nome}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`${getTipoColor(criativo.tipo_criativo)} text-xs`}>
                        {getTipoIcon(criativo.tipo_criativo)}
                        <span className="ml-1 capitalize">{criativo.tipo_criativo}</span>
                      </Badge>
                    </div>
                  </div>
                  {canCreateContent && (
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(criativo)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(criativo)}
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {criativo.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {criativo.descricao}
                  </p>
                )}
                
                {criativo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {criativo.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {formatarData(criativo.created_at)}
                  </span>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => window.open(criativo.link_externo, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Abrir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <NovoCriativoModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        clienteId={clienteId}
        onSuccess={handleSuccess}
      />
      
      <EditarCriativoModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setCriativoToEdit(null);
          }
        }}
        criativo={criativoToEdit}
        onSuccess={handleSuccess}
      />
      
      <DeleteCriativoModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) {
            setCriativoToDelete(null);
          }
        }}
        criativo={criativoToDelete}
        onSuccess={handleSuccess}
      />
    </div>
  );
};