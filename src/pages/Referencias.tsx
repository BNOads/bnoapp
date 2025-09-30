import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Edit2, Trash2, Copy, ExternalLink, Upload } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Referencia {
  id: string;
  titulo: string;
  categoria: 'criativos' | 'pagina';
  created_at: string;
  updated_at: string;
  is_public: boolean;
  public_slug?: string;
  created_by: string;
  link_url?: string;
  conteudo?: string;
}

export default function Referencias() {
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const [filteredReferencias, setFilteredReferencias] = useState<Referencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | 'criativos' | 'pagina'>('todas');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; referencia?: Referencia }>({ open: false });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadReferencias();
  }, []);

  useEffect(() => {
    filterReferencias();
  }, [searchTerm, filtroCategoria, referencias]);

  const loadReferencias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referencias_criativos')
        .select('*')
        .eq('ativo', true)
        .is('cliente_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferencias((data || []) as Referencia[]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as referências.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReferencias = () => {
    let filtered = referencias;

    if (filtroCategoria !== 'todas') {
      filtered = filtered.filter(ref => ref.categoria === filtroCategoria);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(ref => 
        ref.titulo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReferencias(filtered);
  };

  const handleCopyLink = (referencia: Referencia) => {
    const baseUrl = window.location.origin;
    const url = referencia.public_slug && referencia.is_public
      ? `${baseUrl}/r/${referencia.public_slug}`
      : `${baseUrl}/referencias/${referencia.id}`;
    
    navigator.clipboard.writeText(url);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência.",
      duration: 2000
    });
  };

  const handleDelete = async () => {
    if (!deleteDialog.referencia) return;
    
    if (confirmTitle !== deleteDialog.referencia.titulo) {
      toast({
        title: "Erro",
        description: "O título digitado não corresponde.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('soft_delete_referencia', {
        _id: deleteDialog.referencia.id
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Referência excluída com sucesso!"
      });

      setDeleteDialog({ open: false });
      setConfirmTitle("");
      loadReferencias();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir referência",
        variant: "destructive"
      });
    }
  };

  const processarImportacaoCSV = async () => {
    if (!csvFile) return;
    setImportLoading(true);
    
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      // Esperado: titulo,categoria,link_url
      const referencesData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return {
          titulo: values[0] || '',
          categoria: (['criativos', 'pagina'].includes(values[1]) ? values[1] : 'criativos') as 'criativos' | 'pagina',
          link_url: values[2] || ''
        };
      });

      const { data: userData } = await supabase.auth.getUser();
      
      for (const refData of referencesData) {
        if (refData.titulo && refData.link_url) {
          await supabase.from('referencias_criativos').insert({
            cliente_id: null,
            titulo: refData.titulo,
            categoria: refData.categoria,
            conteudo: JSON.stringify([]),
            link_url: refData.link_url,
            created_by: userData.user?.id
          });
        }
      }

      toast({
        title: "Sucesso",
        description: `${referencesData.filter(r => r.titulo && r.link_url).length} referências importadas com sucesso!`
      });

      setShowImportModal(false);
      setCsvFile(null);
      loadReferencias();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao processar arquivo CSV: " + error.message,
        variant: "destructive"
      });
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplateCSV = () => {
    const template = `titulo,categoria,link_url
"Exemplo Referência de Criativos","criativos","https://example.com/criativo"
"Exemplo Referência de Página","pagina","https://example.com/pagina"`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_referencias.csv';
    link.click();
  };

  const contarBlocos = (referencia: Referencia): number => {
    try {
      if (!referencia.conteudo) return 0;
      const conteudo = JSON.parse(referencia.conteudo);
      return Array.isArray(conteudo) ? conteudo.length : 0;
    } catch {
      return 0;
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Referências</h1>
          <p className="text-muted-foreground">Gerencie suas referências criativas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={() => navigate('/referencias/novo')}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Referência
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar referências..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filtroCategoria} onValueChange={(value: any) => setFiltroCategoria(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="criativos">Criativos</SelectItem>
                <SelectItem value="pagina">Página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredReferencias.length} {filteredReferencias.length === 1 ? 'referência' : 'referências'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Blocos</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma referência encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferencias.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-medium">{ref.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ref.categoria === 'criativos' ? 'Criativos' : 'Página'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ref.link_url ? "secondary" : "default"}>
                        Referência
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contarBlocos(ref)} bloco(s)
                    </TableCell>
                    <TableCell>
                      {format(new Date(ref.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {ref.link_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(ref.link_url, '_blank')}
                            title="Abrir link externo em nova aba"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/referencias/${ref.id}?mode=view`)}
                            title="Visualizar referência"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(ref)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, referencia: ref })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => {
        setDeleteDialog({ open });
        if (!open) setConfirmTitle("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Digite o título da referência para confirmar a exclusão:
              <br />
              <strong>{deleteDialog.referencia?.titulo}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder="Digite o título exato"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Referências via CSV</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo CSV com referências externas (título, categoria, link_url)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplateCSV} className="flex-1">
                Baixar Template CSV
              </Button>
              <Button 
                onClick={processarImportacaoCSV} 
                disabled={!csvFile || importLoading}
                className="flex-1"
              >
                {importLoading ? "Importando..." : "Importar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
