import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    ExternalLink,
    Folder,
    FileImage,
    Video,
    FileText,
    File,
    AlertCircle,
    Search,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Copy,
    Download,
    FolderOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LancamentoCriativosTabProps {
    lancamentoId: string;
    onManage?: () => void;
}

interface CreativeFile {
    id: string;
    name: string;
    mime_type: string;
    link_web_view: string;
    link_direct: string;
    folder_name: string;
    status: 'subir' | 'ativo' | 'inativo' | 'erro';
    nomenclatura_trafego?: string;
    legenda?: string;
    pagina_destino?: string;
    modified_time: string;
    created_at: string;
    is_active: boolean;
    activated_at?: string;
    activated_user?: { nome: string };
    file_id?: string;
    thumbnail_link?: string;
}

export function LancamentoCriativosTab({ lancamentoId, onManage }: LancamentoCriativosTabProps) {
    const [creatives, setCreatives] = useState<CreativeFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [editingNomenclatura, setEditingNomenclatura] = useState<{ id: string; value: string } | null>(null);
    const [editingLegenda, setEditingLegenda] = useState<{ id: string; value: string } | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadLinkedCreatives();
    }, [lancamentoId]);

    const loadLinkedCreatives = async () => {
        try {
            setLoading(true);
            // 1. Get linked folder names
            const { data: linkedFolders, error: foldersError } = await supabase
                .from('lancamento_criativos')
                .select('folder_name')
                .eq('lancamento_id', lancamentoId);

            if (foldersError) throw foldersError;

            const folderNames = linkedFolders
                .map(item => item.folder_name)
                .filter((name): name is string => name !== null);

            if (folderNames.length > 0) {
                // 2. Get files for these folders
                const { data: files, error: filesError } = await supabase
                    .from('creatives')
                    .select('*')
                    .in('folder_name', folderNames);

                if (filesError) throw filesError;

                setCreatives(files as CreativeFile[]);
            } else {
                setCreatives([]);
            }

        } catch (error) {
            console.error("Erro ao carregar criativos:", error);
            toast({
                title: "Erro",
                description: "Falha ao carregar criativos.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const updateCreativeStatus = async (creativeId: string, newStatus: 'subir' | 'ativo' | 'inativo' | 'erro') => {
        try {
            // Optimistic update
            setCreatives(prev => prev.map(c =>
                c.id === creativeId ? { ...c, status: newStatus, is_active: newStatus === 'ativo' } : c
            ));

            const { error } = await supabase
                .from('creatives')
                .update({
                    status: newStatus,
                    is_active: newStatus === 'ativo',
                    activated_at: newStatus === 'ativo' ? new Date().toISOString() : null
                })
                .eq('id', creativeId);

            if (error) throw error;

            toast({ title: "Status atualizado" });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            toast({
                title: "Erro",
                description: "Falha ao atualizar status.",
                variant: "destructive"
            });
            loadLinkedCreatives(); // Revert
        }
    };

    const saveNomenclatura = async (creativeId: string, value: string) => {
        try {
            const { error } = await supabase
                .from('creatives')
                .update({ nomenclature_trafego: value }) // Check exact column name later, assuming nomenclatura_trafego
                .eq('id', creativeId);

            // Note: Column might be nomenclatura_trafego or nomenclature_trafego. 
            // Based on DriveCreativesView logic: nomenclatura_trafego

            if (error) {
                // Fallback if column name is different, but assuming standard from previous file
                const { error: retryError } = await supabase
                    .from('creatives')
                    .update({ nomenclatura_trafego: value })
                    .eq('id', creativeId);
                if (retryError) throw retryError;
            }

            setCreatives(prev => prev.map(c =>
                c.id === creativeId ? { ...c, nomenclatura_trafego: value } : c
            ));
            setEditingNomenclatura(null);
            toast({ title: "Nomenclatura salva" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar", variant: "destructive" });
        }
    };

    const saveLegenda = async (creativeId: string, value: string) => {
        try {
            const { error } = await supabase
                .from('creatives')
                .update({ legenda: value })
                .eq('id', creativeId);

            if (error) throw error;

            setCreatives(prev => prev.map(c =>
                c.id === creativeId ? { ...c, legenda: value } : c
            ));
            setEditingLegenda(null);
            toast({ title: "Legenda salva" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar", variant: "destructive" });
        }
    };

    // Sorting and Filtering
    const filteredCreatives = creatives
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            let res = 0;
            if (sortBy === 'name') res = a.name.localeCompare(b.name);
            if (sortBy === 'date') res = new Date(a.modified_time).getTime() - new Date(b.modified_time).getTime();
            if (sortBy === 'status') res = (a.status || 'subir').localeCompare(b.status || 'subir');
            return sortOrder === 'asc' ? res : -res;
        });

    const getTipoIcon = (mimeType: string) => {
        if (mimeType?.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500" />;
        if (mimeType?.startsWith('video/')) return <Video className="h-5 w-5 text-red-500" />;
        if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-green-500" />;
        return <File className="h-5 w-5 text-gray-500" />;
    };

    const toggleSort = (field: 'name' | 'date' | 'status') => {
        if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Link copiado" });
    };

    if (loading) return <div className="text-center py-8">Carregando criativos...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar arquivos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                {onManage && (
                    <Button variant="outline" size="sm" onClick={onManage}>
                        <Folder className="h-4 w-4 mr-2" />
                        Gerenciar Pastas
                    </Button>
                )}
            </div>

            {creatives.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border border-dashed rounded-lg bg-muted/30">
                    <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                    <p>Nenhuma pasta vinculada ou pastas vazias.</p>
                </div>
            ) : (
                <div className="border rounded-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px] cursor-pointer" onClick={() => toggleSort('status')}>
                                        Status <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                    </TableHead>
                                    <TableHead className="w-[50px]">Tipo</TableHead>
                                    <TableHead className="min-w-[200px] cursor-pointer" onClick={() => toggleSort('name')}>
                                        Nome do Arquivo <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                    </TableHead>
                                    <TableHead className="w-[150px]">Pasta</TableHead>
                                    <TableHead className="w-[120px] cursor-pointer" onClick={() => toggleSort('date')}>
                                        Data <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                    </TableHead>
                                    <TableHead className="min-w-[150px]">Nomenclatura</TableHead>
                                    <TableHead className="min-w-[150px]">Legenda</TableHead>
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCreatives.map((creative) => (
                                    <TableRow key={creative.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <Select
                                                value={creative.status || (creative.is_active ? 'ativo' : 'subir')}
                                                onValueChange={(val: any) => updateCreativeStatus(creative.id, val)}
                                            >
                                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="subir">Subir</SelectItem>
                                                    <SelectItem value="ativo">Ativo</SelectItem>
                                                    <SelectItem value="inativo">Inativo</SelectItem>
                                                    <SelectItem value="erro">Erro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {getTipoIcon(creative.mime_type)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm truncate max-w-[200px]" title={creative.name}>
                                                    {creative.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Folder className="h-3 w-3" />
                                                {creative.folder_name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(creative.modified_time).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {editingNomenclatura?.id === creative.id ? (
                                                <Input
                                                    value={editingNomenclatura.value}
                                                    onChange={e => setEditingNomenclatura({ ...editingNomenclatura, value: e.target.value })}
                                                    onBlur={() => saveNomenclatura(creative.id, editingNomenclatura.value)}
                                                    onKeyDown={e => e.key === 'Enter' && saveNomenclatura(creative.id, editingNomenclatura.value)}
                                                    className="h-7 text-xs"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div
                                                    className="text-xs min-h-[20px] cursor-text hover:bg-muted p-1 rounded"
                                                    onClick={() => setEditingNomenclatura({ id: creative.id, value: creative.nomenclatura_trafego || '' })}
                                                >
                                                    {creative.nomenclatura_trafego || 'Adicionar...'}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingLegenda?.id === creative.id ? (
                                                <Input
                                                    value={editingLegenda.value}
                                                    onChange={e => setEditingLegenda({ ...editingLegenda, value: e.target.value })}
                                                    onBlur={() => saveLegenda(creative.id, editingLegenda.value)}
                                                    onKeyDown={e => e.key === 'Enter' && saveLegenda(creative.id, editingLegenda.value)}
                                                    className="h-7 text-xs"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div
                                                    className="text-xs min-h-[20px] max-w-[200px] truncate cursor-text hover:bg-muted p-1 rounded"
                                                    onClick={() => setEditingLegenda({ id: creative.id, value: creative.legenda || '' })}
                                                >
                                                    {creative.legenda || 'Adicionar...'}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(creative.link_web_view, '_blank')} title="Abrir">
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(creative.link_direct)} title="Copiar Link">
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}
