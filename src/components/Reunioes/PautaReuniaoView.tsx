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
import { Label } from "@/components/ui/label";
import { WYSIWYGEditor } from "@/components/ui/WYSIWYGEditor";
import { Calendar, Plus, Save, FileText, Users, List, CheckSquare, Search, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Settings, BookOpen, X, Check, Clock, Hourglass, Trash2, Image, Video, Link, Upload, Expand, ChevronDown, ChevronUp, Minus, PlusIcon, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/components/Auth/AuthContext";
import { EnviarSlackModal } from "./EnviarSlackModal";
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
  cliente_id?: string | null;
  cliente_nome?: string | null;
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
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const BLOCK_TYPES = {
  titulo: {
    icon: FileText,
    label: 'Título'
  },
  descricao: {
    icon: FileText,
    label: 'Descrição'
  },
  participantes: {
    icon: Users,
    label: 'Participantes'
  },
  pauta: {
    icon: List,
    label: 'Pauta'
  },
  decisoes: {
    icon: CheckSquare,
    label: 'Decisões'
  },
  acoes: {
    icon: CheckSquare,
    label: 'Ações'
  }
};
export function PautaReuniaoView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    userData
  } = useCurrentUser();
  const {
    user
  } = useAuth();
  const [selectedDate, setSelectedDate] = useState<{
    ano: number;
    mes: number;
    dia?: number;
  }>({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    dia: undefined
  });
  const [documents, setDocuments] = useState<{
    [key: string]: MeetingDocument;
  }>({});
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
  const [newBlockInCreation, setNewBlockInCreation] = useState<string | null>(null);
  const [minimizedBlocks, setMinimizedBlocks] = useState<Set<string>>(new Set());
  const [showSlackModal, setShowSlackModal] = useState(false);

  // Removed realtime collaboration for better performance and stability

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    blockId: string | null;
    blockTitle: string;
  }>({
    isOpen: false,
    blockId: null,
    blockTitle: ''
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
    return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim();
  };
  const autosaveTimeout = useRef<NodeJS.Timeout>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isNavigatingMonths = useRef(false);

  useEffect(() => {
    // Se está navegando manualmente entre meses, não interferir
    if (isNavigatingMonths.current) return;
    
    // Parse URL parameters and auto-navigate to today or last selected day
    const yearParam = searchParams.get('ano');
    const monthParam = searchParams.get('mes');
    const dayParam = searchParams.get('dia');
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    if (yearParam && monthParam && dayParam) {
      // URL tem todos os parâmetros: usar diretamente
      const paramYear = parseInt(yearParam);
      const paramMonth = parseInt(monthParam);
      const selectedDay = parseInt(dayParam);
      
      // Sempre respeitar a URL, independente do mês/ano
      setSelectedDate({ ano: paramYear, mes: paramMonth, dia: selectedDay });
      
      // Persistir no localStorage
      localStorage.setItem('pauta-last-date', JSON.stringify({
        ano: paramYear,
        mes: paramMonth,
        dia: selectedDay
      }));
    } else {
      // Tentar carregar último dia do localStorage
      try {
        const savedDate = localStorage.getItem('pauta-last-date');
        if (savedDate) {
          const parsed = JSON.parse(savedDate);
          const savedDateObj = new Date(parsed.ano, parsed.mes - 1, parsed.dia);
          const daysDiff = Math.floor((today.getTime() - savedDateObj.getTime()) / (1000 * 60 * 60 * 24));
          const sameMonth = (savedDateObj.getFullYear() === currentYear) && (savedDateObj.getMonth() + 1 === currentMonth);
          // Só restaurar se for do mesmo mês atual e recente
          if (sameMonth && daysDiff >= 0 && daysDiff <= 30) {
            setSelectedDate(parsed);
            updateURL(parsed.ano, parsed.mes, parsed.dia);
            loadInitialData();
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load last date from localStorage', e);
      }
      
      // Sem URL ou mês mudou: ir para hoje (mês atual)
      setSelectedDate({
        ano: currentYear,
        mes: currentMonth,
        dia: currentDay
      });
      updateURL(currentYear, currentMonth, currentDay);
      localStorage.setItem('pauta-last-date', JSON.stringify({
        ano: currentYear,
        mes: currentMonth,
        dia: currentDay
      }));
    }
    loadInitialData();
  }, [searchParams]);

  // Trigger autosave when blocks change
  useEffect(() => {
    if (blocks.length > 0 && hasUnsavedChanges) {
      triggerAutosave();
    }
  }, [blocks, hasUnsavedChanges]);

  // Search debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchAcrossDocuments(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedDate.ano]);

  // Add keyboard shortcuts, blur events and unload for autosave
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument(false);
      }
    };
    
    const handleBlur = () => {
      if (currentDocument && blocks.length > 0) {
        saveDocument(true);
      }
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving' || autosaveTimeout.current) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current);
      }
    };
  }, [saveStatus, autosaveTimeout.current, currentDocument, blocks]);

  // Auto-scroll to selected day in calendar
  useEffect(() => {
    if (selectedDate.dia) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        const selectedElement = document.querySelector(`[data-calendar-day="${selectedDate.dia}"]`);
        if (selectedElement) {
          selectedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [selectedDate.dia]);


  // Keyboard shortcuts - Navigation and Day Switching
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Don't intercept keys when user is typing in input fields
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.contentEditable === 'true' ||
                      target.closest('[contenteditable="true"]');
      
      if (isTyping) return;
      
      // Block navigation (only when document is open)
      if (currentDocument && blocks.length > 0) {
        if (e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          navigateToNextBlock();
          return;
        } else if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          navigateToPreviousBlock();
          return;
        }
      }
      
      // Day navigation
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigateToPreviousDay();
      } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigateToNextDay();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        navigateToToday();
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [blocks, currentDocument, selectedDate]);
  // Day navigation functions
  const navigateToPreviousDay = async () => {
    if (!selectedDate.dia) return;
    
    const newDay = selectedDate.dia - 1;
    if (newDay < 1) {
      // Go to previous month
      const newMonth = selectedDate.mes === 1 ? 12 : selectedDate.mes - 1;
      const newYear = selectedDate.mes === 1 ? selectedDate.ano - 1 : selectedDate.ano;
      const daysInNewMonth = getDaysInMonth(newYear, newMonth);
      
      const newDate = { ano: newYear, mes: newMonth, dia: daysInNewMonth };
      setSelectedDate(newDate);
      updateURL(newYear, newMonth, daysInNewMonth);
      
      // Reload documents for the new month
      await loadDocumentsForDate(newYear, newMonth, daysInNewMonth);
    } else {
      setSelectedDate(prev => ({ ...prev, dia: newDay }));
      await createOrOpenDocument(newDay, undefined, selectedDate.ano, selectedDate.mes);
      updateURL(selectedDate.ano, selectedDate.mes, newDay);
    }
  };

  const navigateToNextDay = async () => {
    if (!selectedDate.dia) return;
    
    const daysInMonth = getDaysInMonth(selectedDate.ano, selectedDate.mes);
    const newDay = selectedDate.dia + 1;
    
    if (newDay > daysInMonth) {
      // Go to next month
      const newMonth = selectedDate.mes === 12 ? 1 : selectedDate.mes + 1;
      const newYear = selectedDate.mes === 12 ? selectedDate.ano + 1 : selectedDate.ano;
      
      const newDate = { ano: newYear, mes: newMonth, dia: 1 };
      setSelectedDate(newDate);
      updateURL(newYear, newMonth, 1);
      
      // Reload documents for the new month
      await loadDocumentsForDate(newYear, newMonth, 1);
    } else {
      setSelectedDate(prev => ({ ...prev, dia: newDay }));
      await createOrOpenDocument(newDay, undefined, selectedDate.ano, selectedDate.mes);
      updateURL(selectedDate.ano, selectedDate.mes, newDay);
    }
  };

  const navigateToToday = async () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    const newDate = { ano: currentYear, mes: currentMonth, dia: currentDay };
    setSelectedDate(newDate);
    updateURL(currentYear, currentMonth, currentDay);
    
    // Reload documents if month/year changed
    if (currentYear !== selectedDate.ano || currentMonth !== selectedDate.mes) {
      await loadDocumentsForDate(currentYear, currentMonth, currentDay);
    } else {
      const dayKey = currentDay.toString();
      if (documents[dayKey]) {
        setCurrentDocument(documents[dayKey]);
        setBlocks(documents[dayKey].blocos || []);
      } else {
        await createOrOpenDocument(currentDay, undefined, currentYear, currentMonth);
      }
    }
    
    toast({
      title: "📅 Hoje",
      description: `${currentDay}/${currentMonth}/${currentYear}`,
      duration: 2000
    });
  };

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
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
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
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  };
  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadDocuments(), loadTemplates()]);
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
    // FRESH FETCH - sem cache
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
    const docsMap: {
      [key: string]: MeetingDocument;
    } = {};
    data?.forEach(doc => {
      const dayKey = doc.dia.toString();
      docsMap[dayKey] = {
        ...doc,
        blocos: doc.reunioes_blocos?.sort((a, b) => a.ordem - b.ordem) || []
      };
    });
    setDocuments(docsMap);

    // If a specific day is selected, load it or create automatically
    if (selectedDate.dia && docsMap[selectedDate.dia.toString()]) {
      const doc = docsMap[selectedDate.dia.toString()];
      setCurrentDocument(doc);
      setBlocks(doc.blocos || []);
    } else if (selectedDate.dia && !docsMap[selectedDate.dia.toString()]) {
      // Se a URL tem dia especificado e não tem documento, criar automaticamente
      const hasUrlParams = searchParams.get('ano') && searchParams.get('mes') && searchParams.get('dia');
      
      if (hasUrlParams) {
        // URL completa = criar automaticamente para qualquer data
        await createOrOpenDocument(selectedDate.dia, undefined, selectedDate.ano, selectedDate.mes);
      } else {
        // Mesmo sem URL completa, permitir visualização vazia para seleção manual
        setCurrentDocument(null);
        setBlocks([]);
      }
    }
  };

  // Helper function to load documents for a specific date
  const loadDocumentsForDate = async (year: number, month: number, day: number) => {
    try {
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
        .eq('ano', year)
        .eq('mes', month)
        .order('dia');

      if (error) throw error;

      const docsMap: { [key: string]: MeetingDocument } = {};
      data?.forEach(doc => {
        const dayKey = doc.dia.toString();
        docsMap[dayKey] = {
          ...doc,
          blocos: doc.reunioes_blocos?.sort((a, b) => a.ordem - b.ordem) || []
        };
      });
      setDocuments(docsMap);

      // Load the specific day
      const dayKey = day.toString();
      if (docsMap[dayKey]) {
        setCurrentDocument(docsMap[dayKey]);
        setBlocks(docsMap[dayKey].blocos || []);
      } else {
        await createOrOpenDocument(day, undefined, year, month);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive"
      });
    }
  };
  const loadTemplates = async () => {
    const {
      data,
      error
    } = await supabase.from('reunioes_templates').select('*').eq('ativo', true).order('nome');
    if (error) throw error;
    setTemplates((data || []).map(t => ({
      ...t,
      blocos_template: typeof t.blocos_template === 'string' ? JSON.parse(t.blocos_template) : t.blocos_template
    })));
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
      const {
        data: allDocs,
        error
      } = await supabase.from('reunioes_documentos').select(`
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
        `).eq('ano', selectedDate.ano);
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
  const createOrOpenDocument = async (day: number, templateId?: string, yearOverride?: number, monthOverride?: number) => {
    const dayKey = day.toString();

    // Determine year/month to use (avoid stale state)
    const year = yearOverride ?? selectedDate.ano;
    const month = monthOverride ?? selectedDate.mes;

    // If document exists, just open it
    if (documents[dayKey]) {
      setCurrentDocument(documents[dayKey]);
      setBlocks(documents[dayKey].blocos || []);
      updateURL(year, month, day);
      return;
    }

    // Create or open document (server-side check to avoid duplicates)
    try {
      setSaving(true);
      let initialBlocks: any[] = [];
      if (templateId) {
        const template = templates.find(t => t.id === templateId);
        if (template) {
          initialBlocks = template.blocos_template;
        }
      }

      // Check if document already exists on server for this date
      const { data: existingDoc, error: fetchExistingError } = await supabase
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
        .eq('ano', year)
        .eq('mes', month)
        .eq('dia', day)
        .maybeSingle();

      if (fetchExistingError) {
        console.warn('Fetch existing doc error (non-fatal):', fetchExistingError);
      }

      if (existingDoc) {
        const docWithBlocks = {
          ...existingDoc,
          blocos: existingDoc.reunioes_blocos?.sort((a, b) => a.ordem - b.ordem) || []
        } as any;

        setDocuments(prev => ({ ...prev, [dayKey]: docWithBlocks }));
        setCurrentDocument(docWithBlocks);
        setBlocks(docWithBlocks.blocos || []);
        updateURL(year, month, day);
        return;
      }

      // Create new document
      const { data: doc, error: docError } = await supabase
        .from('reunioes_documentos')
        .insert({
          ano: year,
          mes: month,
          dia: day,
          titulo_reuniao: 'Nova Reunião',
          status: 'rascunho',
          contribuidores: [user?.id],
          created_by: user?.id
        })
        .select()
        .single();

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
        const {
          data: createdBlocks,
          error: blocksError
        } = await supabase.from('reunioes_blocos').insert(blocksToInsert).select();
        if (blocksError) throw blocksError;
        const newDoc = {
          ...doc,
          blocos: createdBlocks
        };
        setDocuments(prev => ({
          ...prev,
          [dayKey]: newDoc
        }));
        setCurrentDocument(newDoc);
        setBlocks(createdBlocks);
      } else {
        const newDoc = {
          ...doc,
          blocos: []
        };
        setDocuments(prev => ({
          ...prev,
          [dayKey]: newDoc
        }));
        setCurrentDocument(newDoc);
        setBlocks([]);
      }
      updateURL(year, month, day);
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
    if (dia) {
      params.set('dia', dia.toString());
      // Persistir no localStorage
      localStorage.setItem('pauta-last-date', JSON.stringify({ ano, mes, dia }));
    }
    setSearchParams(params);
  };

  // Navigate to search result
  const navigateToSearchResult = async (result: SearchResult) => {
    try {
      // Load the document for the selected day
      const {
        data: doc,
        error
      } = await supabase.from('reunioes_documentos').select(`
          *,
          reunioes_blocos (
            id,
            tipo,
            titulo,
            conteudo,
            ordem,
            ancora
          )
        `).eq('id', result.documentId).single();
      if (error) throw error;

      // Update URL and state to the target day
      setSelectedDate({
        ano: result.year,
        mes: result.month,
        dia: result.day
      });
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
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
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
  const addNewPautaInline = () => {
    if (!currentDocument) return;
    const newBlock: MeetingBlock = {
      id: `temp-${Date.now()}`,
      tipo: 'descricao',
      titulo: '',
      conteudo: {
        texto: ''
      },
      ordem: blocks.length,
      ancora: null
    };
    setBlocks(prev => [...prev, newBlock]);
    setNewBlockInCreation(newBlock.id);

    // Focus no título após um breve delay
    setTimeout(() => {
      const titleInput = document.querySelector(`#title-input-${newBlock.id}`) as HTMLInputElement;
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 100);
  };
  const handleBlockTitleChange = (blockId: string, title: string) => {
    updateBlock(blockId, {
      titulo: title
    });
    setHasUnsavedChanges(true);

    // Se estiver criando um novo bloco e o título foi preenchido, não é mais "em criação"
    if (newBlockInCreation === blockId && title.trim()) {
      setNewBlockInCreation(null);
    }
  };
  const handleBlockContentChange = (blockId: string, content: string) => {
    updateBlock(blockId, {
      conteudo: {
        ...blocks.find(b => b.id === blockId)?.conteudo,
        texto: content
      }
    });
    setHasUnsavedChanges(true);

    // Se estiver criando um novo bloco e o conteúdo foi preenchido, não é mais "em criação"
    if (newBlockInCreation === blockId && content.trim()) {
      setNewBlockInCreation(null);
    }
  };
  const shouldDiscardBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return false;
    const hasTitle = block.titulo?.trim();
    const hasContent = block.conteudo?.texto?.trim();
    return !hasTitle && !hasContent;
  };
  const discardEmptyBlock = (blockId: string) => {
    if (shouldDiscardBlock(blockId)) {
      setBlocks(prev => prev.filter(b => b.id !== blockId));
      if (newBlockInCreation === blockId) {
        setNewBlockInCreation(null);
      }
      // Remove from minimized blocks if it was minimized
      setMinimizedBlocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(blockId);
        return newSet;
      });
    }
  };
  const toggleBlockMinimized = (blockId: string) => {
    setMinimizedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  // Function to prepare agenda data for Slack
  const prepareAgendaForSlack = () => {
    if (!currentDocument) return null;

    // Combine main content and blocks
    let fullContent = currentDocument.descricao || '';
    blocks.forEach(block => {
      if (block.titulo) {
        fullContent += `\n\n**${block.titulo}**\n`;
      }
      switch (block.tipo) {
        case 'participantes':
          if (block.conteudo.lista?.length > 0) {
            fullContent += block.conteudo.lista.map((p: string) => `• ${p}`).join('\n');
          }
          break;
        case 'pauta':
        case 'acoes':
          const items = block.conteudo.itens || block.conteudo.checklist || [];
          if (items.length > 0) {
            fullContent += items.map((item: any) => {
              const text = typeof item === 'object' ? item.texto : item;
              const checkbox = block.tipo === 'acoes' && typeof item === 'object' ? item.concluido ? '☑️' : '☐' : '•';
              return `${checkbox} ${text}`;
            }).join('\n');
          }
          break;
        default:
          if (block.conteudo.texto) {
            fullContent += block.conteudo.texto;
          }
      }
    });
    return {
      title: currentDocument.titulo_reuniao,
      date: `${selectedDate.dia}/${selectedDate.mes}/${selectedDate.ano}`,
      content: fullContent,
      attachments: [] // TODO: Extract attachment URLs if needed
    };
  };
  const getDefaultContent = (tipo: string) => {
    switch (tipo) {
      case 'participantes':
        return {
          lista: []
        };
      case 'pauta':
        return {
          itens: []
        };
      case 'acoes':
        return {
          checklist: []
        };
      default:
        return {
          texto: ''
        };
    }
  };
  const updateBlock = (blockId: string, updates: Partial<MeetingBlock>) => {
    setBlocks(prev => prev.map(block => block.id === blockId ? {
      ...block,
      ...updates
    } : block));
    scheduleAutosave();
  };
  const scheduleAutosave = () => {
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current);
    }
    setSaveStatus('saving');
    setHasUnsavedChanges(true);

    // Autosave mais agressivo: 1.5s após parar de digitar
    autosaveTimeout.current = setTimeout(() => {
      saveDocument(true);
    }, 1500); // Reduzido de 2500ms para 1500ms
  };

  const triggerAutosave = () => {
    if (currentDocument && blocks.length > 0) {
      scheduleAutosave();
    }
  };
  const deleteBlock = async (blockId: string) => {
    try {
      // Remove block from local state
      const updatedBlocks = blocks.filter(block => block.id !== blockId);
      setBlocks(updatedBlocks);

      // Trigger autosave to persist the deletion
      scheduleAutosave();
      toast({
        title: "Pauta excluída",
        description: "A pauta foi removida com sucesso"
      });
    } catch (error) {
      console.error('Error deleting block:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir a pauta",
        variant: "destructive"
      });
    }
  };
  const handleDeleteBlock = (blockId: string, blockTitle: string) => {
    setDeleteConfirmation({
      isOpen: true,
      blockId,
      blockTitle: blockTitle || 'Pauta sem título'
    });
  };
  const confirmDeleteBlock = () => {
    if (deleteConfirmation.blockId) {
      deleteBlock(deleteConfirmation.blockId);
    }
    setDeleteConfirmation({
      isOpen: false,
      blockId: null,
      blockTitle: ''
    });
  };
  const saveDocument = async (isAutosave = false) => {
    if (!currentDocument) return;
    const debug = {
      userId: user?.id || null,
      docId: currentDocument?.id || null,
      date: selectedDate,
      blocksCount: blocks.length,
      timestamp: new Date().toISOString()
    };
    console.group('[PautaReuniao] Save Debug');
    console.info('Save start', debug);
    try {
      setSaveStatus('saving');
      setSaving(true);

      // Update document
      // Garantir que o usuário atual esteja sempre nos contribuidores
      const contribuidores = currentDocument.contribuidores || [];
      const currentUserId = user?.id;
      if (currentUserId && !contribuidores.includes(currentUserId)) {
        contribuidores.push(currentUserId);
      }
      
      // Concatenar conteúdo de todos os blocos em texto plano para busca
      const conteudoTexto = blocks
        .map(block => {
          let text = '';
          if (block.titulo) text += `## ${block.titulo}\n\n`;
          if (block.conteudo) {
            // Remover HTML tags e converter para texto puro
            const plainText = block.conteudo.replace(/<[^>]*>/g, '').trim();
            text += `${plainText}\n\n`;
          }
          return text;
        })
        .join('');

      const updatePayload = {
        titulo_reuniao: currentDocument.titulo_reuniao || 'Reunião',
        participantes: currentDocument.participantes ?? [],
        contribuidores: contribuidores.length > 0 ? contribuidores : (currentUserId ? [currentUserId] : []),
        ultima_atualizacao: new Date().toISOString(),
        conteudo_texto: conteudoTexto
      };
      console.info('Updating reunioes_documentos with', updatePayload);
      const {
        error: docError
      } = await supabase.from('reunioes_documentos').update(updatePayload).eq('id', currentDocument.id);
      if (docError) {
        console.error('Document update error', docError);
        throw docError;
      }

      // Delete existing blocks and recreate them
      console.info('Deleting previous blocks for documento_id', currentDocument.id);
      const {
        error: delError
      } = await supabase.from('reunioes_blocos').delete().eq('documento_id', currentDocument.id);
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
        console.info('Inserting blocks', {
          count: blocksToInsert.length,
          sample: blocksToInsert[0]
        });
        const {
          error: blocksError
        } = await supabase.from('reunioes_blocos').insert(blocksToInsert);
        if (blocksError) {
          console.error('Blocks insert error', blocksError);
          throw blocksError;
        }
      }
      const now = new Date();
      setLastSaved(now);
      setLastError(null);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      console.info('Save success at', now.toISOString());
      
      if (isAutosave) {
        toast({
          title: "✅ Salvo automaticamente",
          description: `às ${now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}`,
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
      console.error('Save failed', {
        error,
        debug
      });
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
  const renderSidebar = () => <Card className="w-64 h-fit">{/* Reduced from w-72 to w-64 */}
      <CardHeader className="pb-1 px-2 pt-2">{/* Reduced padding */}
        {/* Search Field */}
        <div className="mb-2">{/* Reduced margin */}
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Pesquisar pautas…" className="pl-7 h-8 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && <Button variant="ghost" size="sm" className="absolute right-1 top-0.5 h-5 w-5 p-0" onClick={() => setSearchQuery('')}>
                <X className="h-3 w-3" />
              </Button>}
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {MONTHS[selectedDate.mes - 1]} {selectedDate.ano}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)} className="lg:hidden h-6 w-6 p-0">
            <ArrowLeft className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={async () => {
            isNavigatingMonths.current = true;
            
            const newMonth = selectedDate.mes === 1 ? 12 : selectedDate.mes - 1;
            const newYear = selectedDate.mes === 1 ? selectedDate.ano - 1 : selectedDate.ano;
            const newDate = { ano: newYear, mes: newMonth, dia: undefined };
            
            setSelectedDate(newDate);
            updateURL(newYear, newMonth);
            
            // Salvar mês atual no localStorage (sem dia)
            localStorage.setItem('pauta-last-date', JSON.stringify({
              ano: newYear,
              mes: newMonth
            }));
            
            // Load documents for new month
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
              .eq('ano', newYear)
              .eq('mes', newMonth)
              .order('dia');

            if (!error && data) {
              const docsMap: { [key: string]: MeetingDocument } = {};
              data.forEach(doc => {
                const dayKey = doc.dia.toString();
                docsMap[dayKey] = {
                  ...doc,
                  blocos: doc.reunioes_blocos?.sort((a, b) => a.ordem - b.ordem) || []
                };
              });
              setDocuments(docsMap);
              setCurrentDocument(null);
              setBlocks([]);
            }
            
            // Liberar flag após carregar
            setTimeout(() => {
              isNavigatingMonths.current = false;
            }, 500);
          }}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={async () => {
            isNavigatingMonths.current = true;
            
            const newMonth = selectedDate.mes === 12 ? 1 : selectedDate.mes + 1;
            const newYear = selectedDate.mes === 12 ? selectedDate.ano + 1 : selectedDate.ano;
            const newDate = { ano: newYear, mes: newMonth, dia: undefined };
            
            setSelectedDate(newDate);
            updateURL(newYear, newMonth);
            
            // Salvar mês atual no localStorage (sem dia)
            localStorage.setItem('pauta-last-date', JSON.stringify({
              ano: newYear,
              mes: newMonth
            }));
            
            // Load documents for new month
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
              .eq('ano', newYear)
              .eq('mes', newMonth)
              .order('dia');

            if (!error && data) {
              const docsMap: { [key: string]: MeetingDocument } = {};
              data.forEach(doc => {
                const dayKey = doc.dia.toString();
                docsMap[dayKey] = {
                  ...doc,
                  blocos: doc.reunioes_blocos?.sort((a, b) => a.ordem - b.ordem) || []
                };
              });
              setDocuments(docsMap);
              setCurrentDocument(null);
              setBlocks([]);
            }
            
            // Liberar flag após carregar
            setTimeout(() => {
              isNavigatingMonths.current = false;
            }, 500);
          }}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ScrollArea className="h-80">
          {/* Search Results */}
          {searchQuery && <div className="space-y-2 mb-3">
              {isSearching && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="animate-spin h-2 w-2 border border-primary border-t-transparent rounded-full"></div>
                  Buscando...
                </div>}
              
              {searchResults.length > 0 && !isSearching && <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}
                  </div>
                  
                  {/* Group results by date */}
                  {Object.entries(searchResults.reduce((groups: {
              [key: string]: SearchResult[];
            }, result) => {
              const dateKey = `${result.day}/${result.month}/${result.year}`;
              if (!groups[dateKey]) groups[dateKey] = [];
              groups[dateKey].push(result);
              return groups;
            }, {} as {
              [key: string]: SearchResult[];
            })).map(([dateKey, results]) => <div key={dateKey} className="space-y-1">
                      <div className="text-xs font-medium text-primary">
                        {dateKey}
                      </div>
                      <div className="space-y-1 ml-2">
                        {results.map(result => <button key={result.blockId} onClick={() => navigateToSearchResult(result)} className="w-full text-left p-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors">
                            <div className="font-medium">{result.blockTitle}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {result.documentTitle}
                            </div>
                          </button>)}
                      </div>
                    </div>)}
                </div>}
              
              {searchResults.length === 0 && !isSearching && <div className="text-xs text-muted-foreground text-center py-3">
                  Nenhuma pauta encontrada
                </div>}
              
              <div className="border-t pt-2">
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="w-full h-7 text-xs">
                  Limpar pesquisa
                </Button>
              </div>
            </div>}
          
          {/* Normal Calendar View */}
          {!searchQuery && <div className="space-y-1">
              {Array.from({
            length: getDaysInMonth(selectedDate.ano, selectedDate.mes)
          }, (_, i) => {
            const day = i + 1;
            const dayKey = day.toString();
            const hasDocument = documents[dayKey];
            const isSelected = selectedDate.dia === day;
            const today = new Date();
            const currentDay = new Date(selectedDate.ano, selectedDate.mes - 1, day);
            const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const currentDate = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
            const isToday = currentDate.getTime() === todayDate.getTime();
            return <div 
              key={day} 
              data-calendar-day={day}
              className={`
                flex items-center justify-between p-2 rounded-md cursor-pointer transition-all text-sm
                ${isSelected ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/50' : 'hover:bg-muted'}
                ${isToday && !isSelected ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800' : ''}
              `} 
              onClick={async () => {
              setSelectedDate(prev => ({
                ...prev,
                dia: day
              }));
              await createOrOpenDocument(day, undefined, selectedDate.ano, selectedDate.mes);
            }}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono ${isSelected ? 'font-bold' : ''}`}>
                      {day}/{selectedDate.mes}
                    </span>
                    {isSelected && <Badge variant="default" className="text-xs px-1.5 py-0 h-5">
                        Ativo
                      </Badge>}
                    {isToday && !isSelected && <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                        Hoje
                      </Badge>}
                  </div>
                  {(() => {
                if (currentDate < todayDate) {
                  // Past day
                  return <Check className="h-3 w-3 text-green-600" />;
                } else if (isToday) {
                  // Today
                  return <Calendar className="h-3 w-3 text-blue-600" />;
                } else {
                  // Future day
                  return <Hourglass className="h-3 w-3 text-orange-600" />;
                }
              })()}
                </div>;
          })}
            </div>}
        </ScrollArea>
      </CardContent>
    </Card>;
  const renderTableOfContents = () => {
    // Índice deve listar apenas as pautas (blocos com título), começando em 1
    const items = blocks
      .filter(block => block.titulo && block.titulo.trim())
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    if (items.length === 0) return null;

    const scrollToItem = (itemId: string) => {
      const element = document.getElementById(`block-${itemId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    };

    return <Card className="w-56 h-fit">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-3 w-3" />
            Índice
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {selectedDate.dia}/{selectedDate.mes}/{selectedDate.ano}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-72">
            <div className="space-y-0.5 px-3 pb-3">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => scrollToItem(item.id)}
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                >
                  <span className="text-xs text-muted-foreground font-mono w-4">
                    {index + 1}
                  </span>
                  <span className="truncate text-xs">
                    {item.titulo || 'Sem título'}
                  </span>
                </button>
              ))}

              {items.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                  Nenhum item com título encontrado
                </p>
              )}

              <div className="mt-3 pt-2 border-t text-xs text-muted-foreground px-2">
                <p className="text-xs">Atalhos: J/K para navegar</p>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>;
  };
  const renderBlockContent = (block: MeetingBlock) => {
    switch (block.tipo) {
      case 'participantes':
        return <div className="space-y-2">
            {(block.conteudo.lista || []).map((participante: string, index: number) => <div key={index} className="flex items-center gap-2">
                <Input value={participante} onChange={e => {
              const newLista = [...(block.conteudo.lista || [])];
              newLista[index] = e.target.value;
              updateBlock(block.id, {
                conteudo: {
                  ...block.conteudo,
                  lista: newLista
                }
              });
            }} placeholder="Nome do participante" />
                <Button variant="ghost" size="sm" onClick={() => {
              const newLista = (block.conteudo.lista || []).filter((_: any, i: number) => i !== index);
              updateBlock(block.id, {
                conteudo: {
                  ...block.conteudo,
                  lista: newLista
                }
              });
            }}>
                  ×
                </Button>
              </div>)}
            <Button variant="outline" size="sm" onClick={() => {
            const newLista = [...(block.conteudo.lista || []), ''];
            updateBlock(block.id, {
              conteudo: {
                ...block.conteudo,
                lista: newLista
              }
            });
          }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Participante
            </Button>
          </div>;
      case 'pauta':
      case 'acoes':
        const items = block.conteudo.itens || block.conteudo.checklist || [];
        return <div className="space-y-2">
            {items.map((item: any, index: number) => <div key={index} className="flex items-center gap-2">
                {block.tipo === 'acoes' && <input type="checkbox" checked={typeof item === 'object' ? item.concluido : false} onChange={e => {
              const newItems = [...items];
              if (typeof item === 'object') {
                newItems[index] = {
                  ...item,
                  concluido: e.target.checked
                };
              } else {
                newItems[index] = {
                  texto: item,
                  concluido: e.target.checked
                };
              }
              const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
              updateBlock(block.id, {
                conteudo: {
                  ...block.conteudo,
                  [key]: newItems
                }
              });
            }} />}
                <Input value={typeof item === 'object' ? item.texto : item} onChange={e => {
              const newItems = [...items];
              if (typeof item === 'object') {
                newItems[index] = {
                  ...item,
                  texto: e.target.value
                };
              } else {
                newItems[index] = e.target.value;
              }
              const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
              updateBlock(block.id, {
                conteudo: {
                  ...block.conteudo,
                  [key]: newItems
                }
              });
            }} placeholder={block.tipo === 'pauta' ? "Item da pauta" : "Ação"} />
                <Button variant="ghost" size="sm" onClick={() => {
              const newItems = items.filter((_: any, i: number) => i !== index);
              const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
              updateBlock(block.id, {
                conteudo: {
                  ...block.conteudo,
                  [key]: newItems
                }
              });
            }}>
                  ×
                </Button>
              </div>)}
            <Button variant="outline" size="sm" onClick={() => {
            const newItem = block.tipo === 'acoes' ? {
              texto: '',
              concluido: false
            } : '';
            const newItems = [...items, newItem];
            const key = block.tipo === 'acoes' ? 'checklist' : 'itens';
            updateBlock(block.id, {
              conteudo: {
                ...block.conteudo,
                [key]: newItems
              }
            });
          }}>
              <Plus className="h-4 w-4 mr-2" />
              {block.tipo === 'pauta' ? 'Adicionar Item' : 'Adicionar Ação'}
            </Button>
          </div>;
      default:
        return <WYSIWYGEditor
          content={block.conteudo.texto || ''}
          onChange={content => handleBlockContentChange(block.id, content)}
          onTitleExtracted={() => {}}
          placeholder="Digite o conteúdo da pauta..."
          showToolbar={true}
        />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return (
    <div className="flex gap-4 h-full max-w-screen-2xl mx-auto">
        {/* Sidebar */}
        {showSidebar && renderSidebar()}
        
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Header */}
          <div className="space-y-3">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                {!showSidebar && <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)} className="lg:hidden h-7">
                  <ArrowRight className="h-3 w-3" />
                </Button>}
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Pauta de Reunião
                </h1>
                <p className="text-sm text-muted-foreground">
                  {selectedDate.dia ? `${selectedDate.dia}/${selectedDate.mes}/${selectedDate.ano}` : `${MONTHS[selectedDate.mes - 1]} ${selectedDate.ano}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Save Status */}
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saving' && <span className="text-muted-foreground flex items-center gap-1">
                    <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                    Salvando...
                  </span>}
                {saveStatus === 'saved' && lastSaved && !hasUnsavedChanges && <span className="text-green-600 text-xs">
                    ✅ Salvo às {lastSaved.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
                  </span>}
                {hasUnsavedChanges && saveStatus !== 'saving' && <span className="text-orange-600 text-xs">
                    🔄 Aguardando salvamento...
                  </span>}
                {saveStatus === 'error' && <span className="text-red-600 text-xs">❌ Erro ao salvar{lastError ? ` — ${lastError}` : ''}</span>}
              </div>
              
              
              {currentDocument && <Button variant="outline" size="sm" onClick={addNewPautaInline} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Nova Pauta
                </Button>}
              
              {currentDocument && <Button size="sm" onClick={() => saveDocument(false)} disabled={saving || saveStatus === 'saving'} variant={hasUnsavedChanges ? "default" : "outline"} className="h-7 text-xs">
                  <Save className="h-3 w-3 mr-1" />
                  {hasUnsavedChanges ? 'Salvar Agora' : 'Salvo'}
                </Button>}
            </div>
            
          </div>

          {/* Content */}
          <div className="flex gap-4">
            <div className="flex-1">
              {currentDocument ? <div className="space-y-4">
                  {/* Blocks */}
                  {blocks.map((block, index) => {
              const isMinimized = minimizedBlocks.has(block.id);
              return <Card key={block.id} id={`block-${block.id}`} className="border-l-2 border-l-muted">
                        <CardHeader className="pb-2">
                           <CardTitle className="flex items-center gap-2 text-base">
                             {React.createElement(BLOCK_TYPES[block.tipo as keyof typeof BLOCK_TYPES]?.icon || FileText, {
                      className: "h-4 w-4"
                    })}
                             <Input id={`title-input-${block.id}`} value={block.titulo || ''} onChange={e => handleBlockTitleChange(block.id, e.target.value)} onBlur={() => {
                      // Se é um bloco novo sendo criado e está vazio, descartar
                      if (newBlockInCreation === block.id) {
                        discardEmptyBlock(block.id);
                      }
                    }} className="border-none p-0 h-auto bg-transparent font-bold flex-1 text-foreground text-lg" placeholder="Título da pauta" style={{
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }} />
                             <Badge variant="outline" className="ml-2 text-xs h-5">
                               {index + 1}
                             </Badge>
                             
                             {/* Botão Minimizar/Expandir */}
                             <Button variant="ghost" size="sm" onClick={() => toggleBlockMinimized(block.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title={isMinimized ? 'Expandir pauta' : 'Minimizar pauta'}>
                               {isMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                             </Button>
                             
                             <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(block.id, block.titulo || '')} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0">
                               <Trash2 className="h-3 w-3" />
                             </Button>
                           </CardTitle>
                        </CardHeader>
                        
                        {/* Conteúdo - só mostra se não estiver minimizado */}
                        {!isMinimized && <CardContent className="pt-2">
                            {renderBlockContent(block)}
                          </CardContent>}
                        
                        {/* Indicador visual quando minimizado */}
                        {isMinimized && <CardContent className="pt-0 pb-2">
                            <div className="text-xs text-muted-foreground italic">
                              Conteúdo minimizado - clique em ▼ para expandir
                            </div>
                          </CardContent>}
                      </Card>;
            })}

                  {/* Botão Nova Pauta inline no final */}
                  {currentDocument && <Card className="border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors">
                      <CardContent className="text-center py-8">
                        <Button variant="outline" onClick={addNewPautaInline} className="text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Pauta
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Adicione um novo tópico à reunião
                        </p>
                      </CardContent>
                    </Card>}

                </div> : <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    {selectedDate.dia ? (
                      <>
                        <h3 className="text-lg font-semibold mb-2">
                          Nenhuma pauta registrada para {selectedDate.dia}/{selectedDate.mes}/{selectedDate.ano}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {(() => {
                            const today = new Date();
                            const selectedDateObj = new Date(selectedDate.ano, selectedDate.mes - 1, selectedDate.dia);
                            const todayObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const isToday = selectedDateObj.getTime() === todayObj.getTime();
                            
                            if (isToday) {
                              return "Clique em 'Nova Pauta' para começar a agenda de hoje.";
                            } else if (selectedDateObj > todayObj) {
                              return "Clique em 'Nova Pauta' para criar a agenda deste dia.";
                            } else {
                              return "Este dia não possui agenda registrada.";
                            }
                          })()}
                        </p>
                        {(() => {
                          const today = new Date();
                          const selectedDateObj = new Date(selectedDate.ano, selectedDate.mes - 1, selectedDate.dia);
                          const todayObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                           return selectedDateObj >= todayObj && (
                             <Button onClick={() => createOrOpenDocument(selectedDate.dia!, undefined, selectedDate.ano, selectedDate.mes)} className="mt-2">
                               <Plus className="h-4 w-4 mr-2" />
                               Nova Pauta
                             </Button>
                           );
                        })()}
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold mb-2">
                          Selecione um dia para visualizar ou criar uma pauta
                        </h3>
                        <p className="text-muted-foreground">
                          Use o calendário lateral para navegar pelos dias do mês
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>}
            </div>
            
            {/* Table of Contents */}
            {currentDocument && renderTableOfContents()}
          </div>
        
          {/* Save Status Footer */}
          {currentDocument && <div className="fixed bottom-4 right-4 z-50">
              <div className="bg-background border rounded-lg shadow-lg px-2 py-1.5 text-xs">
                {saveStatus === 'saving' && <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin h-2 w-2 border border-primary border-t-transparent rounded-full"></div>
                    Salvando...
                  </div>}
                {saveStatus === 'saved' && lastSaved && !hasUnsavedChanges && <div className="text-green-600">
                    ✅ Salvo às {lastSaved.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
                  </div>}
                {hasUnsavedChanges && saveStatus !== 'saving' && <div className="text-orange-600">
                    🔄 Aguardando salvamento...
                  </div>}
                {saveStatus === 'error' && <div className="text-red-600">
                    ❌ Erro ao salvar - verifique sua conexão
                  </div>}
              </div>
            </div>}
      </div>
      
      {/* Modal de confirmação de exclusão */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={open => !open && setDeleteConfirmation({
      isOpen: false,
      blockId: null,
      blockTitle: ''
    })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Pauta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta pauta? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium">Pauta: {deleteConfirmation.blockTitle}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation({
            isOpen: false,
            blockId: null,
            blockTitle: ''
          })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteBlock}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Enviar no Slack */}
      {currentDocument && <EnviarSlackModal 
        isOpen={showSlackModal} 
        onClose={() => setShowSlackModal(false)} 
        agenda={prepareAgendaForSlack() || {
          title: '',
          date: '',
          content: '',
          attachments: []
        }} 
       />}
    </div>
  </div>
  );
}