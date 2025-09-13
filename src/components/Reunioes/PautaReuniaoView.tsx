import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Save, 
  FileText, 
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Bold,
  Italic,
  Underline,
  List,
  CheckSquare,
  Link,
  Palette,
  Plus,
  Type,
  MoreHorizontal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/Auth/AuthContext";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MeetingDocument {
  id: string;
  ano: number;
  mes: number;
  dia: number;
  titulo_reuniao: string;
  descricao: string | null;
  status: string;
  ultima_atualizacao: string;
  created_by: string;
  conteudo_texto: string;
  participantes: string[]; // títulos das reuniões do dia
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function PautaReuniaoView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<{ano: number, mes: number, dia?: number}>({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    dia: new Date().getDate()
  });
  
  const [documents, setDocuments] = useState<{[key: string]: MeetingDocument}>({});
  const [currentDocument, setCurrentDocument] = useState<MeetingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showToolbar, setShowToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  
  const autosaveTimeout = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Parse URL parameters ou auto-navegar para hoje
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
        dia: dayParam ? parseInt(dayParam) : currentDay
      });
    } else {
      // Auto-navegar para hoje
      setSelectedDate({
        ano: currentYear,
        mes: currentMonth,
        dia: currentDay
      });
      updateURL(currentYear, currentMonth, currentDay);
    }
    
    loadInitialData();
  }, [searchParams]);

  useEffect(() => {
    // Carregar documento quando a data selecionada muda
    if (selectedDate.dia) {
      loadDocumentForDate(selectedDate.ano, selectedDate.mes, selectedDate.dia);
    }
  }, [selectedDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadDocuments();
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
      .select('*')
      .eq('ano', selectedDate.ano)
      .eq('mes', selectedDate.mes)
      .order('dia');

    if (error) throw error;

    const docsMap: {[key: string]: MeetingDocument} = {};
    data?.forEach(doc => {
      const dayKey = doc.dia.toString();
      docsMap[dayKey] = doc;
    });
    
    setDocuments(docsMap);
    
    // Se temos um dia selecionado e existe documento para ele, carregá-lo
    if (selectedDate.dia && docsMap[selectedDate.dia.toString()]) {
      setCurrentDocument(docsMap[selectedDate.dia.toString()]);
    }
  };

  const loadDocumentForDate = async (ano: number, mes: number, dia: number) => {
    const dayKey = dia.toString();
    
    // Se já existe na cache, usar
    if (documents[dayKey]) {
      setCurrentDocument(documents[dayKey]);
      return;
    }

    // Buscar no banco se existe documento para esta data
    try {
      const { data: existingDoc, error } = await supabase
        .from('reunioes_documentos')
        .select('*')
        .eq('ano', ano)
        .eq('mes', mes)
        .eq('dia', dia)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (existingDoc) {
        // Documento já existe, usar ele
        setDocuments(prev => ({ ...prev, [dayKey]: existingDoc }));
        setCurrentDocument(existingDoc);
      } else {
        // Documento não existe, criar novo
        await createDocumentForDate(ano, mes, dia);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documento",
        variant: "destructive"
      });
    }
  };

  const createDocumentForDate = async (ano: number, mes: number, dia: number) => {
    try {
      setSaving(true);
      
      // Verificar novamente se não existe (por segurança)
      const { data: existing } = await supabase
        .from('reunioes_documentos')
        .select('id')
        .eq('ano', ano)
        .eq('mes', mes)
        .eq('dia', dia)
        .maybeSingle();

      if (existing) {
        // Documento já existe, recarregar
        await loadDocuments();
        return;
      }

      const { data: doc, error: docError } = await supabase
        .from('reunioes_documentos')
        .insert({
          ano,
          mes,
          dia,
          titulo_reuniao: `Pauta ${dia}/${mes}/${ano}`,
          status: 'rascunho',
          created_by: user?.id,
          conteudo_texto: ''
        })
        .select()
        .single();

      if (docError) {
        if (docError.code === '23505') {
          // Constraint violada - documento já existe, recarregar
          await loadDocuments();
          return;
        }
        throw docError;
      }

      const dayKey = dia.toString();
      setDocuments(prev => ({ ...prev, [dayKey]: doc }));
      setCurrentDocument(doc);
      
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

  const scheduleAutosave = () => {
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current);
    }
    
    autosaveTimeout.current = setTimeout(() => {
      saveDocument();
    }, 2000);
  };

  const saveDocument = async () => {
    if (!currentDocument) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('reunioes_documentos')
        .update({
          conteudo_texto: currentDocument.conteudo_texto,
          ultima_atualizacao: new Date().toISOString()
        })
        .eq('id', currentDocument.id);

      if (error) throw error;

      // Recarregar documentos para atualizar a sidebar
      await loadDocuments();
      
      setLastSaveTime(new Date());
      toast({
        title: "✅ Alterações salvas",
        description: "Documento salvo com sucesso",
      });
      
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar documento",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDocumentContent = (content: string) => {
    if (!currentDocument) return;
    
    setCurrentDocument(prev => prev ? { ...prev, conteudo_texto: content } : null);
    scheduleAutosave();
  };

  // Funções de formatação de texto
  const handleTextSelection = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value.substring(start, end);
    
    setSelectionStart(start);
    setSelectionEnd(end);
    setSelectedText(text);
    setShowToolbar(text.length > 0);
  };

  const insertText = (before: string, after: string = "") => {
    if (!textareaRef.current || !currentDocument) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    updateDocumentContent(newText);
    
    // Restaurar posição do cursor
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(
          start + before.length, 
          end + before.length
        );
      }
    }, 0);
  };

  const formatBold = () => insertText("**", "**");
  const formatItalic = () => insertText("*", "*");
  const formatUnderline = () => insertText("<u>", "</u>");

  const addBulletList = () => {
    if (!textareaRef.current || !currentDocument) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Encontrar início da linha
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const newText = text.substring(0, lineStart) + "- " + text.substring(lineStart);
    
    updateDocumentContent(newText);
    
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }
    }, 0);
  };

  const addChecklist = () => {
    if (!textareaRef.current || !currentDocument) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Encontrar início da linha
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const newText = text.substring(0, lineStart) + "- [ ] " + text.substring(lineStart);
    
    updateDocumentContent(newText);
    
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + 6, start + 6);
      }
    }, 0);
  };

  const addLink = () => {
    if (!selectedText) return;
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    if (!linkUrl || !selectedText) return;
    
    // Validar URL
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(linkUrl)) {
      toast({
        title: "URL inválida",
        description: "A URL deve começar com http:// ou https://",
        variant: "destructive"
      });
      return;
    }
    
    insertText(`[${selectedText}](${linkUrl})`);
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  const convertToTitle = () => {
    if (!selectedText) return;
    insertText("## ", "");
    setShowToolbar(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      // Texto selecionado, mostrar opção de converter para título
      setSelectedText(textarea.value.substring(start, end));
      setSelectionStart(start);
      setSelectionEnd(end);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const extractTitlesFromContent = (content: string): string[] => {
    const lines = content.split('\n');
    const titles = lines
      .filter(line => line.trim().startsWith('## '))
      .map(line => line.trim().substring(3));
    return titles;
  };

  const scrollToTitle = (title: string) => {
    if (!textareaRef.current) return;
    
    const content = textareaRef.current.value;
    const titleIndex = content.indexOf(`## ${title}`);
    
    if (titleIndex !== -1) {
      // Calcular linha aproximada
      const beforeTitle = content.substring(0, titleIndex);
      const lineNumber = beforeTitle.split('\n').length;
      
      // Focar e posicionar cursor
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(titleIndex, titleIndex);
      textareaRef.current.scrollTop = (lineNumber - 1) * 20; // aprox 20px por linha
    }
  };

  const toggleDayExpansion = (dayKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  const renderToolbar = () => (
    <div className="border-b border-border p-2 flex flex-wrap gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={formatBold}
        title="Negrito"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={formatItalic}
        title="Itálico"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={formatUnderline}
        title="Sublinhado"
      >
        <Underline className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={addBulletList}
        title="Lista"
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={addChecklist}
        title="Checklist"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={addLink}
        disabled={!selectedText}
        title="Adicionar link"
      >
        <Link className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedText}
            title="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={convertToTitle}>
            <Type className="h-4 w-4 mr-2" />
            Transformar em Título (H2)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Mobile simplified toolbar */}
      <div className="lg:hidden ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={formatBold}>
              <Bold className="h-4 w-4 mr-2" />
              Negrito
            </DropdownMenuItem>
            <DropdownMenuItem onClick={formatItalic}>
              <Italic className="h-4 w-4 mr-2" />
              Itálico
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={addBulletList}>
              <List className="h-4 w-4 mr-2" />
              Lista
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addChecklist}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Checklist
            </DropdownMenuItem>
            {selectedText && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={addLink}>
                  <Link className="h-4 w-4 mr-2" />
                  Adicionar Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={convertToTitle}>
                  <Type className="h-4 w-4 mr-2" />
                  Transformar em Título
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <Card className="w-80 h-fit">
      <CardHeader className="pb-3">
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
                ? { ano: selectedDate.ano - 1, mes: 12, dia: 1 }
                : { ano: selectedDate.ano, mes: selectedDate.mes - 1, dia: 1 };
              setSelectedDate(newDate);
              updateURL(newDate.ano, newDate.mes, newDate.dia);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newDate = selectedDate.mes === 12 
                ? { ano: selectedDate.ano + 1, mes: 1, dia: 1 }
                : { ano: selectedDate.ano, mes: selectedDate.mes + 1, dia: 1 };
              setSelectedDate(newDate);
              updateURL(newDate.ano, newDate.mes, newDate.dia);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-1">
            {Array.from({ length: getDaysInMonth(selectedDate.ano, selectedDate.mes) }, (_, i) => {
              const day = i + 1;
              const dayKey = day.toString();
              const hasDocument = documents[dayKey];
              const isSelected = selectedDate.dia === day;
              const isExpanded = expandedDays.has(dayKey);
              const titles = hasDocument ? extractTitlesFromContent(hasDocument.conteudo_texto) : [];
              
              return (
                <div key={day} className="space-y-1">
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted ${
                      isSelected ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    onClick={() => {
                      setSelectedDate(prev => ({ ...prev, dia: day }));
                      updateURL(selectedDate.ano, selectedDate.mes, day);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {hasDocument && titles.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDayExpansion(dayKey);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRightIcon className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <span>{day.toString().padStart(2, '0')}/{selectedDate.mes.toString().padStart(2, '0')}</span>
                    </div>
                    {hasDocument && (
                      <Badge variant={hasDocument.status === 'ata_concluida' ? 'default' : 'secondary'}>
                        {titles.length > 0 ? `${titles.length}` : '📄'}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Subtítulos expandidos */}
                  {hasDocument && isExpanded && titles.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {titles.map((title, index) => (
                        <button
                          key={index}
                          className="w-full text-left text-sm p-1 rounded hover:bg-muted text-muted-foreground"
                          onClick={() => {
                            setSelectedDate(prev => ({ ...prev, dia: day }));
                            updateURL(selectedDate.ano, selectedDate.mes, day);
                            setTimeout(() => scrollToTitle(title), 100);
                          }}
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

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
                {lastSaveTime && (
                  <span className="ml-2 text-xs">
                    (Último salvamento: {lastSaveTime.toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {saving && <span className="text-sm text-muted-foreground">Salvando...</span>}
            
            <Button size="sm" onClick={saveDocument}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {currentDocument ? (
            <Card className="h-full">
              {renderToolbar()}
              <CardContent className="p-0 h-full">
                <Textarea
                  ref={textareaRef}
                  value={currentDocument.conteudo_texto}
                  onChange={(e) => updateDocumentContent(e.target.value)}
                  onSelect={handleTextSelection}
                  onDoubleClick={handleDoubleClick}
                  placeholder={`# Pauta ${selectedDate.dia}/${selectedDate.mes}/${selectedDate.ano}

## Cliente X | Alinhamento Semanal
**Participantes:** 
**Horário:** 

### Pontos da Agenda
- [ ] Revisão da semana anterior
- [ ] Resultados das campanhas
- [ ] Próximos passos

### Decisões
- 

### Follow-ups
- [ ] Enviar relatório atualizado

---

## Cliente Y | Onboarding
**Participantes:** 
**Horário:** 

### Pontos da Agenda
- [ ] Apresentação da estratégia
- [ ] Definição de objetivos
- [ ] Cronograma de atividades

### Decisões
- 

### Follow-ups
- [ ] Agendar próxima reunião`}
                  className="min-h-[600px] font-mono text-sm resize-none border-none focus:ring-0 rounded-none rounded-b-lg"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Carregando pauta do dia...
                </h3>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Texto selecionado:</label>
              <p className="text-sm text-muted-foreground">{selectedText}</p>
            </div>
            <div>
              <label className="text-sm font-medium">URL:</label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://exemplo.com"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={insertLink}>
                Inserir Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}