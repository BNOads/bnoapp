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

  const getTabInfo = (pathname: string): RecentTab | null => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    // Map paths to tab information
    const tabMap: Record<string, Omit<RecentTab, 'timestamp'>> = {
      '/': { id: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
      '/?tab=colaboradores': { id: 'colaboradores', name: 'Colaboradores', icon: 'Users', path: '/?tab=colaboradores' },
      '/?tab=clientes': { id: 'clientes', name: 'Clientes', icon: 'Calendar', path: '/?tab=clientes' },
      '/?tab=lancamentos': { id: 'lancamentos', name: 'Lançamentos', icon: 'BarChart3', path: '/?tab=lancamentos' },
      '/?tab=assistente': { id: 'assistente', name: 'Assistente', icon: 'MessageSquare', path: '/?tab=assistente' },
      '/?tab=treinamentos': { id: 'treinamentos', name: 'Treinamentos', icon: 'BookOpen', path: '/?tab=treinamentos' },
      '/?tab=ferramentas': { id: 'ferramentas', name: 'Ferramentas', icon: 'Wrench', path: '/?tab=ferramentas' },
    };

    const currentPath = tab ? `${pathname}?tab=${tab}` : pathname;
    return tabMap[currentPath] ? { ...tabMap[currentPath], timestamp: Date.now() } : null;
  };

  const addRecentTab = (tabInfo: RecentTab) => {
    setRecentTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabInfo.id);
      const updated = [tabInfo, ...filtered].slice(0, 5);
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
    // Track current tab
    const tabInfo = getTabInfo(location.pathname);
    if (tabInfo && tabInfo.id !== 'dashboard') {
      addRecentTab(tabInfo);
    }
  }, [location.pathname, location.search]);

  return { recentTabs };
}