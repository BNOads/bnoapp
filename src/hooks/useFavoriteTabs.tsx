import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface FavoriteTab {
  id: string;
  name: string;
  customName?: string; // User-editable name
  icon: string;
  path: string;
}

const MAX_FAVORITES = 5;

export function useFavoriteTabs() {
  const [favorites, setFavorites] = useState<FavoriteTab[]>([]);
  const location = useLocation();

  const getCurrentPageInfo = (): FavoriteTab | null => {
    const pathname = location.pathname;
    const search = location.search;
    const searchParams = new URLSearchParams(search);
    const tab = searchParams.get('tab');
    
    // Map current page to favorite info
    const pageMap: Record<string, FavoriteTab> = {
      '/': { id: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
      '/colaboradores': { id: 'colaboradores', name: 'Colaboradores', icon: 'Users', path: '/colaboradores' },
      '/clientes': { id: 'clientes', name: 'Clientes', icon: 'Calendar', path: '/clientes' },
      '/lancamentos': { id: 'lancamentos', name: 'Lançamentos', icon: 'BarChart3', path: '/lancamentos' },
      '/assistente': { id: 'assistente', name: 'Assistente', icon: 'MessageSquare', path: '/assistente' },
      '/treinamentos': { id: 'treinamentos', name: 'Treinamentos', icon: 'BookOpen', path: '/treinamentos' },
      '/ferramentas': { id: 'ferramentas', name: 'Ferramentas', icon: 'Wrench', path: '/ferramentas' },
      '/auth': { id: 'auth', name: 'Login', icon: 'LogIn', path: '/auth' },
      '/perfil': { id: 'perfil', name: 'Perfil', icon: 'User', path: '/perfil' },
      '/reset-password': { id: 'reset-password', name: 'Redefinir Senha', icon: 'Lock', path: '/reset-password' },
    };

    // Handle Ferramentas sub-pages
    if (pathname.startsWith('/ferramentas/')) {
      const subPage = pathname.split('/')[2];
      const ferramantasMap: Record<string, FavoriteTab> = {
        'referencias': { id: 'ferramentas-referencias', name: 'Referências', icon: 'FileText', path: pathname },
        'debriefings': { id: 'ferramentas-debriefings', name: 'Debriefings', icon: 'ClipboardList', path: pathname },
        'mapas-mentais': { id: 'ferramentas-mapas', name: 'Mapas Mentais', icon: 'Network', path: pathname },
        'funis': { id: 'ferramentas-funis', name: 'Funis', icon: 'TrendingDown', path: pathname },
        'orcamentos': { id: 'ferramentas-orcamentos', name: 'Orçamentos', icon: 'DollarSign', path: pathname },
        'bloco-notas': { id: 'ferramentas-notas', name: 'Bloco de Notas', icon: 'NotebookPen', path: pathname },
        'pauta-reuniao': { id: 'ferramentas-pauta', name: 'Pauta de Reunião', icon: 'BookOpen', path: pathname },
        'criador-funis': { id: 'ferramentas-criador-funis', name: 'Criador de Funis', icon: 'Workflow', path: pathname },
      };
      
      if (ferramantasMap[subPage]) {
        return ferramantasMap[subPage];
      }
    }

    // Handle dynamic routes
    if (pathname.startsWith('/pdi/')) {
      const id = pathname.split('/')[2];
      return { id: `pdi-${id}`, name: 'Detalhes do PDI', icon: 'GraduationCap', path: pathname };
    }
    
    if (pathname.startsWith('/curso/')) {
      const id = pathname.split('/')[2];
      return { id: `curso-${id}`, name: 'Detalhes do Curso', icon: 'BookOpen', path: pathname };
    }

    if (pathname.startsWith('/aula/')) {
      const id = pathname.split('/')[2];
      return { id: `aula-${id}`, name: 'Detalhes da Aula', icon: 'Play', path: pathname };
    }

    if (pathname.startsWith('/painel/')) {
      const id = pathname.split('/')[2];
      return { id: `painel-${id}`, name: 'Painel do Cliente', icon: 'Calendar', path: pathname };
    }

    if (pathname.startsWith('/criativos/')) {
      const id = pathname.split('/')[2];
      return { id: `criativos-${id}`, name: 'Criativos do Cliente', icon: 'Palette', path: pathname };
    }

    if (pathname.startsWith('/cliente/')) {
      const segments = pathname.split('/');
      if (segments[3] === 'criativos') {
        return { id: `cliente-criativos-${segments[2]}`, name: 'Criativos do Cliente', icon: 'Palette', path: pathname };
      }
      return { id: `cliente-${segments[2]}`, name: 'Painel do Cliente', icon: 'Calendar', path: pathname };
    }

    if (pathname.startsWith('/referencia/')) {
      const id = pathname.split('/')[2];
      return { id: `referencia-${id}`, name: 'Referência', icon: 'FileText', path: pathname };
    }

    if (pathname.startsWith('/debriefing/')) {
      const id = pathname.split('/')[2];
      return { id: `debriefing-${id}`, name: 'Debriefing', icon: 'ClipboardList', path: pathname };
    }

    if (pathname.startsWith('/funil/')) {
      const id = pathname.split('/')[2];
      return { id: `funil-${id}`, name: 'Funil', icon: 'TrendingDown', path: pathname };
    }

    if (pathname.startsWith('/mapa-mental/')) {
      const id = pathname.split('/')[2];
      return { id: `mapa-mental-${id}`, name: 'Mapa Mental', icon: 'Network', path: pathname };
    }

    if (pathname.startsWith('/pop/')) {
      const id = pathname.split('/')[2];
      return { id: `pop-${id}`, name: 'POP', icon: 'FileText', path: pathname };
    }

    const currentPath = pathname;
    return pageMap[currentPath] || null;
  };

  const toggleCurrentPageFavorite = (): { success: boolean; message?: string } => {
    const currentPage = getCurrentPageInfo();
    if (!currentPage) return { success: false };

    const isCurrentlyFavorite = favorites.some(f => f.id === currentPage.id);
    
    if (isCurrentlyFavorite) {
      // Remove from favorites
      setFavorites(prev => {
        const updated = prev.filter(f => f.id !== currentPage.id);
        localStorage.setItem('favoriteTabs', JSON.stringify(updated));
        return updated;
      });
      return { success: true };
    } else {
      // Check limit before adding
      if (favorites.length >= MAX_FAVORITES) {
        return { 
          success: false, 
          message: "⚠️ Você já atingiu o limite de 5 favoritos. Remova um para adicionar outro." 
        };
      }
      
      // Add to favorites
      setFavorites(prev => {
        const updated = [...prev, currentPage];
        localStorage.setItem('favoriteTabs', JSON.stringify(updated));
        return updated;
      });
      return { success: true };
    }
  };

  const isCurrentPageFavorite = () => {
    const currentPage = getCurrentPageInfo();
    if (!currentPage) return false;
    return favorites.some(f => f.id === currentPage.id);
  };

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('favoriteTabs');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing favorite tabs:', error);
      }
    }
  }, []);

  const renameFavorite = (id: string, newName: string) => {
    setFavorites(prev => {
      const updated = prev.map(fav => 
        fav.id === id ? { ...fav, customName: newName } : fav
      );
      localStorage.setItem('favoriteTabs', JSON.stringify(updated));
      return updated;
    });
  };

  return { 
    favorites, 
    toggleCurrentPageFavorite, 
    isCurrentPageFavorite,
    getCurrentPageInfo,
    renameFavorite
  };
}