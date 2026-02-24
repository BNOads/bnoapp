import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Save,
  Clock,
  Loader2,
  BookOpen,
  Search,
  X,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  ArrowLeft,
  Building2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArquivoReuniaoTipTapEditor } from './ArquivoReuniaoTipTapEditor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';
import { useArquivoVersioning } from '@/hooks/useArquivoVersioning';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArquivoReuniaoAnalytics } from './ArquivoReuniaoAnalytics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Cliente {
  id: string;
  nome: string;
  aliases?: string[];
  branding_logo_url?: string;
}

interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  lastActive: string;
  avatarUrl?: string;
}

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

function getUserColor(userId?: string): string {
  if (!userId) return USER_COLORS[0];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
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
  const { user, loading: authLoading } = useAuth();
  const anoAtual = new Date().getFullYear();

  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);
  const [arquivoId, setArquivoId] = useState<string | null>(null);
  const [conteudo, setConteudo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [indicesTitulos, setIndicesTitulos] = useState<{ text: string; tag: string; id: string }[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activeTab, setActiveTab] = useState('arquivo');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [saveVersionObservation, setSaveVersionObservation] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

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

  // Numero da versao atual (maior versao no historico)
  const currentVersionNumber = versioning.versions.length > 0
    ? versioning.versions[0].versao
    : 0;

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

  // Buscar clientes ativos
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nome, aliases, branding_logo_url, ativo')
          .eq('ativo', true)
          .is('deleted_at', null);

        if (error) throw error;
        setClientes(data || []);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      }
    };

    fetchClientes();
  }, []);

  const detectClient = useCallback((text: string) => {
    if (!text || clientes.length === 0) return null;

    const lowerText = text.toLowerCase();
    const normalizedText = lowerText.replace(/\s+/g, '');
    for (const cliente of clientes) {
      const normalizedNome = cliente.nome.toLowerCase().replace(/\s+/g, '');
      if (lowerText.includes(cliente.nome.toLowerCase()) || normalizedText.includes(normalizedNome)) {
        return cliente;
      }
      if (cliente.aliases && cliente.aliases.length > 0) {
        if (cliente.aliases.some(alias => {
          const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '');
          return lowerText.includes(alias.toLowerCase()) || normalizedText.includes(normalizedAlias);
        })) {
          return cliente;
        }
      }
    }
    return null;
  }, [clientes]);

  // Ref para controlar se já restaurou o scroll
  const scrollRestoredRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Resetar flags ao trocar de ano
  useEffect(() => {
    scrollRestoredRef.current = false;
    loadedAnoRef.current = null;
  }, [anoSelecionado]);

  // Salvar posição de scroll ao mudar
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollPos = scrollContainer.scrollTop;
      sessionStorage.setItem(`arquivo-reuniao-scroll-${anoSelecionado}`, String(scrollPos));
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [anoSelecionado]);

  // Restaurar posição de scroll quando o editor estiver pronto (conteudo Yjs carregado)
  const handleEditorReady = useCallback(() => {
    if (scrollRestoredRef.current) return;

    const savedScroll = sessionStorage.getItem(`arquivo-reuniao-scroll-${anoSelecionado}`);

    // requestAnimationFrame para aplicar apos o DOM renderizar
    const rafId = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      if (savedScroll) {
        container.scrollTop = parseInt(savedScroll, 10);
      } else {
        // Primeira abertura: ir ao final (ultima pauta)
        container.scrollTop = container.scrollHeight;
      }

      scrollRestoredRef.current = true;
    });

    return () => cancelAnimationFrame(rafId);
  }, [anoSelecionado]);

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

    const userColor = getUserColor(user.id);

    const channel = supabase.channel(`arquivo-presence-${anoSelecionado}`, {
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
                lastActive: presence.lastActive,
                avatarUrl: presence.avatar_url,
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
            avatar_url: userData.avatar_url,
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
  }, [userData, user?.id, anoSelecionado]);

  // Ref para saber qual ano ja foi carregado (evitar reload ao trocar de aba)
  const loadedAnoRef = useRef<number | null>(null);

  // Load or create arquivo
  useEffect(() => {
    const loadOrCreateArquivo = async () => {
      // Aguardar auth terminar de carregar
      if (authLoading) return;

      if (!user) {
        setLoadError('Usuário não autenticado');
        setLoading(false);
        return;
      }

      // Se ja carregou este ano, nao recarregar (evita reload ao voltar de outra aba)
      if (loadedAnoRef.current === anoSelecionado && arquivoId) return;

      try {
        setLoading(true);
        setLoadError(null);

        const { data: existingArquivo, error: fetchError } = await supabase
          .from('arquivo_reuniao')
          .select('*')
          .eq('ano', anoSelecionado)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingArquivo) {
          setArquivoId(existingArquivo.id);
          setConteudo(existingArquivo.conteudo);
          loadedAnoRef.current = anoSelecionado;
        } else {
          // Só cria automaticamente para o ano atual
          if (anoSelecionado === anoAtual) {
            const { data: newArquivo, error: createError } = await supabase
              .from('arquivo_reuniao')
              .insert({
                ano: anoSelecionado,
                conteudo: {},
                criado_por: user.id
              })
              .select()
              .single();

            if (createError) throw createError;

            setArquivoId(newArquivo.id);
            setConteudo(null);
            loadedAnoRef.current = anoSelecionado;
          } else {
            setLoadError(`Arquivo de ${anoSelecionado} não encontrado`);
          }
        }
      } catch (error: any) {
        console.error('Erro ao carregar arquivo:', error);
        setLoadError(error.message || 'Não foi possível carregar o arquivo');
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
  }, [anoSelecionado, anoAtual, user, authLoading, toast]);

  const handleContentChange = (newContent: any) => {
    setConteudo(newContent);
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

  // Estado de loading ou erro
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando arquivo...</p>
        </div>
      </div>
    );
  }

  if (loadError || !arquivoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <X className="h-16 w-16 mx-auto" />
          </div>
          <p className="text-muted-foreground mb-4">{loadError || 'Não foi possível carregar o arquivo'}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex min-h-0 relative">
        <div className="flex-1 flex flex-col">
          <div className="border-b border-border bg-card">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
              {/* Left Side: Back Button, Title, Year Select, Tabs */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => window.history.back()}
                  title="Voltar às Ferramentas"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 shadow-sm">
                    <BookOpen className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight hidden md:block text-foreground">Arquivo de Reuniões</h1>
                      <Badge variant="secondary" className="hidden sm:flex text-[10px] uppercase font-semibold text-muted-foreground border-border/50 bg-background/50 hover:bg-background/80 transition-colors shadow-sm">
                        Wordlet Central
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="h-6 w-px bg-border mx-2 hidden sm:block"></div>

                <Select value={anoSelecionado.toString()} onValueChange={(val) => setAnoSelecionado(parseInt(val))}>
                  <SelectTrigger className="w-[110px] h-9 bg-background">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2025, anoAtual].filter((v, i, a) => a.indexOf(v) === i).map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano} {ano === anoAtual && "✅"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-6 w-px bg-border mx-2 hidden sm:block"></div>

                <TabsList className="h-9 bg-muted/40 border border-border/50 shrink-0">
                  <TabsTrigger value="arquivo" className="text-sm px-4 h-7 data-[state=active]:shadow-sm">Editor</TabsTrigger>
                  <TabsTrigger value="analises" className="text-sm px-4 h-7 data-[state=active]:shadow-sm">Análises</TabsTrigger>
                </TabsList>
              </div>

              {/* Right Side: Status, Online Users, Actions */}
              <div className="flex items-center gap-4">
                {/* Save Status */}
                <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground mr-2">
                  <div className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 ${saveStatus === 'saving' ? 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-400' :
                    saveStatus === 'saved' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-400' :
                      saveStatus === 'error' ? 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-400' :
                        'bg-muted text-muted-foreground'
                    }`}>
                    {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {saveStatus === 'saved' && <Save className="w-3.5 h-3.5" />}
                    {saveStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                    {saveStatus === 'idle' && <Save className="w-3.5 h-3.5" />}

                    {saveStatus === 'saving' && 'Salvando...'}
                    {saveStatus === 'saved' && 'Salvo'}
                    {saveStatus === 'error' && 'Erro ao salvar'}
                    {saveStatus === 'idle' && 'Alterações locais'}
                  </div>
                  {lastSaved && (
                    <span className="text-xs">Hoje às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>

                {/* Online Users */}
                {onlineUsers.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mr-2">
                    <div className="flex -space-x-2">
                      {onlineUsers.slice(0, 3).map((u) => (
                        <div
                          key={u.userId}
                          className="w-8 h-8 rounded-full border-2 border-background overflow-hidden"
                          style={{ borderColor: u.color }}
                          title={u.userName}
                        >
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.userName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="w-full h-full flex items-center justify-center text-xs font-semibold text-white" style="background-color: ${u.color}">${u.userName.charAt(0).toUpperCase()}</span>`;
                              }}
                            />
                          ) : (
                            <span
                              className="w-full h-full flex items-center justify-center text-xs font-semibold text-white"
                              style={{ backgroundColor: u.color }}
                            >
                              {u.userName.charAt(0).toUpperCase()}
                            </span>
                          )}
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

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleManualSave}
                    disabled={saveStatus === 'saving'}
                    variant={saveStatus === 'error' ? 'destructive' : 'default'}
                    size="sm"
                    className="h-9"
                  >
                    {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 md:mr-2 animate-spin" /> : <Save className="h-4 w-4 md:mr-2" />}
                    <span className="hidden md:inline">Salvar</span>
                  </Button>
                </div>
              </div>
            </div>

            {activeTab === 'arquivo' && (
              <div className="relative mb-6">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar no texto ou no índice..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 shadow-sm transition-all focus-visible:ring-1"
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
                  {showSearchResults && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground whitespace-nowrap hidden sm:inline">
                        {searchResults.length > 0 ? `${currentResultIndex + 1} de ${searchResults.length}` : 'Nenhum resultado'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handlePrevResult}
                          disabled={searchResults.length === 0}
                          className="h-9 w-9"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleNextResult}
                          disabled={searchResults.length === 0}
                          className="h-9 w-9"
                        >
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => navigateToResult(index)}
                        className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border/50 last:border-0 ${index === currentResultIndex ? 'bg-accent/50' : ''
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
            )}

          </div>

          <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
            <TabsContent value="arquivo" className="mt-0 h-full">
              <div className="max-w-4xl mx-auto py-8">
                <ArquivoReuniaoTipTapEditor
                  arquivoId={arquivoId || ''}
                  ano={anoSelecionado}
                  initialContent={conteudo}
                  onContentChange={handleContentChange}
                  onHeadingsChange={handleHeadingsChange}
                  onAddToIndex={handleAddToIndex}
                  onReady={handleEditorReady}
                  userName={userData?.nome || 'Usuario'}
                  userId={user?.id || ''}
                  userAvatarUrl={userData?.avatar_url}
                  userColor={getUserColor(user?.id)}
                />
              </div>
            </TabsContent>
            <TabsContent value="analises" className="mt-0 h-full">
              <ArquivoReuniaoAnalytics
                clientes={clientes}
                indicesTitulos={indicesTitulos}
                anoSelecionado={anoSelecionado}
              />
            </TabsContent>
          </div>
        </div>

        {activeTab === 'arquivo' && (
          <div className="w-72 border-l border-border bg-card overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Índice de Títulos
              </h3>
              {indicesTitulos.length > 0 ? (
                <div className="space-y-1">
                  {indicesTitulos.map((heading, index) => {
                    const associatedClient = detectClient(heading.text);

                    return (
                      <button
                        key={`${heading.id}-${index}`}
                        className={`w-full group text-left px-3 py-2 rounded-lg text-sm hover:bg-accent hover:text-accent-foreground transition-all duration-200 border border-transparent hover:border-border/50 ${heading.tag === 'h1' ? 'font-semibold text-lg mt-4 mb-2 bg-muted/30 border-border/30' :
                          heading.tag === 'h2' ? 'font-medium' :
                            'ml-6 text-muted-foreground text-xs hover:text-foreground'
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
                        <div className="flex flex-col gap-1">
                          <span>{heading.text}</span>
                          {associatedClient && (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-medium text-muted-foreground bg-muted/60 w-fit px-2 py-0.5 rounded-md border border-border/50 shadow-sm">
                              {associatedClient.branding_logo_url ? (
                                <img src={associatedClient.branding_logo_url} alt={associatedClient.nome} className="w-3.5 h-3.5 rounded-sm object-cover" />
                              ) : (
                                <Building2 className="w-3 h-3 text-primary/70" />
                              )}
                              <span className="truncate max-w-[150px] text-primary/90 group-hover:text-primary transition-colors">
                                {associatedClient.nome}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Use ## para criar títulos H2 que aparecerão aqui
                </p>
              )}
            </div>
          </div>
        )}


      </Tabs>
    </div >
  );
}
