import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Save, 
  Clock, 
  Loader2, 
  BookOpen, 
  History, 
  Bookmark,
  Search,
  X,
  ChevronUp,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArquivoReuniaoEditor } from './ArquivoReuniaoEditor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';
import { useArquivoVersioning } from '@/hooks/useArquivoVersioning';
import { Input } from '@/components/ui/input';
import { ArquivoHistoricoVersoes } from './ArquivoHistoricoVersoes';
import { ArquivoVisualizarVersao } from './ArquivoVisualizarVersao';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  lastActive: string;
}

interface SearchResult {
  text: string;
  type: 'content' | 'index';
  context: string;
  position: number;
}

export function ArquivoReuniaoView() {
  const { toast } = useToast();
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const anoAtual = new Date().getFullYear();

  const [arquivoId, setArquivoId] = useState<string | null>(null);
  const [conteudo, setConteudo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [indicesTitulos, setIndicesTitulos] = useState<{ text: string; tag: string; id: string }[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [saveVersionObservation, setSaveVersionObservation] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(1);
  
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingContentRef = useRef<any>(null);
  const isSavingRef = useRef(false);

  // Hook de versionamento
  const versioning = useArquivoVersioning(
    arquivoId || '',
    user?.id || '',
    userData?.nome || 'Usuário'
  );

  // Busca no conteúdo e índice
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase();

    // Buscar no índice de títulos
    indicesTitulos.forEach((heading, index) => {
      if (heading.text.toLowerCase().includes(query)) {
        results.push({
          text: heading.text,
          type: 'index',
          context: `${heading.tag.toUpperCase()}: ${heading.text}`,
          position: index
        });
      }
    });

    // Buscar no conteúdo do editor
    const editorElement = document.querySelector('.prose');
    if (editorElement) {
      const textContent = editorElement.textContent || '';
      const lowerContent = textContent.toLowerCase();
      let startIndex = 0;
      
      while (startIndex < lowerContent.length) {
        const foundIndex = lowerContent.indexOf(query, startIndex);
        if (foundIndex === -1) break;
        
        // Extrair contexto (50 caracteres antes e depois)
        const contextStart = Math.max(0, foundIndex - 50);
        const contextEnd = Math.min(textContent.length, foundIndex + query.length + 50);
        const context = textContent.substring(contextStart, contextEnd);
        const highlight = textContent.substring(foundIndex, foundIndex + query.length);
        
        results.push({
          text: highlight,
          type: 'content',
          context: `...${context}...`,
          position: foundIndex
        });
        
        startIndex = foundIndex + query.length;
      }
    }

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
    setCurrentResultIndex(0);
  }, [searchQuery, indicesTitulos]);

  // Rolar para o último índice ao carregar a página
  useEffect(() => {
    if (indicesTitulos.length > 0 && !searchQuery) {
      const timer = setTimeout(() => {
        const lastHeading = indicesTitulos[indicesTitulos.length - 1];
        const editorElement = document.querySelector('.prose');
        if (editorElement) {
          const headings = editorElement.querySelectorAll('h1, h2, h3');
          const targetHeading = Array.from(headings || []).find(
            h => h.textContent?.trim() === lastHeading.text
          );
          if (targetHeading) {
            targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 300); // Pequeno delay para garantir que o editor renderizou

      return () => clearTimeout(timer);
    }
  }, [indicesTitulos.length]); // Só executa quando o número de índices muda (primeira carga)

  // Navegar pelos resultados
  const navigateToResult = (index: number) => {
    if (searchResults.length === 0) return;
    
    const result = searchResults[index];
    const editorElement = document.querySelector('.prose');
    
    if (result.type === 'index') {
      // Navegar para o título no índice
      const headings = editorElement?.querySelectorAll('h1, h2, h3');
      const targetHeading = Array.from(headings || []).find(
        h => h.textContent?.trim() === result.text
      );
      if (targetHeading) {
        targetHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // Realçar texto no conteúdo
      if (editorElement) {
        const walker = document.createTreeWalker(
          editorElement,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let currentPos = 0;
        let node;
        
        while (node = walker.nextNode()) {
          const text = node.textContent || '';
          if (currentPos + text.length >= result.position) {
            if (node.parentElement) {
              node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            break;
          }
          currentPos += text.length;
        }
      }
    }
    
    setCurrentResultIndex(index);
  };

  const handleNextResult = () => {
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    navigateToResult(nextIndex);
  };

  const handlePrevResult = () => {
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    navigateToResult(prevIndex);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setCurrentResultIndex(0);
  };

  // Salvamento antes de sair da página
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (pendingContentRef.current && arquivoId) {
        e.preventDefault();
        await saveContent(pendingContentRef.current);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden && pendingContentRef.current && arquivoId) {
        await saveContent(pendingContentRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Salvar conteúdo pendente ao desmontar componente
      if (pendingContentRef.current && arquivoId) {
        saveContent(pendingContentRef.current);
      }
    };
  }, [arquivoId]);

  // Setup presence channel
  useEffect(() => {
    if (!userData || !user?.id) return;

    const userColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const userColor = userColors[Math.floor(Math.random() * userColors.length)];

    const channel = supabase.channel(`arquivo-presence-${anoAtual}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: UserPresence[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const presence = presences[0];
            if (presence.user_id !== user.id) {
              users.push({
                userId: presence.user_id,
                userName: presence.user_name,
                color: presence.color,
                lastActive: presence.lastActive
              });
            }
          }
        });

        setOnlineUsers(users);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({
            user_id: user.id,
            user_name: userData.nome,
            color: userColor,
            lastActive: new Date().toISOString()
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userData, user?.id, anoAtual]);

  // Load or create arquivo
  useEffect(() => {
    const loadOrCreateArquivo = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const { data: existingArquivo, error: fetchError } = await supabase
          .from('arquivo_reuniao')
          .select('*')
          .eq('ano', anoAtual)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingArquivo) {
          setArquivoId(existingArquivo.id);
          setConteudo(existingArquivo.conteudo);
        } else {
          const { data: newArquivo, error: createError } = await supabase
            .from('arquivo_reuniao')
            .insert({
              ano: anoAtual,
              conteudo: null,
              criado_por: user.id
            })
            .select()
            .single();

          if (createError) throw createError;

          setArquivoId(newArquivo.id);
        }
      } catch (error: any) {
        console.error('Erro ao carregar arquivo:', error);
        toast({
          title: "❌ Erro",
          description: "Não foi possível carregar o arquivo",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrCreateArquivo();
  }, [anoAtual, user, toast]);

  const handleContentChange = (newContent: any) => {
    pendingContentRef.current = newContent;
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce de 2 segundos - salva automaticamente quando usuário para de digitar
    saveTimeoutRef.current = setTimeout(async () => {
      await saveContent(pendingContentRef.current);
    }, 2000);
  };

  const saveContent = async (content: any, retryCount = 0): Promise<boolean> => {
    if (!arquivoId || !content) return false;
    
    if (isSavingRef.current) {
      return false;
    }

    try {
      isSavingRef.current = true;
      setSaveStatus('saving');
      
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('arquivo_reuniao')
        .update({
          conteudo: content,
          atualizado_em: new Date().toISOString(),
          atualizado_por: user.user?.id
        })
        .eq('id', arquivoId);

      if (error) throw error;

      const now = new Date();
      setLastSaved(now);
      setSaveStatus('saved');
      pendingContentRef.current = null;
      
      // Manter status "saved" por 3 segundos
      setTimeout(() => {
        if (pendingContentRef.current === null) {
          setSaveStatus('idle');
        }
      }, 3000);
      
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return await saveContent(content, retryCount + 1);
      } else {
        setSaveStatus('error');
        toast({
          title: "❌ Erro ao salvar",
          description: "Não foi possível salvar. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleManualSave = async () => {
    const content = pendingContentRef.current || conteudo;
    const success = await saveContent(content);
    
    if (success) {
      toast({
        title: "✅ Salvo",
        description: "Conteúdo salvo com sucesso",
      });
    }
  };

  const handleSaveVersion = async () => {
    if (!arquivoId) return;

    const saved = await versioning.createVersion(
      conteudo,
      'manual',
      saveVersionObservation || undefined
    );

    if (saved) {
      setShowSaveVersionModal(false);
      setSaveVersionObservation('');
      toast({
        title: "✅ Versão salva",
        description: "Versão manual criada com sucesso",
      });
    }
  };

  const handleRestoreVersion = async (version: any) => {
    if (!arquivoId) return;

    try {
      setConteudo(version.conteudo);
      await saveContent(version.conteudo);
      
      setShowHistoryModal(false);
      setShowViewModal(false);
      
      toast({
        title: "✅ Versão restaurada",
        description: `Versão ${version.versao} foi restaurada`,
      });
    } catch (error) {
      console.error('Erro ao restaurar versão:', error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível restaurar a versão",
        variant: "destructive"
      });
    }
  };

  const handleViewVersion = (version: any) => {
    setSelectedVersion(version);
    setShowViewModal(true);
  };

  const handleOpenHistory = async () => {
    await versioning.loadVersions();
    setShowHistoryModal(true);
  };

  const handleHeadingsChange = (headings: any[]) => {
    setIndicesTitulos(headings);
  };

  const handleAddToIndex = useCallback((text: string) => {
    const newHeading = {
      text,
      tag: 'h2' as const,
      id: `heading-${Date.now()}`
    };
    setIndicesTitulos(prev => [...prev, newHeading]);
  }, []);

  useEffect(() => {
    return () => {
      versioning.cleanup();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [versioning]);

  if (loading || !arquivoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando arquivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold">Arquivo de Reunião {anoAtual}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                  saveStatus === 'saving' ? 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-400' :
                  saveStatus === 'saved' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-400' :
                  saveStatus === 'error' ? 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-400' :
                  'bg-gray-500/20 text-gray-700 dark:bg-gray-500/30 dark:text-gray-400'
                }`}>
                  {saveStatus === 'saving' && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <span className="inline-block w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                      <span>Salvo</span>
                    </>
                  )}
                  {saveStatus === 'error' && <span>Erro ao salvar</span>}
                  {saveStatus === 'idle' && lastSaved && (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>{lastSaved.toLocaleTimeString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {onlineUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex -space-x-2">
                    {onlineUsers.slice(0, 3).map((user) => (
                      <div
                        key={user.userId}
                        className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white"
                        style={{ backgroundColor: user.color }}
                        title={user.userName}
                      >
                        {user.userName.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {onlineUsers.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                        +{onlineUsers.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button onClick={handleOpenHistory} variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>

              <Button onClick={() => setShowSaveVersionModal(true)} variant="outline" size="sm">
                <Bookmark className="h-4 w-4 mr-2" />
                Salvar Versão
              </Button>

              <Button 
                onClick={handleManualSave} 
                disabled={saveStatus === 'saving'}
                variant={saveStatus === 'error' ? 'destructive' : 'default'}
                size="sm"
              >
                {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar no texto ou no índice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {currentResultIndex + 1} de {searchResults.length}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={handlePrevResult}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleNextResult}>
                      <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => navigateToResult(index)}
                    className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors border-b border-border last:border-b-0 ${
                      index === currentResultIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={result.type === 'index' ? 'default' : 'secondary'} className="text-xs">
                        {result.type === 'index' ? 'Índice' : 'Texto'}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {result.context}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto py-8">
            <ArquivoReuniaoEditor
              arquivoId={arquivoId || ''}
              ano={anoAtual}
              initialContent={conteudo}
              onContentChange={handleContentChange}
              onHeadingsChange={handleHeadingsChange}
              onAddToIndex={handleAddToIndex}
            />
          </div>
        </div>
      </div>

      <div className="w-72 border-l border-border bg-card overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Índice de Títulos
          </h3>
          {indicesTitulos.length > 0 ? (
            <div className="space-y-1">
              {indicesTitulos.map((heading, index) => (
                <button
                  key={`${heading.id}-${index}`}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors ${
                    heading.tag === 'h1' ? 'font-semibold' :
                    heading.tag === 'h2' ? 'ml-3 font-medium' :
                    'ml-6 text-muted-foreground'
                  }`}
                  onClick={() => {
                    const editorElement = document.querySelector('.prose');
                    if (editorElement) {
                      const headings = editorElement.querySelectorAll('h1, h2, h3');
                      const targetHeading = Array.from(headings).find(
                        h => h.textContent?.trim() === heading.text
                      );
                      if (targetHeading) {
                        targetHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  }}
                >
                  {heading.text}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use ## para criar títulos H2 que aparecerão aqui
            </p>
          )}
        </div>
      </div>

      <ArquivoHistoricoVersoes
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        versions={versioning.versions}
        loading={versioning.loading}
        onRestore={handleRestoreVersion}
        onView={handleViewVersion}
        currentVersionNumber={currentVersionNumber}
      />

      <ArquivoVisualizarVersao
        open={showViewModal}
        onOpenChange={setShowViewModal}
        version={selectedVersion}
        onRestore={handleRestoreVersion}
        isCurrentVersion={selectedVersion?.versao === currentVersionNumber}
      />

      <Dialog open={showSaveVersionModal} onOpenChange={setShowSaveVersionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Versão Manual</DialogTitle>
            <DialogDescription>
              Adicione uma descrição para esta versão (opcional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: Concluída revisão da seção X..."
            value={saveVersionObservation}
            onChange={(e) => setSaveVersionObservation(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveVersionModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVersion}>
              <Bookmark className="h-4 w-4 mr-2" />
              Salvar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
