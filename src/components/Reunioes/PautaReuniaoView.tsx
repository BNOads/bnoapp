import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  Plus, 
  Save, 
  FileText, 
  Users, 
  List, 
  CheckSquare, 
  Download,
  Share2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Settings,
  BookOpen
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
  
  const autosaveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Parse URL parameters
    const yearParam = searchParams.get('ano');
    const monthParam = searchParams.get('mes');
    const dayParam = searchParams.get('dia');
    
    if (yearParam && monthParam) {
      setSelectedDate({
        ano: parseInt(yearParam),
        mes: parseInt(monthParam),
        dia: dayParam ? parseInt(dayParam) : undefined
      });
    }
    
    loadInitialData();
  }, [searchParams]);

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
          tipo: block.tipo,
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

  const addBlock = (tipo: string) => {
    const newBlock: MeetingBlock = {
      id: `temp-${Date.now()}`,
      tipo,
      titulo: BLOCK_TYPES[tipo as keyof typeof BLOCK_TYPES]?.label || 'Novo Bloco',
      conteudo: getDefaultContent(tipo),
      ordem: blocks.length,
      ancora: null
    };
    
    setBlocks(prev => [...prev, newBlock]);
    scheduleAutosave();
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
    
    autosaveTimeout.current = setTimeout(() => {
      saveDocument();
    }, 2000);
  };

  const saveDocument = async () => {
    if (!currentDocument) return;
    
    try {
      setSaving(true);
      
      // Update document
      const { error: docError } = await supabase
        .from('reunioes_documentos')
        .update({
          titulo_reuniao: currentDocument.titulo_reuniao,
          descricao: currentDocument.descricao,
          participantes: currentDocument.participantes,
          contribuidores: currentDocument.contribuidores,
          ultima_atualizacao: new Date().toISOString()
        })
        .eq('id', currentDocument.id);

      if (docError) throw docError;

      // Delete existing blocks and recreate them
      await supabase
        .from('reunioes_blocos')
        .delete()
        .eq('documento_id', currentDocument.id);

      if (blocks.length > 0) {
        const blocksToInsert = blocks.map((block, index) => ({
          documento_id: currentDocument.id,
          tipo: block.tipo as "titulo" | "descricao" | "participantes" | "pauta" | "decisoes" | "acoes",
          titulo: block.titulo,
          conteudo: block.conteudo,
          ordem: index,
          ancora: block.titulo ? block.titulo.toLowerCase().replace(/\s+/g, '-') : null
        }));

        const { error: blocksError } = await supabase
          .from('reunioes_blocos')
          .insert(blocksToInsert);

        if (blocksError) throw blocksError;
      }

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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

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
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderTableOfContents = () => {
    const titleBlocks = blocks.filter(block => block.tipo === 'titulo' && block.titulo);
    
    if (titleBlocks.length === 0) return null;

    return (
      <Card className="w-64 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Índice</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar título..."
              className="pl-8 h-8 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {titleBlocks
                .filter(block => 
                  !searchTerm || 
                  block.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((block, index) => (
                  <button
                    key={block.id}
                    className="w-full text-left text-sm p-2 rounded hover:bg-muted"
                    onClick={() => {
                      const element = document.getElementById(`block-${block.id}`);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {block.titulo}
                  </button>
                ))}
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
            {saving && <span className="text-sm text-muted-foreground">Salvando...</span>}
            
            {selectedDate.dia && !currentDocument && (
              <div className="flex gap-2">
                <Select onValueChange={(templateId) => createOrOpenDocument(selectedDate.dia!, templateId)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Usar template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Documento em branco</SelectItem>
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
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                <Button size="sm" onClick={saveDocument}>
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
                    <Textarea
                      value={currentDocument.descricao || ''}
                      onChange={(e) => {
                        setCurrentDocument(prev => prev ? { ...prev, descricao: e.target.value } : null);
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
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderBlockContent(block)}
                    </CardContent>
                  </Card>
                ))}

                {/* Add Block Buttons */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(BLOCK_TYPES).map(([tipo, config]) => (
                        <Button
                          key={tipo}
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock(tipo)}
                        >
                          <config.icon className="h-4 w-4 mr-2" />
                          {config.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
      </div>
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
          <Textarea
            value={block.conteudo.texto || ''}
            onChange={(e) => updateBlock(block.id, { 
              conteudo: { ...block.conteudo, texto: e.target.value }
            })}
            placeholder="Digite o conteúdo..."
            className="min-h-24"
          />
        );
    }
  }
}