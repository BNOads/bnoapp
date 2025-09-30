import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, Edit2, Eye, Trash2, Copy, ArrowLeft, Share2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WYSIWYGEditor } from "@/components/ui/WYSIWYGEditor";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ReferenciaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewRef = id === 'novo';
  const initialMode = searchParams.get('mode') === 'view' ? 'view' : 'edit';

  const [mode, setMode] = useState<'edit' | 'view'>(isNewRef ? 'edit' : initialMode);
  const [loading, setLoading] = useState(!isNewRef);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "criativos" as "criativos" | "pagina",
    conteudo_markdown: "",
    created_at: "",
    updated_at: "",
    created_by: "",
    is_public: false,
    public_slug: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    if (!isNewRef && id) {
      loadReferencia();
    }
  }, [id, isNewRef]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const loadReferencia = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referencias_criativos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        titulo: data.titulo,
        categoria: data.categoria as "criativos" | "pagina",
        conteudo_markdown: data.conteudo_markdown || "",
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.created_by,
        is_public: data.is_public || false,
        public_slug: data.public_slug || ""
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a referência.",
        variant: "destructive"
      });
      navigate('/referencias');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      setSaveStatus('saving');

      const user = await supabase.auth.getUser();
      const dataToSave = {
        titulo: formData.titulo,
        categoria: formData.categoria,
        conteudo_markdown: formData.conteudo_markdown,
        cliente_id: null,
        created_by: user.data.user?.id,
        is_public: formData.is_public,
        public_slug: formData.is_public ? formData.public_slug : null
      };

      let result;
      if (isNewRef) {
        result = await supabase
          .from('referencias_criativos')
          .insert([dataToSave])
          .select()
          .single();

        if (result.error) throw result.error;

        toast({
          title: "✔ Salvo",
          description: "Referência criada com sucesso!",
        });

        // Redirecionar para a página de edição da nova referência
        navigate(`/referencias/${result.data.id}`, { replace: true });
      } else {
        result = await supabase
          .from('referencias_criativos')
          .update(dataToSave)
          .eq('id', id)
          .select()
          .single();

        if (result.error) throw result.error;

        // Atualizar formData com os dados retornados
        if (result.data) {
          setFormData({
            titulo: result.data.titulo,
            categoria: result.data.categoria as "criativos" | "pagina",
            conteudo_markdown: result.data.conteudo_markdown || "",
            created_at: result.data.created_at,
            updated_at: result.data.updated_at,
            created_by: result.data.created_by,
            is_public: result.data.is_public || false,
            public_slug: result.data.public_slug || ""
          });
        }

        toast({
          title: "✔ Salvo",
          description: "Referência atualizada!",
        });
      }

      setHasChanges(false);
      setSaveStatus('saved');
      setLastSaved(new Date());

      // Limpar status após 3s
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setSaveStatus('error');
      toast({
        title: "Erro",
        description: "Não foi possível salvar a referência.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmTitle !== formData.titulo) {
      toast({
        title: "Erro",
        description: "O título digitado não corresponde.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('soft_delete_referencia', {
        _id: id
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Referência excluída com sucesso!"
      });

      navigate('/referencias');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir referência",
        variant: "destructive"
      });
    }
  };

  const handleShareToggle = async () => {
    // Verificar se é nova referência
    if (isNewRef) {
      toast({
        title: "Erro",
        description: "Salve a referência antes de compartilhar.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.is_public) {
      // Validar título
      if (!formData.titulo.trim()) {
        toast({
          title: "Erro",
          description: "Adicione um título antes de compartilhar.",
          variant: "destructive"
        });
        return;
      }

      try {
        setSaving(true);
        
        // Salvar alteração is_public=true - o trigger vai gerar public_slug/token
        const { data, error } = await supabase
          .from('referencias_criativos')
          .update({ is_public: true })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        
        if (!data.public_slug) {
          throw new Error('Slug público não foi gerado pelo sistema');
        }

        // Atualizar formData com os dados retornados (incluindo public_slug gerado)
        setFormData({
          titulo: data.titulo,
          categoria: data.categoria as "criativos" | "pagina",
          conteudo_markdown: data.conteudo_markdown || "",
          created_at: data.created_at,
          updated_at: data.updated_at,
          created_by: data.created_by,
          is_public: data.is_public || false,
          public_slug: data.public_slug || ""
        });

        // Copiar link público
        const publicUrl = `${window.location.origin}/r/${data.public_slug}`;
        await navigator.clipboard.writeText(publicUrl);

        toast({
          title: "✔ Link Público Criado",
          description: "Link copiado para a área de transferência!",
        });

        setHasChanges(false);
      } catch (error: any) {
        console.error('Erro ao compartilhar:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o link público.",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
    } else {
      // Se já está público, copiar link
      const publicUrl = `${window.location.origin}/r/${formData.public_slug}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copiado!",
        description: "Link público copiado para a área de transferência.",
        duration: 2000
      });
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/referencias">Referências</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isNewRef ? 'Nova' : formData.titulo || 'Editar'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Save Status Banner */}
      {saveStatus && (
        <div className={`px-4 py-2 rounded-md text-sm ${
          saveStatus === 'saved' ? 'bg-green-50 text-green-800 border border-green-200' :
          saveStatus === 'saving' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {saveStatus === 'saved' && `✔ Salvo às ${format(lastSaved!, 'HH:mm', { locale: ptBR })}`}
          {saveStatus === 'saving' && 'Salvando…'}
          {saveStatus === 'error' && '❗Erro ao salvar'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/referencias')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          {mode === 'edit' ? (
            <Input
              value={formData.titulo}
              onChange={(e) => handleFieldChange('titulo', e.target.value)}
              placeholder="Título da referência"
              className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
            />
          ) : (
            <h1 className="text-2xl font-bold">{formData.titulo}</h1>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isNewRef && (
            <Button
              variant={formData.is_public ? "default" : "outline"}
              onClick={handleShareToggle}
              className="gap-2"
            >
              {formData.is_public ? (
                <>
                  <Globe className="w-4 h-4" />
                  Link Público
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            variant={hasChanges ? "default" : "outline"}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
          
          {!isNewRef && (
            <>
              <Button
                variant="outline"
                onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
              >
                {mode === 'edit' ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={() => setDeleteDialog(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[250px_1fr] gap-6">
        {/* Sidebar - Metadados */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              {mode === 'edit' ? (
                <Select 
                  value={formData.categoria} 
                  onValueChange={(value: any) => handleFieldChange('categoria', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="criativos">Criativos</SelectItem>
                    <SelectItem value="pagina">Página</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">
                  {formData.categoria === 'criativos' ? 'Criativos' : 'Página'}
                </Badge>
              )}
            </div>

            {/* Status do Compartilhamento */}
            {!isNewRef && formData.is_public && (
              <div className="space-y-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">
                    Público
                  </Label>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 break-all">
                  {window.location.origin}/r/{formData.public_slug}
                </p>
              </div>
            )}

            {!isNewRef && formData.created_at && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Criado em</Label>
                  <p className="text-sm">
                    {format(new Date(formData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                  <p className="text-sm">
                    {format(new Date(formData.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="ref-page">
          <CardContent className="pt-6">
            <WYSIWYGEditor
              content={formData.conteudo_markdown}
              onChange={(content) => handleFieldChange('conteudo_markdown', content)}
              showToolbar={mode === 'edit'}
              className="min-h-[600px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Digite o título da referência para confirmar a exclusão:
              <br />
              <strong>{formData.titulo}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder="Digite o título exato"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmTitle("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
