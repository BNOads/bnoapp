import { useState, useEffect } from 'react';

export interface FavoriteTab {
  id: string;
  name: string;
  icon: string;
  path: string;
}

export function useFavoriteTabs() {
  const [favorites, setFavorites] = useState<FavoriteTab[]>([]);

  const availableTabs: FavoriteTab[] = [
    { id: 'colaboradores', name: 'Colaboradores', icon: 'Users', path: '/?tab=colaboradores' },
    { id: 'clientes', name: 'Clientes', icon: 'Calendar', path: '/?tab=clientes' },
    { id: 'lancamentos', name: 'Lançamentos', icon: 'BarChart3', path: '/?tab=lancamentos' },
    { id: 'assistente', name: 'Assistente', icon: 'MessageSquare', path: '/?tab=assistente' },
    { id: 'treinamentos', name: 'Treinamentos', icon: 'BookOpen', path: '/?tab=treinamentos' },
    { id: 'ferramentas', name: 'Ferramentas', icon: 'Wrench', path: '/?tab=ferramentas' },
  ];

  const toggleFavorite = (tabId: string) => {
    setFavorites(prev => {
      const isCurrentlyFavorite = prev.some(f => f.id === tabId);
      let updated: FavoriteTab[];
      
      if (isCurrentlyFavorite) {
        updated = prev.filter(f => f.id !== tabId);
      } else {
        const tab = availableTabs.find(t => t.id === tabId);
        if (tab) {
          updated = [...prev, tab];
        } else {
          updated = prev;
        }
      }
      
      localStorage.setItem('favoriteTabs', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (tabId: string) => {
    return favorites.some(f => f.id === tabId);
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
    availableTabs, 
    toggleFavorite, 
    isFavorite 
  };
}