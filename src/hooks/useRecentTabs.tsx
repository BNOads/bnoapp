import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface RecentTab {
  id: string;
  name: string;
  icon: string;
  path: string;
  timestamp: number;
}

const RECENT_TABS_LIMIT = 50; // Store more but paginate display
const ITEMS_PER_PAGE = 10;

export function useRecentTabs() {
  const [recentTabs, setRecentTabs] = useState<RecentTab[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const location = useLocation();

  const getPageInfo = (pathname: string, search: string = ''): RecentTab | null => {
    const searchParams = new URLSearchParams(search);
    const tab = searchParams.get('tab');
    
    // Map paths and tabs to page information
    const pageMap: Record<string, Omit<RecentTab, 'timestamp'>> = {
      // Main tabs - updated to use direct paths
      '/': { id: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
      '/colaboradores': { id: 'colaboradores', name: 'Colaboradores', icon: 'Users', path: '/colaboradores' },
      '/clientes': { id: 'clientes', name: 'Clientes', icon: 'Calendar', path: '/clientes' },
      '/lancamentos': { id: 'lancamentos', name: 'Lançamentos', icon: 'BarChart3', path: '/lancamentos' },
      '/assistente': { id: 'assistente', name: 'Assistente', icon: 'MessageSquare', path: '/assistente' },
      '/treinamentos': { id: 'treinamentos', name: 'Treinamentos', icon: 'BookOpen', path: '/treinamentos' },
      '/ferramentas': { id: 'ferramentas', name: 'Ferramentas', icon: 'Wrench', path: '/ferramentas' },
      
      // Specific pages
      '/auth': { id: 'auth', name: 'Login', icon: 'LogIn', path: '/auth' },
      '/perfil': { id: 'perfil', name: 'Perfil', icon: 'User', path: '/perfil' },
      '/reset-password': { id: 'reset-password', name: 'Redefinir Senha', icon: 'Lock', path: '/reset-password' },
    };

    // Handle Ferramentas sub-pages
    if (pathname.startsWith('/ferramentas/')) {
      const subPage = pathname.split('/')[2];
      const ferramantasMap: Record<string, Omit<RecentTab, 'timestamp'>> = {
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
        return { ...ferramantasMap[subPage], timestamp: Date.now() };
      }
    }

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

    if (pathname.startsWith('/painel/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `painel-${id}`, 
        name: 'Painel do Cliente', 
        icon: 'Calendar', 
        path: pathname,
        timestamp: Date.now() 
      };
    }

    if (pathname.startsWith('/criativos/')) {
      const id = pathname.split('/')[2];
      return { 
        id: `criativos-${id}`, 
        name: 'Criativos do Cliente', 
        icon: 'Palette', 
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

    const currentPath = pathname;
    return pageMap[currentPath] ? { ...pageMap[currentPath], timestamp: Date.now() } : null;
  };

  const addRecentTab = (pageInfo: RecentTab) => {
    setRecentTabs(prev => {
      const filtered = prev.filter(t => t.id !== pageInfo.id);
      const updated = [pageInfo, ...filtered].slice(0, RECENT_TABS_LIMIT);
      localStorage.setItem('recentTabs', JSON.stringify(updated));
      return updated;
    });
  };

  // Pagination functions
  const getPaginatedTabs = () => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return recentTabs.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(recentTabs.length / ITEMS_PER_PAGE);
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, getTotalPages() - 1));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  const canGoNext = () => {
    return currentPage < getTotalPages() - 1;
  };

  const canGoPrevious = () => {
    return currentPage > 0;
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

  return { 
    recentTabs: getPaginatedTabs(),
    allRecentTabs: recentTabs,
    addRecentTab,
    currentPage,
    totalPages: getTotalPages(),
    goToNextPage,
    goToPreviousPage,
    canGoNext: canGoNext(),
    canGoPrevious: canGoPrevious()
  };
}