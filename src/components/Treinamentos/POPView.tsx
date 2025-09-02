import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  FileText, 
  Calendar, 
  User, 
  ChevronRight, 
  Star, 
  FolderOpen,
  Download,
  ExternalLink,
  Clock,
  Eye
} from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { POPDocument } from "./POPDocument";

// Mock data baseado na pasta do Google Drive
const mockPOPs = [
  {
    id: "1",
    title: "Análise diária de Dashboard de Lançamento",
    category: "Dashboard",
    lastModified: "7 de Mai, 2025",
    type: "Procedimento",
    size: "3 KB",
    icon: "📊",
    description: "Processo para análise diária dos indicadores de lançamento",
    isFavorite: false
  },
  {
    id: "2", 
    title: "Briefing, Debriefing e criação de estratégia de Lançamento",
    category: "Estratégia",
    lastModified: "8 de Jun, 2025",
    type: "Procedimento",
    size: "8 KB",
    icon: "🎯",
    description: "Guia completo para sessões de briefing e debriefing",
    isFavorite: true
  },
  {
    id: "3",
    title: "Como verificar a média das métricas do cliente",
    category: "Métricas",
    lastModified: "17 de Jun, 2025", 
    type: "Tutorial",
    size: "65 KB",
    icon: "📈",
    description: "Procedimento para análise de métricas de performance",
    isFavorite: false
  },
  {
    id: "4",
    title: "Comunicação em Lançamento (Início, meio e fim)",
    category: "Comunicação",
    lastModified: "7 de Mai, 2025",
    type: "Guia",
    size: "3 KB", 
    icon: "💬",
    description: "Protocolo de comunicação durante lançamentos",
    isFavorite: false
  },
  {
    id: "5",
    title: "Criação de campanha de distribuição de conteúdo",
    category: "Campanhas",
    lastModified: "7 de Mai, 2025",
    type: "Procedimento",
    size: "3 KB",
    icon: "🚀",
    description: "Passo a passo para campanhas de distribuição",
    isFavorite: false
  },
  {
    id: "6",
    title: "Criação de campanhas de Infoproduto de Sessão Estratégica",
    category: "Campanhas",
    lastModified: "7 de Mai, 2025",
    type: "Procedimento", 
    size: "3 KB",
    icon: "💡",
    description: "Guia para campanhas de infoprodutos estratégicos",
    isFavorite: false
  }
];

export const POPView = () => {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const {
    searchTerm,
    setSearchTerm,
    filteredItems
  } = useSearch(mockPOPs, ['title', 'category', 'description']);

  useEffect(() => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('pop-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const toggleFavorite = (docId: string) => {
    const newFavorites = favorites.includes(docId) 
      ? favorites.filter(id => id !== docId)
      : [...favorites, docId];
    
    setFavorites(newFavorites);
    localStorage.setItem('pop-favorites', JSON.stringify(newFavorites));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Dashboard': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'Estratégia': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'Métricas': 'bg-green-500/10 text-green-600 border-green-500/20',
      'Comunicação': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'Campanhas': 'bg-pink-500/10 text-pink-600 border-pink-500/20'
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const favoriteItems = filteredItems.filter(item => favorites.includes(item.id));
  const recentItems = filteredItems.slice(0, 5);

  if (selectedDocument) {
    return (
      <POPDocument 
        documentId={selectedDocument} 
        onBack={() => setSelectedDocument(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">POPs & Procedimentos</h2>
            <p className="text-muted-foreground">Biblioteca de procedimentos operacionais padrão</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar procedimentos..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Access Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Favorites */}
        {favoriteItems.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <h3 className="font-semibold">Favoritos</h3>
            </div>
            <div className="space-y-2">
              {favoriteItems.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => setSelectedDocument(item.id)}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recentes</h3>
          </div>
          <div className="space-y-2">
            {recentItems.slice(0, 3).map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => setSelectedDocument(item.id)}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.lastModified}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Separator />

      {/* All Documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Todos os Documentos</h3>
          <Badge variant="outline" className="text-xs">
            {filteredItems.length} documentos
          </Badge>
        </div>

        <div className="space-y-2">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedDocument(item.id)}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <span className="text-xl">{item.icon}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground mb-1 truncate">
                        {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{item.lastModified}</span>
                        <span>{item.size}</span>
                        <Badge className={getCategoryColor(item.category)} variant="outline">
                          {item.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                      >
                        <Star 
                          className={`h-4 w-4 ${
                            favorites.includes(item.id) 
                              ? 'text-yellow-500 fill-yellow-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};