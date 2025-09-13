import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface FavoriteTab {
  id: string;
  name: string;
  icon: string;
  path: string;
}

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
      '/?tab=colaboradores': { id: 'colaboradores', name: 'Colaboradores', icon: 'Users', path: '/?tab=colaboradores' },
      '/?tab=clientes': { id: 'clientes', name: 'Clientes', icon: 'Calendar', path: '/?tab=clientes' },
      '/?tab=lancamentos': { id: 'lancamentos', name: 'Lançamentos', icon: 'BarChart3', path: '/?tab=lancamentos' },
      '/?tab=assistente': { id: 'assistente', name: 'Assistente', icon: 'MessageSquare', path: '/?tab=assistente' },
      '/?tab=treinamentos': { id: 'treinamentos', name: 'Treinamentos', icon: 'BookOpen', path: '/?tab=treinamentos' },
      '/?tab=ferramentas': { id: 'ferramentas', name: 'Ferramentas', icon: 'Wrench', path: '/?tab=ferramentas' },
      '/auth': { id: 'auth', name: 'Login', icon: 'LogIn', path: '/auth' },
      '/perfil': { id: 'perfil', name: 'Perfil', icon: 'User', path: '/perfil' },
      '/reset-password': { id: 'reset-password', name: 'Redefinir Senha', icon: 'Lock', path: '/reset-password' },
    };

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

    const currentPath = tab ? `${pathname}?tab=${tab}` : pathname;
    return pageMap[currentPath] || null;
  };

  const toggleCurrentPageFavorite = () => {
    const currentPage = getCurrentPageInfo();
    if (!currentPage) return;

    setFavorites(prev => {
      const isCurrentlyFavorite = prev.some(f => f.id === currentPage.id);
      let updated: FavoriteTab[];
      
      if (isCurrentlyFavorite) {
        updated = prev.filter(f => f.id !== currentPage.id);
      } else {
        updated = [...prev, currentPage];
      }
      
      localStorage.setItem('favoriteTabs', JSON.stringify(updated));
      return updated;
    });
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

  return { 
    favorites, 
    toggleCurrentPageFavorite, 
    isCurrentPageFavorite,
    getCurrentPageInfo
  };
}