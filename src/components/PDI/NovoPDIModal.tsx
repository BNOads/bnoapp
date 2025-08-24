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
import { CalendarDays, BookOpen, Search, ChevronLeft, ChevronRight } from "lucide-react";
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

export function NovoPDIModal({ open, onOpenChange, onSuccess }: NovoPDIModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentAulaIndex, setCurrentAulaIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    colaborador_id: "",
    data_limite: "",
    aulas_selecionadas: [] as string[]
  });

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
    
    if (!formData.titulo || !formData.colaborador_id || !formData.data_limite || formData.aulas_selecionadas.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
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
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (pdiError) throw pdiError;

      // Associar aulas ao PDI
      const aulasData = formData.aulas_selecionadas.map(aula_id => ({
        pdi_id: pdiData.id,
        aula_id
      }));

      const { error: aulasError } = await supabase
        .from('pdi_aulas')
        .insert(aulasData);

      if (aulasError) throw aulasError;

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
        aulas_selecionadas: []
      });

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
    setFormData(prev => ({
      ...prev,
      aulas_selecionadas: prev.aulas_selecionadas.includes(aulaId)
        ? prev.aulas_selecionadas.filter(id => id !== aulaId)
        : [...prev.aulas_selecionadas, aulaId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
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

          <div className="space-y-3">
            <Label>Aulas do PDI *</Label>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar aulas..."
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
                        onCheckedChange={() => toggleAula(currentAula.id)}
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
              {formData.aulas_selecionadas.length} aulas selecionadas
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar PDI"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}