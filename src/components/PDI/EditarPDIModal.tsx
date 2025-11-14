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

interface EditarPDIModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pdiId: string;
  pdiData: {
    titulo: string;
    descricao: string;
    colaborador_id: string;
    data_limite: string;
    aulas: Array<{ aula_id: string }>;
    aulas_externas?: Array<{
      titulo: string;
      descricao: string;
      url: string;
      duracao: number;
    }>;
    acessos_ids?: string[];
  };
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
}

interface AcessoLogin {
  id: string;
  nome_acesso: string;
  categoria: string;
  link_acesso: string | null;
}

export function EditarPDIModal({ open, onOpenChange, onSuccess, pdiId, pdiData }: EditarPDIModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [acessos, setAcessos] = useState<AcessoLogin[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentAulaIndex, setCurrentAulaIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    titulo: pdiData.titulo,
    descricao: pdiData.descricao,
    colaborador_id: pdiData.colaborador_id,
    data_limite: pdiData.data_limite?.split('T')[0] || "",
    aulas_selecionadas: pdiData.aulas?.map(a => a.aula_id) || [],
    aulas_externas: pdiData.aulas_externas || [],
    acessos_ids: pdiData.acessos_ids || []
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
      setFormData({
        titulo: pdiData.titulo,
        descricao: pdiData.descricao,
        colaborador_id: pdiData.colaborador_id,
        data_limite: pdiData.data_limite?.split('T')[0] || "",
        aulas_selecionadas: pdiData.aulas?.map(a => a.aula_id) || [],
        aulas_externas: pdiData.aulas_externas || [],
        acessos_ids: pdiData.acessos_ids || []
      });
    }
  }, [open, pdiData]);

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
          treinamentos!inner (titulo)
        `)
        .eq('ativo', true)
        .order('titulo');

      if (aulasData) {
        setAulas(aulasData as any);
      }

      // Carregar acessos
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
        description: "Falha ao carregar dados necessários",
        variant: "destructive"
      });
    }
  };

  const filteredAulas = useMemo(() => {
    if (!searchTerm) return aulas;
    const term = searchTerm.toLowerCase();
    return aulas.filter(aula => 
      aula.titulo.toLowerCase().includes(term) ||
      aula.treinamentos.titulo.toLowerCase().includes(term)
    );
  }, [aulas, searchTerm]);

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.colaborador_id || !formData.data_limite) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Atualizar PDI
      const { error: pdiError } = await supabase
        .from('pdis')
        .update({
          titulo: formData.titulo,
          descricao: formData.descricao,
          colaborador_id: formData.colaborador_id,
          data_limite: formData.data_limite,
          aulas_externas: formData.aulas_externas as any,
          acessos_ids: formData.acessos_ids
        })
        .eq('id', pdiId);

      if (pdiError) throw pdiError;

      // Deletar aulas antigas
      const { error: deleteError } = await supabase
        .from('pdi_aulas')
        .delete()
        .eq('pdi_id', pdiId);

      if (deleteError) throw deleteError;

      // Adicionar novas aulas
      if (formData.aulas_selecionadas.length > 0) {
        const pdiAulas = formData.aulas_selecionadas.map(aulaId => ({
          pdi_id: pdiId,
          aula_id: aulaId,
          concluida: false
        }));

        const { error: aulasError } = await supabase
          .from('pdi_aulas')
          .insert(pdiAulas);

        if (aulasError) throw aulasError;
      }

      toast({
        title: "Sucesso",
        description: "PDI atualizado com sucesso!"
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar PDI:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar PDI: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const nextAula = () => {
    if (currentAulaIndex < filteredAulas.length - 1) {
      setCurrentAulaIndex(currentAulaIndex + 1);
    }
  };

  const prevAula = () => {
    if (currentAulaIndex > 0) {
      setCurrentAulaIndex(currentAulaIndex - 1);
    }
  };

  const toggleAula = (aulaId: string) => {
    setFormData(prev => ({
      ...prev,
      aulas_selecionadas: prev.aulas_selecionadas.includes(aulaId)
        ? prev.aulas_selecionadas.filter(id => id !== aulaId)
        : [...prev.aulas_selecionadas, aulaId]
    }));
  };

  const validateUrl = (url: string): boolean => {
    const trimmedUrl = url.trim();
    return /^https?:\/\/.+/.test(trimmedUrl);
  };

  const adicionarAulaExterna = () => {
    if (!aulaExterna.titulo.trim() || !aulaExterna.url.trim()) {
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

    const novaAulaExterna: AulaExterna = {
      titulo: aulaExterna.titulo.trim(),
      descricao: aulaExterna.descricao.trim(),
      url: aulaExterna.url.trim(),
      duracao: aulaExterna.duracao
    };

    setFormData(prev => ({
      ...prev,
      aulas_externas: [...prev.aulas_externas, novaAulaExterna]
    }));

    setAulaExterna({
      titulo: "",
      descricao: "",
      url: "",
      duracao: 30
    });
    setShowAulaExternaForm(false);

    toast({
      title: "Sucesso",
      description: "Aula externa adicionada!"
    });
  };

  const removerAulaExterna = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aulas_externas: prev.aulas_externas.filter((_, i) => i !== index)
    }));
  };

  const currentAula = filteredAulas[currentAulaIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar PDI</DialogTitle>
          <DialogDescription>
            Atualize as informações do Plano de Desenvolvimento Individual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do PDI *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: PDI - Desenvolvimento em Tráfego Pago"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva os objetivos do PDI"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="colaborador">Colaborador *</Label>
                <Select
                  value={formData.colaborador_id}
                  onValueChange={(value) => setFormData({ ...formData, colaborador_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_limite">Data Limite *</Label>
                <Input
                  id="data_limite"
                  type="date"
                  value={formData.data_limite}
                  onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Acessos Necessários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5" />
                Acessos Necessários
              </CardTitle>
              <CardDescription>
                Selecione os acessos que o colaborador precisará
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {acessos.map((acesso) => (
                    <div key={acesso.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`acesso-${acesso.id}`}
                        checked={formData.acessos_ids.includes(acesso.id)}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({
                            ...prev,
                            acessos_ids: checked
                              ? [...prev.acessos_ids, acesso.id]
                              : prev.acessos_ids.filter(id => id !== acesso.id)
                          }));
                        }}
                      />
                      <label htmlFor={`acesso-${acesso.id}`} className="text-sm cursor-pointer">
                        <span className="font-medium">{acesso.nome_acesso}</span>
                        <span className="text-muted-foreground"> ({acesso.categoria})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Seleção de Aulas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Aulas Internas
              </CardTitle>
              <CardDescription>
                Selecione aulas dos treinamentos existentes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aulas..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentAulaIndex(0);
                    }}
                    className="pl-9"
                  />
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {formData.aulas_selecionadas.length} selecionada(s)
                </div>
              </div>

              {filteredAulas.length > 0 && currentAula && (
                <Card className="border-2">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id={`aula-${currentAula.id}`}
                            checked={formData.aulas_selecionadas.includes(currentAula.id)}
                            onCheckedChange={() => toggleAula(currentAula.id)}
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`aula-${currentAula.id}`}
                              className="font-semibold text-base cursor-pointer"
                            >
                              {currentAula.titulo}
                            </label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {currentAula.descricao}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {currentAula.treinamentos.titulo}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {currentAula.duracao} min
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={prevAula}
                        disabled={currentAulaIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
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
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredAulas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhuma aula encontrada com esse termo" : "Nenhuma aula disponível"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aulas Externas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Conteúdos Externos
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAulaExternaForm(!showAulaExternaForm)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </CardTitle>
              <CardDescription>
                Adicione links de cursos, vídeos ou outros conteúdos externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAulaExternaForm && (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="aula-externa-titulo">Título *</Label>
                      <Input
                        id="aula-externa-titulo"
                        value={aulaExterna.titulo}
                        onChange={(e) => setAulaExterna({ ...aulaExterna, titulo: e.target.value })}
                        placeholder="Ex: Curso de Meta Ads Avançado"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aula-externa-url">URL *</Label>
                      <Input
                        id="aula-externa-url"
                        value={aulaExterna.url}
                        onChange={(e) => setAulaExterna({ ...aulaExterna, url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aula-externa-descricao">Descrição</Label>
                      <Textarea
                        id="aula-externa-descricao"
                        value={aulaExterna.descricao}
                        onChange={(e) => setAulaExterna({ ...aulaExterna, descricao: e.target.value })}
                        placeholder="Descrição do conteúdo..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aula-externa-duracao">Duração estimada (minutos)</Label>
                      <Input
                        id="aula-externa-duracao"
                        type="number"
                        value={aulaExterna.duracao}
                        onChange={(e) => setAulaExterna({ ...aulaExterna, duracao: parseInt(e.target.value) || 30 })}
                        min="1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={adicionarAulaExterna} size="sm">
                        Confirmar
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowAulaExternaForm(false);
                          setAulaExterna({ titulo: "", descricao: "", url: "", duracao: 30 });
                        }}
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {formData.aulas_externas.length > 0 && (
                <div className="space-y-2">
                  {formData.aulas_externas.map((aula, index) => (
                    <Card key={index}>
                      <CardContent className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{aula.titulo}</h4>
                          {aula.descricao && (
                            <p className="text-sm text-muted-foreground mt-1">{aula.descricao}</p>
                          )}
                          <a 
                            href={aula.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {aula.url}
                          </a>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerAulaExterna(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {formData.aulas_externas.length === 0 && !showAulaExternaForm && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum conteúdo externo adicionado
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
