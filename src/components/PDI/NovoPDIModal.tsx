import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, BookOpen, Search, ChevronLeft, ChevronRight, Plus, ExternalLink, X, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NovoPDIModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Colaborador {
  id: string;
  nome: string;
  email: string;
}

interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  duracao: number;
  treinamento_id: string;
  treinamentos: {
    titulo: string;
  };
}

interface AulaExterna {
  titulo: string;
  descricao: string;
  url: string;
  duracao: number;
  concluida?: boolean;
}

interface AcessoLogin {
  id: string;
  nome_acesso: string;
  categoria: string;
  link_acesso: string | null;
}

export function NovoPDIModal({ open, onOpenChange, onSuccess }: NovoPDIModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [acessos, setAcessos] = useState<AcessoLogin[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentAulaIndex, setCurrentAulaIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    colaborador_id: "",
    data_limite: "",
    aulas_selecionadas: [] as string[],
    aulas_externas: [] as AulaExterna[],
    acessos_ids: [] as string[]
  });

  const [aulaExterna, setAulaExterna] = useState({
    titulo: "",
    descricao: "",
    url: "",
    duracao: 30
  });

  const [showAulaExternaForm, setShowAulaExternaForm] = useState(false);

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open]);

  const carregarDados = async () => {
    try {
      // Carregar colaboradores
      const { data: colaboradoresData } = await supabase
        .from('colaboradores')
        .select('id, nome, email')
        .eq('ativo', true)
        .order('nome');

      if (colaboradoresData) {
        setColaboradores(colaboradoresData);
      }

      // Carregar aulas
      const { data: aulasData } = await supabase
        .from('aulas')
        .select(`
          id,
          titulo,
          descricao,
          duracao,
          treinamento_id,
          treinamentos (
            titulo
          )
        `)
        .eq('ativo', true)
        .order('titulo');

      if (aulasData) {
        setAulas(aulasData);
      }

      // Carregar acessos e logins
      const { data: acessosData } = await supabase
        .from('acessos_logins')
        .select('id, nome_acesso, categoria, link_acesso')
        .eq('ativo', true)
        .order('nome_acesso');

      if (acessosData) {
        setAcessos(acessosData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados",
        variant: "destructive"
      });
    }
  };

  // Filter aulas based on search term
  const filteredAulas = useMemo(() => {
    if (!searchTerm) return aulas;
    return aulas.filter(aula =>
      aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aula.treinamentos.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (aula.descricao && aula.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [aulas, searchTerm]);

  // Reset current index when search changes
  useEffect(() => {
    setCurrentAulaIndex(0);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.colaborador_id || !formData.data_limite || 
        (formData.aulas_selecionadas.length === 0 && formData.aulas_externas.length === 0)) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e adicione pelo menos uma aula",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Criar PDI
      const { data: pdiData, error: pdiError } = await supabase
        .from('pdis')
        .insert({
          titulo: formData.titulo,
          descricao: formData.descricao,
          colaborador_id: formData.colaborador_id,
          data_limite: formData.data_limite,
          aulas_externas: formData.aulas_externas.length > 0 
            ? formData.aulas_externas.map(a => ({ ...a, concluida: false }))
            : null,
          acessos_ids: formData.acessos_ids.length > 0 ? formData.acessos_ids : null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (pdiError) {
        console.error('Erro detalhado do Supabase:', pdiError);
        throw pdiError;
      }

      // Associar aulas ao PDI (se houver aulas internas selecionadas)
      if (formData.aulas_selecionadas.length > 0) {
        const aulasData = formData.aulas_selecionadas.map(aula_id => ({
          pdi_id: pdiData.id,
          aula_id
        }));

        const { error: aulasError } = await supabase
          .from('pdi_aulas')
          .insert(aulasData);

        if (aulasError) throw aulasError;
      }

      toast({
        title: "Sucesso",
        description: "PDI criado com sucesso!"
      });

      // Reset form
      setFormData({
        titulo: "",
        descricao: "",
        colaborador_id: "",
        data_limite: "",
        aulas_selecionadas: [],
        aulas_externas: [],
        acessos_ids: []
      });
      setAulaExterna({
        titulo: "",
        descricao: "",
        url: "",
        duracao: 30
      });
      setShowAulaExternaForm(false);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar PDI:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar PDI",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const nextAula = () => {
    if (currentAulaIndex < filteredAulas.length - 1) {
      setCurrentAulaIndex(prev => prev + 1);
    }
  };

  const prevAula = () => {
    if (currentAulaIndex > 0) {
      setCurrentAulaIndex(prev => prev - 1);
    }
  };

  const currentAula = filteredAulas[currentAulaIndex];

  const toggleAula = (aulaId: string) => {
    setFormData(prev => {
      const isSelected = prev.aulas_selecionadas.includes(aulaId);
      const newSelection = isSelected
        ? prev.aulas_selecionadas.filter(id => id !== aulaId)
        : [...prev.aulas_selecionadas, aulaId];
      
      return {
        ...prev,
        aulas_selecionadas: newSelection
      };
    });
  };

  const validateUrl = (url: string): boolean => {
    const urlPattern = /^https?:\/\/.+/i;
    return urlPattern.test(url);
  };

  const adicionarAulaExterna = () => {
    if (!aulaExterna.titulo || !aulaExterna.url) {
      toast({
        title: "Erro",
        description: "Título e URL são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!validateUrl(aulaExterna.url)) {
      toast({
        title: "Erro",
        description: "URL deve começar com http:// ou https://",
        variant: "destructive"
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      aulas_externas: [...prev.aulas_externas, aulaExterna]
    }));

    setAulaExterna({
      titulo: "",
      descricao: "",
      url: "",
      duracao: 30
    });

    setShowAulaExternaForm(false);
  };

  const removerAulaExterna = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aulas_externas: prev.aulas_externas.filter((_, i) => i !== index)
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo PDI</DialogTitle>
            <DialogDescription>
              Crie um Plano de Desenvolvimento Individual para um colaborador
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Desenvolvimento em Tráfego Pago"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="colaborador">Colaborador *</Label>
                <Select
                  value={formData.colaborador_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, colaborador_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((colaborador) => (
                      <SelectItem key={colaborador.id} value={colaborador.id}>
                        {colaborador.nome} ({colaborador.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva os objetivos e expectativas do PDI"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_limite">Data Limite *</Label>
              <Input
                id="data_limite"
                type="date"
                value={formData.data_limite}
                onChange={(e) => setFormData(prev => ({ ...prev, data_limite: e.target.value }))}
              />
            </div>

            {/* Acessos e Logins */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Acessos Necessários
              </Label>
              <p className="text-sm text-muted-foreground">
                Selecione os acessos que serão necessários para este PDI
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border rounded-md bg-muted/30">
                {acessos.map((acesso) => (
                  <div key={acesso.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`acesso-${acesso.id}`}
                      checked={formData.acessos_ids.includes(acesso.id)}
                      onCheckedChange={() => {
                        setFormData(prev => ({
                          ...prev,
                          acessos_ids: prev.acessos_ids.includes(acesso.id)
                            ? prev.acessos_ids.filter(id => id !== acesso.id)
                            : [...prev.acessos_ids, acesso.id]
                        }));
                      }}
                    />
                    <label
                      htmlFor={`acesso-${acesso.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      <span className="font-medium">{acesso.nome_acesso}</span>
                      <span className="text-xs text-muted-foreground ml-2">({acesso.categoria})</span>
                    </label>
                  </div>
                ))}
              </div>

              {formData.acessos_ids.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {formData.acessos_ids.length} acesso(s) selecionado(s)
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Aulas do PDI *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAulaExternaForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Aula Externa
                </Button>
              </div>

              {/* Aulas Externas Adicionadas */}
              {formData.aulas_externas.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Aulas Externas</Label>
                  {formData.aulas_externas.map((aulaExt, index) => (
                    <Card key={index} className="border-orange-200 bg-orange-50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-orange-600" />
                            <div>
                              <CardTitle className="text-sm">{aulaExt.titulo}</CardTitle>
                              <CardDescription className="text-xs">
                                Aula Externa • {aulaExt.duracao}min
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerAulaExterna(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      {aulaExt.descricao && (
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground">{aulaExt.descricao}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar aulas internas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Single Aula Display */}
              {filteredAulas.length > 0 && currentAula ? (
                <div className="space-y-3">
                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={prevAula}
                      disabled={currentAulaIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      {currentAulaIndex + 1} de {filteredAulas.length}
                    </span>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={nextAula}
                      disabled={currentAulaIndex === filteredAulas.length - 1}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Current Aula Card */}
                  <Card
                    className={`transition-colors ${
                      formData.aulas_selecionadas.includes(currentAula.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={formData.aulas_selecionadas.includes(currentAula.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                aulas_selecionadas: [...prev.aulas_selecionadas, currentAula.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                aulas_selecionadas: prev.aulas_selecionadas.filter(id => id !== currentAula.id)
                              }));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-sm">{currentAula.titulo}</CardTitle>
                          <CardDescription className="text-xs">
                            {currentAula.treinamentos.titulo}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {currentAula.duracao}min
                        </div>
                      </div>
                    </CardHeader>
                    {currentAula.descricao && (
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          {currentAula.descricao}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nenhuma aula encontrada' : 'Nenhuma aula disponível'}
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                {formData.aulas_selecionadas.length} aulas internas + {formData.aulas_externas.length} aulas externas + {formData.acessos_ids.length} acessos selecionados
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar PDI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Adicionar Aula Externa */}
      <Dialog open={showAulaExternaForm} onOpenChange={setShowAulaExternaForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Aula Externa</DialogTitle>
            <DialogDescription>
              Adicione uma aula ou recurso externo ao PDI
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo_externa">Título *</Label>
              <Input
                id="titulo_externa"
                value={aulaExterna.titulo}
                onChange={(e) => setAulaExterna(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Curso de Google Ads Avançado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url_externa">URL *</Label>
              <Input
                id="url_externa"
                type="url"
                value={aulaExterna.url}
                onChange={(e) => setAulaExterna(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_externa">Descrição</Label>
              <Textarea
                id="descricao_externa"
                value={aulaExterna.descricao}
                onChange={(e) => setAulaExterna(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição opcional"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracao_externa">Duração (minutos)</Label>
              <Input
                id="duracao_externa"
                type="number"
                value={aulaExterna.duracao}
                onChange={(e) => setAulaExterna(prev => ({ ...prev, duracao: parseInt(e.target.value) || 30 }))}
                min="1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAulaExternaForm(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={adicionarAulaExterna}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
