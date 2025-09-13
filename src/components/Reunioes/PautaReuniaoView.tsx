import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { 
  Calendar, 
  Plus, 
  Save, 
  FileText, 
  Users, 
  List, 
  CheckSquare, 
  Share2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Settings,
  BookOpen,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/components/Auth/AuthContext";

interface MeetingDocument {
  id: string;
  ano: number;
  mes: number;
  dia: number;
  titulo_reuniao: string;
  descricao: string | null;
  participantes: string[];
  status: string;
  contribuidores: string[];
  ultima_atualizacao: string;
  created_by: string;
  blocos?: MeetingBlock[];
}

interface MeetingBlock {
  id: string;
  tipo: string;
  titulo: string | null;
  conteudo: any;
  ordem: number;
  ancora: string | null;
}

interface Template {
  id: string;
  nome: string;
  descricao: string | null;
  blocos_template: any;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const BLOCK_TYPES = {
  titulo: { icon: FileText, label: 'Título' },
  descricao: { icon: FileText, label: 'Descrição' },
  participantes: { icon: Users, label: 'Participantes' },
  pauta: { icon: List, label: 'Pauta' },
  decisoes: { icon: CheckSquare, label: 'Decisões' },
  acoes: { icon: CheckSquare, label: 'Ações' }
};

export function PautaReuniaoView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<{ano: number, mes: number, dia?: number}>({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    dia: undefined
  });
  
  const [documents, setDocuments] = useState<{[key: string]: MeetingDocument}>({});
  const [currentDocument, setCurrentDocument] = useState<MeetingDocument | null>(null);
  const [blocks, setBlocks] = useState<MeetingBlock[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [extractedTitles, setExtractedTitles] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showAddPautaModal, setShowAddPautaModal] = useState(false);
  const [newPautaData, setNewPautaData] = useState({
    titulo: '',
    descricao: '',
    includeAcoes: false,
    includeDecisoes: false,
    includeFollowups: false
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  interface SearchResult {
    documentId: string;
    blockId: string;
    blockTitle: string;
    day: number;
    month: number;
    year: number;
    documentTitle: string;
  }

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .trim();
  };
  
  const autosaveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Parse URL parameters
    const yearParam = searchParams.get('ano');
    const monthParam = searchParams.get('mes');
    const dayParam = searchParams.get('dia');
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    if (yearParam && monthParam) {
      setSelectedDate({
        ano: parseInt(yearParam),
        mes: parseInt(monthParam),
        dia: dayParam ? parseInt(dayParam) : undefined
      });
    } else {
      // Auto-navigate to today's date
      setSelectedDate({
        ano: currentYear,
        mes: currentMonth,
        dia: currentDay
      });
      updateURL(currentYear, currentMonth, currentDay);
    }
    
    loadInitialData();
  }, [searchParams]);

  // Add keyboard shortcuts and blur events for autosave
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument(false);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving' || autosaveTimeout.current) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
      }
    };

    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current);
      }
    };
  }, [saveStatus, autosaveTimeout.current]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (!currentDocument || blocks.length === 0) return;
      
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        navigateToNextBlock();
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        navigateToPreviousBlock();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [blocks, currentDocument]);

  const navigateToNextBlock = () => {
    const sortedBlocks = blocks.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const currentIndex = sortedBlocks.findIndex(block => {
      const element = document.getElementById(`block-${block.id}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight / 2;
      }
      return false;
    });
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedBlocks.length) {
      const nextBlock = sortedBlocks[nextIndex];
      const element = document.getElementById(`block-${nextBlock.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const navigateToPreviousBlock = () => {
    const sortedBlocks = blocks.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const currentIndex = sortedBlocks.findIndex(block => {
      const element = document.getElementById(`block-${block.id}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight / 2;
      }
      return false;
    });
    
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevBlock = sortedBlocks[prevIndex];
      const element = document.getElementById(`block-${prevBlock.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDocuments(),
        loadTemplates()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados iniciais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from('reunioes_documentos')
      .select(`
        *,
        reunioes_blocos (
          id,
          tipo,
          titulo,
          conteudo,
          ordem,
          ancora
        )
      `)
      .eq('ano', selectedDate.ano)
      .eq('mes', selectedDate.mes)
      .order('dia');

    if (error) throw error;

    const docsMap: {[key: string]: MeetingDocument} = {};
    data?.forEach(doc => {
      const dayKey = doc.dia.toString();
      docsMap[dayKey] = {
        ...doc,
        blocos: doc.reunioes_blocos?.sort((a, b) => a.ordem - b.ordem) || []
      };
    });
    
    setDocuments(docsMap);
    
    // If a specific day is selected, load it
    if (selectedDate.dia && docsMap[selectedDate.dia.toString()]) {
      setCurrentDocument(docsMap[selectedDate.dia.toString()]);
      setBlocks(docsMap[selectedDate.dia.toString()].blocos || []);
    } else if (selectedDate.dia && !docsMap[selectedDate.dia.toString()]) {
      // Clear current document if selected day has no document
      setCurrentDocument(null);
      setBlocks([]);
    }
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('reunioes_templates')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;
    setTemplates((data || []).map(t => ({ ...t, blocos_template: typeof t.blocos_template === 'string' ? JSON.parse(t.blocos_template) : t.blocos_template })));
  };

  // Search function with debounce
  const searchAcrossDocuments = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const { data: allDocs, error } = await supabase
        .from('reunioes_documentos')
        .select(`
          id,
          ano,
          mes,
          dia,
          titulo_reuniao,
          reunioes_blocos (
            id,
            tipo,
            titulo,
            conteudo,
            ordem
          )
        `)
        .eq('ano', selectedDate.ano);

      if (error) throw error;

      const results: SearchResult[] = [];
      const searchTerm = query.toLowerCase();

      allDocs?.forEach(doc => {
        doc.reunioes_blocos?.forEach(block => {
          if (block.titulo && block.titulo.toLowerCase().includes(searchTerm)) {
            results.push({
              documentId: doc.id,
              blockId: block.id,
              blockTitle: block.titulo,
              day: doc.dia,
              month: doc.mes,
              year: doc.ano,
              documentTitle: doc.titulo_reuniao
            });
          }
        });
      });

      // Sort by date (most recent first)
      results.sort((a, b) => {
        if (a.month !== b.month) return b.month - a.month;
        return b.day - a.day;
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível realizar a busca",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAcrossDocuments(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedDate.ano]);

  const createOrOpenDocument = async (day: number, templateId?: string) => {
    const dayKey = day.toString();
    
    // If document exists, just open it
    if (documents[dayKey]) {
      setCurrentDocument(documents[dayKey]);
      setBlocks(documents[dayKey].blocos || []);
      updateURL(selectedDate.ano, selectedDate.mes, day);
      return;
    }

    // Create new document
    try {
      setSaving(true);
      
      let initialBlocks: any[] = [];
      if (templateId) {
        const template = templates.find(t => t.id === templateId);
        if (template) {
          initialBlocks = template.blocos_template;
        }
      }

      const { data: doc, error: docError } = await supabase
        .from('reunioes_documentos')
        .insert({
          ano: selectedDate.ano,
          mes: selectedDate.mes,
          dia: day,
          titulo_reuniao: 'Nova Reunião',
          status: 'rascunho',
          contribuidores: [user?.id],
          created_by: user?.id
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create initial blocks from template
      if (initialBlocks.length > 0) {
        const blocksToInsert = initialBlocks.map((block, index) => ({
          documento_id: doc.id,
          tipo: (block.tipo === 'texto' ? 'descricao' : block.tipo) as 'titulo' | 'descricao' | 'participantes' | 'pauta' | 'decisoes' | 'acoes',
          titulo: block.titulo,
          conteudo: block.conteudo,
          ordem: index,
          ancora: block.titulo ? block.titulo.toLowerCase().replace(/\s+/g, '-') : null
        }));

        const { data: createdBlocks, error: blocksError } = await supabase
          .from('reunioes_blocos')
          .insert(blocksToInsert)
          .select();

        if (blocksError) throw blocksError;
        
        const newDoc = {
          ...doc,
          blocos: createdBlocks
        };
        
        setDocuments(prev => ({ ...prev, [dayKey]: newDoc }));
        setCurrentDocument(newDoc);
        setBlocks(createdBlocks);
      } else {
        const newDoc = { ...doc, blocos: [] };
        setDocuments(prev => ({ ...prev, [dayKey]: newDoc }));
        setCurrentDocument(newDoc);
        setBlocks([]);
      }

      updateURL(selectedDate.ano, selectedDate.mes, day);
      
      toast({
        title: "Sucesso",
        description: "Documento criado com sucesso"
      });
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar documento",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateURL = (ano: number, mes: number, dia?: number) => {
    const params = new URLSearchParams();
    params.set('ano', ano.toString());
    params.set('mes', mes.toString());
    if (dia) params.set('dia', dia.toString());
    setSearchParams(params);
  };

  // Navigate to search result
  const navigateToSearchResult = async (result: SearchResult) => {
    try {
      // Load the document for the selected day
      const { data: doc, error } = await supabase
        .from('reunioes_documentos')
        .select(`
          *,
          reunioes_blocos (
            id,
            tipo,
            titulo,
            conteudo,
            ordem,
            ancora
          )
        `)
        .eq('id', result.documentId)
        .single();

      if (error) throw error;

      // Update URL and state to the target day
      setSelectedDate({ ano: result.year, mes: result.month, dia: result.day });
      updateURL(result.year, result.month, result.day);
      
      // Load the document and blocks
      const docWithBlocks = {
        ...doc,
        blocos: doc.reunioes_blocos?.sort((a, b) => a.ordem - b.ordem) || []
      };
      
      setCurrentDocument(docWithBlocks);
      setBlocks(docWithBlocks.blocos);

      // Scroll to the specific block after a short delay
      setTimeout(() => {
        const element = document.getElementById(`block-${result.blockId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Clear search to return to normal view
      setSearchQuery('');
      
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível navegar para o resultado",
        variant: "destructive"
      });
    }
  };

  const addBlock = (tipo: string, titulo?: string, descricao?: string, includeExtras?: any) => {
    const tipoDb = tipo === 'texto' ? 'descricao' : tipo;
    const newBlock: MeetingBlock = {
      id: `temp-${Date.now()}`,
      tipo: tipoDb,
      titulo: titulo || BLOCK_TYPES[tipoDb as keyof typeof BLOCK_TYPES]?.label || 'Novo Bloco',
      conteudo: {
        ...getDefaultContent(tipoDb),
        texto: descricao || '',
        ...(includeExtras?.includeAcoes ? { acoes: [] } : {}),
        ...(includeExtras?.includeDecisoes ? { decisoes: [] } : {}),
        ...(includeExtras?.includeFollowups ? { followups: [] } : {})
      },
      ordem: blocks.length > 0 ? Math.min(...blocks.map(b => b.ordem || 0)) + 1 : 1,
      ancora: null
    };
    
    // Insert after first block (position 2)
    const updatedBlocks = [...blocks];
    if (blocks.length > 0) {
      // Adjust order of existing blocks to make room
      updatedBlocks.forEach(block => {
        if ((block.ordem || 0) >= 1) {
          block.ordem = (block.ordem || 0) + 1;
        }
      });
      newBlock.ordem = 1;
    }
    
    updatedBlocks.push(newBlock);
    setBlocks(updatedBlocks);
    scheduleAutosave();
    
    // Scroll to new block after a brief delay
    setTimeout(() => {
      const element = document.getElementById(`block-${newBlock.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const getDefaultContent = (tipo: string) => {
    switch (tipo) {
      case 'participantes':
        return { lista: [] };
      case 'pauta':
        return { itens: [] };
      case 'acoes':
        return { checklist: [] };
      default:
        return { texto: '' };
    }
  };

  const updateBlock = (blockId: string, updates: Partial<MeetingBlock>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
    scheduleAutosave();
  };

  const scheduleAutosave = () => {
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current);
    }
    
    setSaveStatus('idle');
    
    autosaveTimeout.current = setTimeout(() => {
      saveDocument(true);
    }, 2000);
  };

  const saveDocument = async (isAutosave = false) => {
    if (!currentDocument) return;
    
    const debug = {
      userId: user?.id || null,
      docId: currentDocument?.id || null,
      date: selectedDate,
      blocksCount: blocks.length,
      timestamp: new Date().toISOString(),
    };

    console.group('[PautaReuniao] Save Debug');
    console.info('Save start', debug);
    
    try {
      setSaveStatus('saving');
      setSaving(true);
      
      // Update document
      const updatePayload = {
        titulo_reuniao: currentDocument.titulo_reuniao || 'Reunião',
        descricao: currentDocument.descricao || '',
        participantes: currentDocument.participantes ?? [],
        contribuidores: currentDocument.contribuidores ?? (user?.id ? [user.id] : []),
        ultima_atualizacao: new Date().toISOString()
      };
      console.info('Updating reunioes_documentos with', updatePayload);

      const { error: docError } = await supabase
        .from('reunioes_documentos')
        .update(updatePayload)
        .eq('id', currentDocument.id);

      if (docError) {
        console.error('Document update error', docError);
        throw docError;
      }

      // Delete existing blocks and recreate them
      console.info('Deleting previous blocks for documento_id', currentDocument.id);
      const { error: delError } = await supabase
        .from('reunioes_blocos')
        .delete()
        .eq('documento_id', currentDocument.id);
      if (delError) {
        console.error('Blocks delete error', delError);
        throw delError;
      }

      if (blocks.length > 0) {
        const blocksToInsert = blocks.map((block, index) => ({
          documento_id: currentDocument.id,
          tipo: (block.tipo === 'texto' ? 'descricao' : block.tipo) as "titulo" | "descricao" | "participantes" | "pauta" | "decisoes" | "acoes",
          titulo: block.titulo,
          conteudo: block.conteudo,
          ordem: index,
          ancora: block.titulo ? block.titulo.toLowerCase().replace(/\s+/g, '-') : null
        }));

        console.info('Inserting blocks', { count: blocksToInsert.length, sample: blocksToInsert[0] });

        const { error: blocksError } = await supabase
          .from('reunioes_blocos')
          .insert(blocksToInsert);

        if (blocksError) {
          console.error('Blocks insert error', blocksError);
          throw blocksError;
        }
      }

      const now = new Date();
      setLastSaved(now);
      setLastError(null);
      setSaveStatus('saved');
      console.info('Save success at', now.toISOString());
      
      if (isAutosave) {
        toast({
          title: "✅ Alterações salvas automaticamente",
          description: `às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          duration: 2000
        });
      } else {
        toast({
          title: "✅ Pauta salva com sucesso",
          description: "Todas as alterações foram salvas",
          duration: 3000
        });
      }

    } catch (error) {
      console.error('Save failed', { error, debug });
      setSaveStatus('error');
      
      const err = error as any;
      const description = err?.message || err?.hint || err?.details || 'Verifique sua conexão e tente novamente';
      setLastError(description);
      toast({
        title: "❌ Erro ao salvar",
        description,
        variant: "destructive"
      });
    } finally {
      console.groupEnd();
      setSaving(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const renderSidebar = () => (
    <Card className="w-80 h-fit">
      <CardHeader className="pb-3">
        {/* Search Field */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar pautas…"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {MONTHS[selectedDate.mes - 1]} {selectedDate.ano}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(false)}
            className="lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newDate = selectedDate.mes === 1 
                ? { ano: selectedDate.ano - 1, mes: 12 }
                : { ano: selectedDate.ano, mes: selectedDate.mes - 1 };
              setSelectedDate(newDate);
              updateURL(newDate.ano, newDate.mes);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newDate = selectedDate.mes === 12 
                ? { ano: selectedDate.ano + 1, mes: 1 }
                : { ano: selectedDate.ano, mes: selectedDate.mes + 1 };
              setSelectedDate(newDate);
              updateURL(newDate.ano, newDate.mes);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-3 mb-4">
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                  Buscando...
                </div>
              )}
              
              {searchResults.length > 0 && !isSearching && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}
                  </div>
                  
                  {/* Group results by date */}
                  {Object.entries(
                    searchResults.reduce((groups: { [key: string]: SearchResult[] }, result) => {
                      const dateKey = `${result.day}/${result.month}/${result.year}`;
                      if (!groups[dateKey]) groups[dateKey] = [];
                      groups[dateKey].push(result);
                      return groups;
                    }, {} as { [key: string]: SearchResult[] })
                  ).map(([dateKey, results]) => (
                    <div key={dateKey} className="space-y-2">
                      <div className="text-sm font-medium text-primary">
                        {dateKey}
                      </div>
                      <div className="space-y-1 ml-3">
                        {results.map((result) => (
                          <button
                            key={result.blockId}
                            onClick={() => navigateToSearchResult(result)}
                            className="w-full text-left p-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <div className="font-medium">{result.blockTitle}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {result.documentTitle}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {searchResults.length === 0 && !isSearching && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma pauta encontrada
                </div>
              )}
              
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="w-full"
                >
                  Limpar pesquisa
                </Button>
              </div>
            </div>
          )}
          
          {/* Normal Calendar View */}
          {!searchQuery && (
            <div className="space-y-2">
              {Array.from({ length: getDaysInMonth(selectedDate.ano, selectedDate.mes) }, (_, i) => {
              const day = i + 1;
              const dayKey = day.toString();
              const hasDocument = documents[dayKey];
              const isSelected = selectedDate.dia === day;
              
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted ${
                    isSelected ? 'bg-primary text-primary-foreground' : ''
                  }`}
                  onClick={() => {
                    setSelectedDate(prev => ({ ...prev, dia: day }));
                    if (hasDocument) {
                      setCurrentDocument(hasDocument);
                      setBlocks(hasDocument.blocos || []);
                    } else {
                      setCurrentDocument(null);
                      setBlocks([]);
                    }
                    updateURL(selectedDate.ano, selectedDate.mes, day);
                  }}
                >
                  <span>{day.toString().padStart(2, '0')}/{selectedDate.mes.toString().padStart(2, '0')}</span>
                  {hasDocument && (
                    <Badge variant={hasDocument.status === 'ata_concluida' ? 'default' : 'secondary'}>
                      {hasDocument.status === 'ata_concluida' ? '✅' : '📣'}
                    </Badge>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderTableOfContents = () => {
    const sortedBlocks = blocks
      .filter(block => block.titulo && block.titulo.trim())
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    if (sortedBlocks.length === 0) return null;

    const scrollToBlock = (blockId: string) => {
      const element = document.getElementById(`block-${blockId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    return (
      <Card className="w-64 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Índice da Reunião
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {selectedDate.dia}/{selectedDate.mes}/{selectedDate.ano}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-80">
            <div className="space-y-1 p-4">
              {sortedBlocks.map((block, index) => (
                <button
                  key={block.id}
                  onClick={() => scrollToBlock(block.id)}
                  className="w-full text-left px-2 py-1 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                >
                  <span className="text-xs text-muted-foreground font-mono">
                    {index + 1}
                  </span>
                  <span className="truncate">
                    {block.titulo || 'Sem título'}
                  </span>
                </button>
              ))}
              
              {sortedBlocks.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                  Nenhum bloco com título encontrado
                </p>
              )}
              
              <div className="mt-4 pt-2 border-t text-xs text-muted-foreground px-2">
                <p>Atalhos: J/K para navegar</p>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar */}
      {showSidebar && renderSidebar()}
      
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!showSidebar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidebar(true)}
                className="lg:hidden"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Pauta de Reunião
              </h1>
              <p className="text-muted-foreground">
                {selectedDate.dia 
                  ? `${selectedDate.dia}/${selectedDate.mes}/${selectedDate.ano}`
                  : `${MONTHS[selectedDate.mes - 1]} ${selectedDate.ano}`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                  Salvando...
                </span>
              )}
              {saveStatus === 'saved' && lastSaved && (
                <span className="text-green-600">
                  ✅ Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-600">❌ Erro ao salvar{lastError ? ` — ${lastError}` : ''}</span>
              )}
            </div>
            
            {currentDocument && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddPautaModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pauta
              </Button>
            )}
            
            {selectedDate.dia && !currentDocument && (
              <div className="flex gap-2">
                <Select onValueChange={(templateId) => createOrOpenDocument(selectedDate.dia!, templateId === "blank" ? undefined : templateId)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Usar template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Documento em branco</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => createOrOpenDocument(selectedDate.dia!)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Pauta
                </Button>
              </div>
            )}
            
            {currentDocument && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                <Button size="sm" onClick={() => saveDocument(false)} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          <div className="flex-1">
            {selectedDate.dia && !currentDocument ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhuma reunião agendada para {selectedDate.dia}/{selectedDate.mes}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Crie uma nova pauta de reunião para este dia
                  </p>
                  <Button onClick={() => createOrOpenDocument(selectedDate.dia!)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Pauta
                  </Button>
                </CardContent>
              </Card>
            ) : currentDocument ? (
              <div className="space-y-6">
                {/* Document Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Input
                        value={currentDocument.titulo_reuniao}
                        onChange={(e) => {
                          setCurrentDocument(prev => prev ? { ...prev, titulo_reuniao: e.target.value } : null);
                          scheduleAutosave();
                        }}
                        className="text-xl font-bold border-none p-0 h-auto bg-transparent"
                        placeholder="Título da reunião"
                      />
                      <Badge variant={currentDocument.status === 'ata_concluida' ? 'default' : 'secondary'}>
                        {currentDocument.status === 'ata_concluida' ? 'Ata Concluída' : 'Rascunho'}
                      </Badge>
                    </div>
                    <RichTextEditor
                      content={currentDocument.descricao || ''}
                      onChange={(content) => {
                        setCurrentDocument(prev => prev ? { ...prev, descricao: content } : null);
                        scheduleAutosave();
                      }}
                      placeholder="Descrição e objetivo da reunião"
                      className="mt-2"
                    />
                  </CardHeader>
                </Card>

                {/* Blocks */}
                {blocks.map((block, index) => (
                  <Card key={block.id} id={`block-${block.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {React.createElement(BLOCK_TYPES[block.tipo as keyof typeof BLOCK_TYPES]?.icon || FileText, {
                          className: "h-5 w-5"
                        })}
                        <Input
                          value={block.titulo || ''}
                          onChange={(e) => updateBlock(block.id, { titulo: e.target.value })}
                          className="border-none p-0 h-auto bg-transparent font-semibold"
                          placeholder="Título do bloco"
                        />
                        <Badge variant="outline" className="ml-2">
                          {index + 1}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderBlockContent(block)}
                    </CardContent>
                  </Card>
                ))}

              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Selecione um dia para visualizar ou criar uma pauta
                  </h3>
                  <p className="text-muted-foreground">
                    Use o calendário lateral para navegar pelos dias do mês
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Table of Contents */}
          {currentDocument && renderTableOfContents()}
        </div>
        
        {/* Save Status Footer */}
        {currentDocument && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-sm">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                  Salvando...
                </div>
              )}
              {saveStatus === 'saved' && lastSaved && (
                <div className="text-green-600">
                  ✅ Alterações salvas automaticamente às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="text-red-600">
                  ❌ Erro ao salvar - verifique sua conexão
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal para Adicionar Pauta */}
      <Dialog open={showAddPautaModal} onOpenChange={setShowAddPautaModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Pauta</DialogTitle>
            <DialogDescription>
              Crie um novo bloco de pauta para a reunião
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título da Pauta *</label>
              <Input
                value={newPautaData.titulo}
                onChange={(e) => setNewPautaData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Revisão do projeto X"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                value={newPautaData.descricao}
                onChange={(e) => setNewPautaData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva brevemente o tópico da pauta..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Seções adicionais</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-acoes"
                    checked={newPautaData.includeAcoes}
                    onCheckedChange={(checked) => 
                      setNewPautaData(prev => ({ ...prev, includeAcoes: checked as boolean }))
                    }
                  />
                  <label htmlFor="include-acoes" className="text-sm">
                    Incluir seção de Ações
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-decisoes"
                    checked={newPautaData.includeDecisoes}
                    onCheckedChange={(checked) => 
                      setNewPautaData(prev => ({ ...prev, includeDecisoes: checked as boolean }))
                    }
                  />
                  <label htmlFor="include-decisoes" className="text-sm">
                    Incluir seção de Decisões
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-followups"
                    checked={newPautaData.includeFollowups}
                    onCheckedChange={(checked) => 
                      setNewPautaData(prev => ({ ...prev, includeFollowups: checked as boolean }))
                    }
                  />
                  <label htmlFor="include-followups" className="text-sm">
                    Incluir seção de Follow-ups
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddPautaModal(false);
                setNewPautaData({
                  titulo: '',
                  descricao: '',
                  includeAcoes: false,
                  includeDecisoes: false,
                  includeFollowups: false
                });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (newPautaData.titulo.trim()) {
                  addBlock('descricao', newPautaData.titulo, newPautaData.descricao, {
                    includeAcoes: newPautaData.includeAcoes,
                    includeDecisoes: newPautaData.includeDecisoes,
                    includeFollowups: newPautaData.includeFollowups
                  });
                  setShowAddPautaModal(false);
                  setNewPautaData({
                    titulo: '',
                    descricao: '',
                    includeAcoes: false,
                    includeDecisoes: false,
                    includeFollowups: false
                  });
                }
              }}
              disabled={!newPautaData.titulo.trim()}
            >
              Criar Pauta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderBlockContent(block: MeetingBlock) {
    switch (block.tipo) {
      case 'participantes':
        return (
          <div className="space-y-2">
            {(block.conteudo.lista || []).map((participante: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={participante}
                  onChange={(e) => {
                    const newLista = [...(block.conteudo.lista || [])];
                    newLista[index] = e.target.value;
                    updateBlock(block.id, { 
                      conteudo: { ...block.conteudo, lista: newLista }
                    });
                  }}
                  placeholder="Nome do participante"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newLista = (block.conteudo.lista || []).filter((_: any, i: number) => i !== index);
                    updateBlock(block.id, { 
                      conteudo: { ...block.conteudo, lista: newLista }
                    });
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newLista = [...(block.conteudo.lista || []), ''];
                updateBlock(block.id, { 
                  conteudo: { ...block.conteudo, lista: newLista }
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Participante
            </Button>
          </div>
        );

      case 'pauta':
      case 'acoes':
        const items = block.conteudo.itens || block.conteudo.checklist || [];
        return (
          <div className="space-y-2">
            {items.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                {block.tipo === 'acoes' && (
                  <input
                    type="checkbox"
                    checked={typeof item === 'object' ? item.concluido : false}
                    onChange={(e) => {
                      const newItems = [...items];
                      if (typeof item === 'object') {
                        newItems[index] = { ...item, concluido: e.target.checked };
                      } else {
                        newItems[index] = { texto: item, concluido: e.target.checked };
                      }
                      const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
                      updateBlock(block.id, { 
                        conteudo: { ...block.conteudo, [key]: newItems }
                      });
                    }}
                  />
                )}
                <Input
                  value={typeof item === 'object' ? item.texto : item}
                  onChange={(e) => {
                    const newItems = [...items];
                    if (typeof item === 'object') {
                      newItems[index] = { ...item, texto: e.target.value };
                    } else {
                      newItems[index] = e.target.value;
                    }
                    const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
                    updateBlock(block.id, { 
                      conteudo: { ...block.conteudo, [key]: newItems }
                    });
                  }}
                  placeholder={block.tipo === 'pauta' ? "Item da pauta" : "Ação"}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newItems = items.filter((_: any, i: number) => i !== index);
                    const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
                    updateBlock(block.id, { 
                      conteudo: { ...block.conteudo, [key]: newItems }
                    });
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newItem = block.tipo === 'acoes' 
                  ? { texto: '', concluido: false }
                  : '';
                const newItems = [...items, newItem];
                const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
                updateBlock(block.id, { 
                  conteudo: { ...block.conteudo, [key]: newItems }
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {block.tipo === 'pauta' ? 'Adicionar Item' : 'Adicionar Ação'}
            </Button>
          </div>
        );

      default:
        return (
          <RichTextEditor
            content={block.conteudo.texto || ''}
            onChange={(content) => updateBlock(block.id, { 
              conteudo: { ...block.conteudo, texto: content }
            })}
            onTitleExtracted={(titles) => {
              // Update the block's extracted titles for index
              setExtractedTitles(prev => {
                const filtered = prev.filter(t => !titles.includes(t));
                return [...filtered, ...titles];
              });
            }}
            placeholder="Digite o conteúdo..."
            className="min-h-24"
          />
        );
    }
  }
}