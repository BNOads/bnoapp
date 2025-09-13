import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Edit, 
  Eye, 
  Save, 
  History, 
  Download 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/Auth/AuthContext';

interface KickoffData {
  responsavel: string;
  nicho: string;
  investimento: string;
  historia_empresa: string;
  servico: string;
  objetivo_trafego: string;
  fluxo_vendas: string;
  diferencial: string;
  desafios: string;
  genero: string;
  idade: string;
  cliente_ideal: string;
  dificuldade: string;
}

interface KickoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
}

const KICKOFF_TEMPLATE = `# Kickoff — {{client_name}}

## Informações Principais
- **Nome do Responsável:** {{responsavel}}
- **Nicho:** {{nicho}}
- **Investimento:** {{investimento}}

## Sobre o Curso e a Empresa
- **História da Empresa:** {{historia_empresa}}
- **Serviço Oferecido:** {{servico}}
- **Objetivo com o Tráfego:** {{objetivo_trafego}}
- **Fluxo de Vendas Atual / Experiência com Tráfego:** {{fluxo_vendas}}
- **Diferencial Competitivo:** {{diferencial}}
- **Desafios Atuais:** {{desafios}}

## Público-Alvo
- **Gênero Ideal:** {{genero}}
- **Idade:** {{idade}}
- **Cliente Ideal (Profissão/Comportamento):** {{cliente_ideal}}
- **Principal Dificuldade:** {{dificuldade}}`;

export const KickoffModal = ({ isOpen, onClose, clienteId, clienteNome }: KickoffModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<'edit' | 'preview'>('edit');
  const [kickoffId, setKickoffId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  
  const [formData, setFormData] = useState<KickoffData>({
    responsavel: '',
    nicho: '',
    investimento: '',
    historia_empresa: '',
    servico: '',
    objetivo_trafego: '',
    fluxo_vendas: '',
    diferencial: '',
    desafios: '',
    genero: '',
    idade: '',
    cliente_ideal: '',
    dificuldade: ''
  });

  useEffect(() => {
    if (isOpen && clienteId) {
      loadKickoff();
    }
  }, [isOpen, clienteId]);

  const loadKickoff = async () => {
    try {
      setIsLoading(true);
      
      // Buscar kickoff existente
      const { data: kickoff, error: kickoffError } = await supabase
        .from('kickoffs')
        .select('*')
        .eq('client_id', clienteId)
        .single();

      if (kickoffError && kickoffError.code !== 'PGRST116') {
        throw kickoffError;
      }

      if (kickoff) {
        setKickoffId(kickoff.id);
        await loadKickoffContent(kickoff.id);
      } else {
        // Criar novo kickoff
        await createNewKickoff();
      }
    } catch (error) {
      console.error('Error loading kickoff:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar kickoff",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewKickoff = async () => {
    try {
      const { data: kickoff, error: kickoffError } = await supabase
        .from('kickoffs')
        .insert({
          client_id: clienteId,
          created_by: user?.id
        })
        .select()
        .single();

      if (kickoffError) throw kickoffError;

      setKickoffId(kickoff.id);

      // Criar conteúdo inicial
      const initialContent = KICKOFF_TEMPLATE.replace('{{client_name}}', clienteNome);
      
      const { error: contentError } = await supabase
        .from('kickoff_content')
        .insert({
          kickoff_id: kickoff.id,
          content_md: initialContent,
          version: 1,
          created_by: user?.id
        });

      if (contentError) throw contentError;

      await loadKickoffContent(kickoff.id);
    } catch (error) {
      console.error('Error creating kickoff:', error);
      throw error;
    }
  };

  const loadKickoffContent = async (kickoffId: string) => {
    try {
      // Buscar última versão
      const { data: content, error } = await supabase
        .from('kickoff_content')
        .select('*')
        .eq('kickoff_id', kickoffId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (content) {
        parseContentToForm(content.content_md);
        setCurrentVersion(content.version);
        await loadVersions(kickoffId);
      }
    } catch (error) {
      console.error('Error loading kickoff content:', error);
      throw error;
    }
  };

  const loadVersions = async (kickoffId: string) => {
    try {
      const { data, error } = await supabase
        .from('kickoff_content')
        .select('id, version, created_at, created_by')
        .eq('kickoff_id', kickoffId)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const parseContentToForm = (markdown: string) => {
    const extractValue = (pattern: string): string => {
      const regex = new RegExp(`\\*\\*${pattern}:\\*\\*\\s*(.*)`, 'i');
      const match = markdown.match(regex);
      return match ? match[1].trim() : '';
    };

    setFormData({
      responsavel: extractValue('Nome do Responsável'),
      nicho: extractValue('Nicho'),
      investimento: extractValue('Investimento'),
      historia_empresa: extractValue('História da Empresa'),
      servico: extractValue('Serviço Oferecido'),
      objetivo_trafego: extractValue('Objetivo com o Tráfego'),
      fluxo_vendas: extractValue('Fluxo de Vendas Atual / Experiência com Tráfego'),
      diferencial: extractValue('Diferencial Competitivo'),
      desafios: extractValue('Desafios Atuais'),
      genero: extractValue('Gênero Ideal'),
      idade: extractValue('Idade'),
      cliente_ideal: extractValue('Cliente Ideal \\(Profissão/Comportamento\\)'),
      dificuldade: extractValue('Principal Dificuldade')
    });
  };

  const generateMarkdown = (): string => {
    return KICKOFF_TEMPLATE
      .replace('{{client_name}}', clienteNome)
      .replace('{{responsavel}}', formData.responsavel)
      .replace('{{nicho}}', formData.nicho)
      .replace('{{investimento}}', formData.investimento)
      .replace('{{historia_empresa}}', formData.historia_empresa)
      .replace('{{servico}}', formData.servico)
      .replace('{{objetivo_trafego}}', formData.objetivo_trafego)
      .replace('{{fluxo_vendas}}', formData.fluxo_vendas)
      .replace('{{diferencial}}', formData.diferencial)
      .replace('{{desafios}}', formData.desafios)
      .replace('{{genero}}', formData.genero)
      .replace('{{idade}}', formData.idade)
      .replace('{{cliente_ideal}}', formData.cliente_ideal)
      .replace('{{dificuldade}}', formData.dificuldade);
  };

  const handleSave = async () => {
    if (!kickoffId) return;

    try {
      setIsSaving(true);
      
      const markdown = generateMarkdown();
      const newVersion = currentVersion + 1;

      const { error } = await supabase
        .from('kickoff_content')
        .insert({
          kickoff_id: kickoffId,
          content_md: markdown,
          version: newVersion,
          created_by: user?.id
        });

      if (error) throw error;

      setCurrentVersion(newVersion);
      await loadVersions(kickoffId);

      toast({
        title: "Sucesso",
        description: `Kickoff salvo - Versão ${newVersion}`
      });
    } catch (error) {
      console.error('Error saving kickoff:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar kickoff",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderPreview = () => {
    const markdown = generateMarkdown();
    const lines = markdown.split('\n');
    
    return (
      <div className="prose max-w-none">
        {lines.map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold mb-4">{line.substring(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-semibold mt-6 mb-3">{line.substring(3)}</h2>;
          }
          if (line.startsWith('- **') && line.includes(':**')) {
            const [label, value] = line.substring(2).split(':**');
            return (
              <div key={index} className="mb-2">
                <span className="font-medium">{label}:</span>
                <span className="ml-2">{value}</span>
              </div>
            );
          }
          if (line.trim()) {
            return <p key={index} className="mb-2">{line}</p>;
          }
          return <div key={index} className="mb-2"></div>;
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Kickoff - {clienteNome}
            <Badge variant="outline">v{currentVersion}</Badge>
          </DialogTitle>
          <DialogDescription>
            Documento de kickoff com informações estruturadas do cliente
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'edit' | 'preview')}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visualizar
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              {versions.length > 1 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  {versions.length} versões
                </Badge>
              )}
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>

          <TabsContent value="edit" className="space-y-6">
            {/* Informações Principais */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="responsavel">Nome do Responsável</Label>
                    <Input
                      id="responsavel"
                      value={formData.responsavel}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                      placeholder="Nome do responsável pelo projeto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nicho">Nicho</Label>
                    <Input
                      id="nicho"
                      value={formData.nicho}
                      onChange={(e) => setFormData(prev => ({ ...prev, nicho: e.target.value }))}
                      placeholder="Nicho de atuação"
                    />
                  </div>
                  <div>
                    <Label htmlFor="investimento">Investimento</Label>
                    <Input
                      id="investimento"
                      value={formData.investimento}
                      onChange={(e) => setFormData(prev => ({ ...prev, investimento: e.target.value }))}
                      placeholder="Valor do investimento"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sobre o Curso e a Empresa */}
            <Card>
              <CardHeader>
                <CardTitle>Sobre o Curso e a Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="historia_empresa">História da Empresa</Label>
                  <Textarea
                    id="historia_empresa"
                    value={formData.historia_empresa}
                    onChange={(e) => setFormData(prev => ({ ...prev, historia_empresa: e.target.value }))}
                    placeholder="Conte um pouco da história da empresa"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="servico">Serviço Oferecido</Label>
                  <Textarea
                    id="servico"
                    value={formData.servico}
                    onChange={(e) => setFormData(prev => ({ ...prev, servico: e.target.value }))}
                    placeholder="Conte um pouco sobre o serviço que oferece"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="objetivo_trafego">Objetivo com o Tráfego</Label>
                  <Textarea
                    id="objetivo_trafego"
                    value={formData.objetivo_trafego}
                    onChange={(e) => setFormData(prev => ({ ...prev, objetivo_trafego: e.target.value }))}
                    placeholder="O que pretende resolver com o tráfego"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="fluxo_vendas">Fluxo de Vendas Atual / Experiência com Tráfego</Label>
                  <Textarea
                    id="fluxo_vendas"
                    value={formData.fluxo_vendas}
                    onChange={(e) => setFormData(prev => ({ ...prev, fluxo_vendas: e.target.value }))}
                    placeholder="Como está o fluxo de vendas ultimamente? Já rodou tráfego?"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="diferencial">Diferencial Competitivo</Label>
                  <Textarea
                    id="diferencial"
                    value={formData.diferencial}
                    onChange={(e) => setFormData(prev => ({ ...prev, diferencial: e.target.value }))}
                    placeholder="Qual seu principal diferencial competitivo?"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="desafios">Desafios Atuais</Label>
                  <Textarea
                    id="desafios"
                    value={formData.desafios}
                    onChange={(e) => setFormData(prev => ({ ...prev, desafios: e.target.value }))}
                    placeholder="Quais são seus principais desafios atuais?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Público-Alvo */}
            <Card>
              <CardHeader>
                <CardTitle>Público-Alvo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genero">Gênero Ideal</Label>
                    <Input
                      id="genero"
                      value={formData.genero}
                      onChange={(e) => setFormData(prev => ({ ...prev, genero: e.target.value }))}
                      placeholder="Gênero do cliente ideal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="idade">Idade</Label>
                    <Input
                      id="idade"
                      value={formData.idade}
                      onChange={(e) => setFormData(prev => ({ ...prev, idade: e.target.value }))}
                      placeholder="Faixa etária do cliente ideal"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cliente_ideal">Cliente Ideal (Profissão/Comportamento)</Label>
                  <Textarea
                    id="cliente_ideal"
                    value={formData.cliente_ideal}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente_ideal: e.target.value }))}
                    placeholder="Como é o seu cliente ideal? (profissão, comportamento no dia a dia)"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="dificuldade">Principal Dificuldade</Label>
                  <Textarea
                    id="dificuldade"
                    value={formData.dificuldade}
                    onChange={(e) => setFormData(prev => ({ ...prev, dificuldade: e.target.value }))}
                    placeholder="Qual a principal dificuldade do seu cliente no dia a dia?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardContent className="p-6">
                {renderPreview()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};