import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface RecentTab {
  id: string;
  name: string;
  icon: string;
  path: string;
  timestamp: number;
}

export function useRecentTabs() {
  const [recentTabs, setRecentTabs] = useState<RecentTab[]>([]);
  const location = useLocation();

  const getPageInfo = (pathname: string, search: string = ''): RecentTab | null => {
    const searchParams = new URLSearchParams(search);
    const tab = searchParams.get('tab');
    
    // Map paths and tabs to page information
    const pageMap: Record<string, Omit<RecentTab, 'timestamp'>> = {
      // Main tabs
      '/': { id: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
      '/?tab=colaboradores': { id: 'colaboradores', name: 'Colaboradores', icon: 'Users', path: '/?tab=colaboradores' },
      '/?tab=clientes': { id: 'clientes', name: 'Clientes', icon: 'Calendar', path: '/?tab=clientes' },
      '/?tab=lancamentos': { id: 'lancamentos', name: 'Lançamentos', icon: 'BarChart3', path: '/?tab=lancamentos' },
      '/?tab=assistente': { id: 'assistente', name: 'Assistente', icon: 'MessageSquare', path: '/?tab=assistente' },
      '/?tab=treinamentos': { id: 'treinamentos', name: 'Treinamentos', icon: 'BookOpen', path: '/?tab=treinamentos' },
      '/?tab=ferramentas': { id: 'ferramentas', name: 'Ferramentas', icon: 'Wrench', path: '/?tab=ferramentas' },
      
      // Specific pages
      '/auth': { id: 'auth', name: 'Login', icon: 'LogIn', path: '/auth' },
      '/perfil': { id: 'perfil', name: 'Perfil', icon: 'User', path: '/perfil' },
      '/reset-password': { id: 'reset-password', name: 'Redefinir Senha', icon: 'Lock', path: '/reset-password' },
    };

    // Handle dynamic routes
    if (pathname.startsWith('/pdi/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `pdi-${id}`, 
        name: 'Detalhes do PDI', 
        icon: 'GraduationCap', 
        path: pathname,
        timestamp: Date.now() 
      };
    }
    
    if (pathname.startsWith('/curso/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `curso-${id}`, 
        name: 'Detalhes do Curso', 
        icon: 'BookOpen', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/aula/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `aula-${id}`, 
        name: 'Detalhes da Aula', 
        icon: 'Play', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/cliente/')) {
      const segments = pathname.split('/');
      if (segments[3] === 'criativos') {
        return { 
          id: `cliente-criativos-${segments[2]}`, 
          name: 'Criativos do Cliente', 
          icon: 'Palette', 
          path: pathname,
          timestamp: Date.now() 
        };
      }
      return { 
        id: `cliente-${segments[2]}`, 
        name: 'Painel do Cliente', 
        icon: 'Calendar', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/referencia/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `referencia-${id}`, 
        name: 'Referência', 
        icon: 'FileText', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/debriefing/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `debriefing-${id}`, 
        name: 'Debriefing', 
        icon: 'ClipboardList', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/funil/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `funil-${id}`, 
        name: 'Funil', 
        icon: 'TrendingDown', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/mapa-mental/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `mapa-mental-${id}`, 
        name: 'Mapa Mental', 
        icon: 'Network', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/pop/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `pop-${id}`, 
        name: 'POP', 
        icon: 'FileText', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    const currentPath = tab ? `${pathname}?tab=${tab}` : pathname;
    return pageMap[currentPath] ? { ...pageMap[currentPath], timestamp: Date.now() } : null;
  };

  const addRecentTab = (pageInfo: RecentTab) => {
    setRecentTabs(prev => {
      const filtered = prev.filter(t => t.id !== pageInfo.id);
      const updated = [pageInfo, ...filtered].slice(0, 5);
      localStorage.setItem('recentTabs', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('recentTabs');
    if (stored) {
      try {
        setRecentTabs(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing recent tabs:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Track current page
    const pageInfo = getPageInfo(location.pathname, location.search);
    if (pageInfo) {
      addRecentTab(pageInfo);
    }
  }, [location.pathname, location.search]);

  return { recentTabs, addRecentTab };
}