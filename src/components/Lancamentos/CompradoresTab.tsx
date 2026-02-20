import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, RefreshCw, Loader2, DollarSign, Users, Target, MousePointerClick, Search, ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildCompradoresAnalysis, CompradoresAnalysisResult } from '@/lib/compradoresAnalysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CompradoresTabProps {
    lancamento: any;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const normalizeText = (text: string) => {
    return text ? String(text).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
};

const extractNumber = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;

    let str = String(val).replace(/R\$\s?/gi, '').trim();

    const hasComma = str.includes(',');
    const hasDot = str.includes('.');

    if (hasComma && hasDot) {
        const lastCommaIndex = str.lastIndexOf(',');
        const lastDotIndex = str.lastIndexOf('.');
        if (lastCommaIndex > lastDotIndex) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        str = str.replace(',', '.');
    }

    const num = Number(str);
    return isNaN(num) ? 0 : num;
};

export const CompradoresTab = ({ lancamento }: CompradoresTabProps) => {
    const [data, setData] = useState<any[]>([]);
    const [leadsData, setLeadsData] = useState<any[]>([]);
    const [pesquisaData, setPesquisaData] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<CompradoresAnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [linkId, setLinkId] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [creativesSearch, setCreativesSearch] = useState('');
    const [creativesSort, setCreativesSort] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: 'buyers', direction: 'desc' });
    const [audiencesSearch, setAudiencesSearch] = useState('');
    const [audiencesSort, setAudiencesSort] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: 'buyers', direction: 'desc' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mappingModalOpen, setMappingModalOpen] = useState(false);
    const [pendingData, setPendingData] = useState<any[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState({
        nome: '',
        email: '',
        telefone: '',
        valor: ''
    });
    const [creativesMap, setCreativesMap] = useState<Record<string, { thumbnail: string, url: string }>>({});

    useEffect(() => {
        if (analysis?.topContents && lancamento.cliente_id) {
            fetchCreativesInfo();
        }
    }, [analysis, lancamento.cliente_id]);

    const fetchCreativesInfo = async () => {
        try {
            const { data: accounts } = await supabase
                .from('meta_client_ad_accounts')
                .select('id, ad_account_id')
                .eq('cliente_id', lancamento.cliente_id);

            const accountIds = accounts?.map(a => a.id) || [];
            if (accountIds.length === 0) return;

            const { data, error } = await supabase
                .from('meta_ad_insights')
                .select('ad_name, creative_thumbnail_url, creative_url')
                .in('ad_account_id', accountIds)
                .order('date_start', { ascending: false })
                .limit(5000);

            if (error) throw error;

            const map: Record<string, { thumbnail: string, url: string }> = {};
            if (data && analysis?.topContents) {
                analysis.topContents.forEach((content: any) => {
                    const normContent = normalizeText(content.name);
                    const match = data.find((ad: any) => {
                        const adName = normalizeText(ad.ad_name);
                        return adName.includes(normContent) || normContent.includes(adName);
                    });
                    if (match && match.creative_thumbnail_url) {
                        map[normContent] = {
                            thumbnail: match.creative_thumbnail_url,
                            url: match.creative_url
                        };
                    }
                });
            }
            setCreativesMap(map);
        } catch (e) {
            console.error("Error fetching creatives info", e);
        }
    };

    useEffect(() => {
        fetchCompradoresData();
    }, [lancamento.id]);

    const fetchCompradoresData = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const { data: links, error } = await supabase
                .from('lancamento_links')
                .select('*')
                .eq('lancamento_id', lancamento.id)
                .in('nome', ['Planilha de Compradores', 'Planilha de Leads', 'Planilha de Pesquisa']);

            if (error) throw error;

            let cData: any[] = [];
            let lData: any[] = [];
            let pData: any[] = [];

            if (links) {
                const cLink = links.find(l => l.nome === 'Planilha de Compradores');
                const lLink = links.find(l => l.nome === 'Planilha de Leads');
                const pLink = links.find(l => l.nome === 'Planilha de Pesquisa');

                if (cLink) {
                    setLinkId(cLink.id);
                    setLastSync(cLink.last_sync_at);
                    if (cLink.cached_data && Array.isArray(cLink.cached_data)) cData = cLink.cached_data;
                }
                if (lLink?.cached_data && Array.isArray(lLink.cached_data)) lData = lLink.cached_data;
                if (pLink?.cached_data && Array.isArray(pLink.cached_data)) pData = pLink.cached_data;
            }

            setData(cData);
            setLeadsData(lData);
            setPesquisaData(pData);

            if (cData.length > 0) {
                const res = buildCompradoresAnalysis(cData, lData, pData);
                setAnalysis(res);
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Erro ao carregar dados de compradores.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const parsedData = results.data;

                    if (!parsedData || parsedData.length === 0) {
                        throw new Error("O arquivo CSV está vazio ou inválido.");
                    }

                    // Extract headers from first row
                    if (parsedData.length > 0) {
                        const headers = Object.keys(parsedData[0] as any);
                        setCsvHeaders(headers);

                        // Try to auto-guess mapping based on header string
                        const gNome = headers.find(h => normalizeText(h).includes('nome') || normalizeText(h).includes('name') || normalizeText(h).includes('comprador')) || '';
                        const gEmail = headers.find(h => normalizeText(h).includes('email') || normalizeText(h).includes('mail')) || '';
                        const gTel = headers.find(h => normalizeText(h).includes('telefone') || normalizeText(h).includes('celular') || normalizeText(h).includes('whatsapp') || normalizeText(h).includes('phone')) || '';
                        const gVal = headers.find(h => normalizeText(h).includes('valor') || normalizeText(h).includes('price') || normalizeText(h).includes('preço') || normalizeText(h).includes('preco') || normalizeText(h).includes('faturamento')) || '';

                        setColumnMapping({
                            nome: gNome,
                            email: gEmail,
                            telefone: gTel,
                            valor: gVal
                        });
                    }

                    setPendingData(parsedData as any[]);
                    setMappingModalOpen(true);
                } catch (err: any) {
                    console.error(err);
                    toast.error(err.message || "Erro ao processar arquivo.");
                } finally {
                    setUploading(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            },
            error: (error) => {
                setUploading(false);
                toast.error("Erro ao ler o arquivo CSV: " + error.message);
            }
        });
    };

    const handleSaveMapping = async () => {
        try {
            setUploading(true);

            // Apply mapping
            const mappedData = pendingData.map(row => {
                const newRow = { ...row };
                if (columnMapping.nome && columnMapping.nome !== 'none') newRow['_mapped_nome'] = row[columnMapping.nome];
                if (columnMapping.email && columnMapping.email !== 'none') newRow['_mapped_email'] = row[columnMapping.email];
                if (columnMapping.telefone && columnMapping.telefone !== 'none') newRow['_mapped_telefone'] = row[columnMapping.telefone];
                if (columnMapping.valor && columnMapping.valor !== 'none') newRow['_mapped_valor'] = String(row[columnMapping.valor]);
                return newRow;
            });

            // Save to Supabase
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Usuário não autenticado');

            const payload = {
                lancamento_id: lancamento.id,
                nome: 'Planilha de Compradores',
                url: '', // Avoid NOT NULL constraint violation for direct CSV upload
                cached_data: mappedData,
                last_sync_at: new Date().toISOString(),
                ordem: 100, // Just a sorting order if needed
                criado_por: userData.user.id
            };

            let currentId = linkId;
            if (linkId) {
                const { error: updateError } = await supabase
                    .from('lancamento_links')
                    .update({ cached_data: mappedData, last_sync_at: payload.last_sync_at })
                    .eq('id', linkId);
                if (updateError) throw updateError;
            } else {
                const { data: newLink, error: insertError } = await supabase
                    .from('lancamento_links')
                    .insert(payload)
                    .select()
                    .single();
                if (insertError) throw insertError;
                if (newLink) {
                    setLinkId(newLink.id);
                    currentId = newLink.id;
                }
            }

            setData(mappedData);
            setLastSync(payload.last_sync_at);
            const res = buildCompradoresAnalysis(mappedData, leadsData, pesquisaData);
            setAnalysis(res);

            toast.success("Lista de compradores mapeada e salva com sucesso!");
            setMappingModalOpen(false);
            setPendingData([]);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Erro ao salvar mapeamento.");
        } finally {
            setUploading(false);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Find column name for value/price to calculate total revenue
    const valueColumnKeys = data.length > 0 ? Object.keys(data[0]).filter(k => {
        if (data[0]['_mapped_valor'] !== undefined && k === '_mapped_valor') return true;
        return normalizeText(k).includes('valor') ||
            normalizeText(k).includes('price') ||
            normalizeText(k).includes('preço') ||
            normalizeText(k).includes('preco') ||
            normalizeText(k).includes('faturamento')
    }) : [];

    const valueKey = valueColumnKeys.length > 0 ? valueColumnKeys[0] : null;

    const metrics = useMemo(() => {
        const totalCompradores = data.length;
        let faturamento = 0;

        if (valueKey) {
            faturamento = data.reduce((acc, row) => acc + extractNumber(row[valueKey]), 0);
        } else {
            // If no value column is found but we have users, maybe fallback or just 0
            // We could also ask user to map columns in a more complex version
        }

        const investimento = Number(lancamento.investimento_total || 0); // Need to decide if we use metrics.spend (realized) or total (planned)
        // Actually, we should probably get the actual spend. For now we use the planned or what we have.
        // If we can get `lancamento.investimento_total`, great. Realized spend would be better.
        // We will use lancamento.investimento_total as placeholder for CAC and ROAS, since actual spend is in another tab state.

        // We can also fetch the real spend from meta ads if we want, but for now we follow the simple path.
        const roas = investimento > 0 ? faturamento / investimento : 0;
        const cac = totalCompradores > 0 ? investimento / totalCompradores : 0;

        return {
            totalCompradores,
            faturamento,
            investimento,
            roas,
            cac
        };
    }, [data, lancamento, valueKey]);

    const filteredData = data.filter(row => {
        if (!searchTerm) return true;
        return Object.entries(row)
            .filter(([k]) => !k.startsWith('_mapped_'))
            .some(([_, val]) => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === valB) return 0;

        const numA = Number(String(valA).replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.'));
        const numB = Number(String(valB).replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.'));

        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    const filteredCreatives = useMemo(() => {
        if (!analysis?.topContents) return [];
        let items = analysis.topContents.filter(c => c.name.toLowerCase().includes(creativesSearch.toLowerCase()));
        if (creativesSort.key) {
            items.sort((a, b) => {
                const valA = a[creativesSort.key as keyof typeof a];
                const valB = b[creativesSort.key as keyof typeof b];
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return creativesSort.direction === 'asc' ? valA - valB : valB - valA;
                }
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                return creativesSort.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            });
        }
        return items;
    }, [analysis?.topContents, creativesSearch, creativesSort]);

    const filteredAudiences = useMemo(() => {
        if (!analysis?.topTerms) return [];
        let items = analysis.topTerms.filter(c => c.name.toLowerCase().includes(audiencesSearch.toLowerCase()));
        if (audiencesSort.key) {
            items.sort((a, b) => {
                const valA = a[audiencesSort.key as keyof typeof a];
                const valB = b[audiencesSort.key as keyof typeof b];
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return audiencesSort.direction === 'asc' ? valA - valB : valB - valA;
                }
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                return audiencesSort.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            });
        }
        return items;
    }, [analysis?.topTerms, audiencesSearch, audiencesSort]);

    const handleCreativesSort = (key: string) => {
        setCreativesSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleAudiencesSort = (key: string) => {
        setAudiencesSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h3 className="text-lg font-medium">Análise de Compradores</h3>
                <div className="flex items-center gap-2">
                    {lastSync && (
                        <span className="text-xs text-muted-foreground mr-2">
                            Última atualização: {new Date(lastSync).toLocaleString()}
                        </span>
                    )}
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="gap-2"
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {data.length > 0 ? 'Atualizar CSV' : 'Subir CSV de Compradores'}
                    </Button>
                </div>
            </div>

            {errorMsg && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    {errorMsg}
                </div>
            )}

            {data.length === 0 && !uploading && !errorMsg ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-muted-foreground">Nenhum comprador cadastrado</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-2">
                            Faça o upload do arquivo CSV com a lista de pessoas que compraram o produto para gerar as análises de faturamento e cruzar os dados.
                        </p>
                        <Button
                            variant="outline"
                            className="mt-6 gap-2"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-4 w-4" />
                            Selecionar arquivo CSV
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(metrics.faturamento)}</div>
                                {!valueKey && data.length > 0 && (
                                    <p className="text-xs text-amber-600 mt-1">Nenhuma coluna de valor encontrada no CSV.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Compradores</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.totalCompradores}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">ROAS</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.roas.toFixed(2)}x</div>
                                <p className="text-xs text-muted-foreground mt-1">Base: {formatCurrency(metrics.investimento)} (Planejado)</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">CAC</CardTitle>
                                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(metrics.cac)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gráficos de Análise Cruzada */}
                    {analysis && leadsData.length === 0 && pesquisaData.length === 0 ? (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base text-amber-600 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    Planilhas de Leads e Pesquisa não sincronizadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Para visualizar o cruzamento de dados com os compradores (origem, UTMs, etc.), você precisa sincronizar a Planilha de Leads ou a Planilha de Pesquisa na aba de <strong>Resultados</strong> ou configurar os links na aba <strong>Links Úteis</strong>.
                                </p>
                            </CardContent>
                        </Card>
                    ) : analysis && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <h3 className="text-lg font-medium">Cruzamento: Compradores x Leads/Pesquisa</h3>
                                <Badge variant="outline" className={analysis.matchedBuyers > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground"}>
                                    {analysis.matchedBuyers} compradores identificados ({((analysis.matchedBuyers / (analysis.totalBuyers || 1)) * 100).toFixed(1)}% de match)
                                </Badge>
                            </div>

                            {analysis.matchedBuyers === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                                        <h3 className="text-lg font-semibold text-muted-foreground">Nenhum cruzamento encontrado</h3>
                                        <p className="text-sm text-muted-foreground max-w-md mt-2">
                                            Não foi possível encontrar esses compradores na Planilha de Leads ou Pesquisa. Certifique-se de que os contatos coincidem e que você possui leads sincronizados.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Top Campanhas</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analysis.topCampaigns}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="name" tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} interval={0} angle={-20} textAnchor="end" height={60} />
                                                            <YAxis />
                                                            <Tooltip formatter={(value: number, name: string) => [name === 'conversion_rate' ? `${value.toFixed(1)}%` : value, name === 'buyers' ? 'Compradores' : name === 'total' ? 'Leads' : 'Conversão']} />
                                                            <Legend />
                                                            <Bar dataKey="buyers" name="Compradores" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Top Termos/Criativos</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analysis.topTerms}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="name" tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} interval={0} angle={-20} textAnchor="end" height={60} />
                                                            <YAxis />
                                                            <Tooltip formatter={(value: number, name: string) => [name === 'conversion_rate' ? `${value.toFixed(1)}%` : value, name === 'buyers' ? 'Compradores' : name === 'total' ? 'Leads' : 'Conversão']} />
                                                            <Legend />
                                                            <Bar dataKey="buyers" name="Compradores" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Top Fontes de Tráfego</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analysis.topSources}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="name" tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} interval={0} angle={-20} textAnchor="end" height={60} />
                                                            <YAxis />
                                                            <Tooltip formatter={(value: number, name: string) => [name === 'conversion_rate' ? `${value.toFixed(1)}%` : value, name === 'buyers' ? 'Compradores' : name === 'total' ? 'Leads' : 'Conversão']} />
                                                            <Legend />
                                                            <Bar dataKey="buyers" name="Compradores" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Conversão por Origem (ROAS base leads)</CardTitle>
                                                <p className="text-xs text-muted-foreground">Taxa de Conversão Leads -{'>'} Compradores</p>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[285px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analysis.topSources} layout="vertical" margin={{ left: 50 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                            <XAxis type="number" tickFormatter={(v) => v.toFixed(1) + '%'} />
                                                            <YAxis type="category" dataKey="name" tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                                                            <Tooltip formatter={(value: number, name: string) => [value.toFixed(1) + '%', 'Taxa de Conversão']} />
                                                            <Legend />
                                                            <Bar dataKey="conversion_rate" name="Taxa de Conversão" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <h3 className="text-lg font-medium pt-4">Resultados por Respostas da Pesquisa</h3>
                                    <p className="text-sm text-muted-foreground">Quais características do seu lead trouxeram a maior taxa de compra? Rankeadas das respostas que mais convertem para as que menos convertem.</p>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        {analysis.questionsAnalysis.slice(0, 4).map((qa, index) => (
                                            <Card key={index}>
                                                <CardHeader>
                                                    <CardTitle className="text-base">{qa.question}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="h-[280px]">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={qa.options.slice(0, 10)} layout="vertical" margin={{ left: 30 }}>
                                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                                <XAxis type="number" tickFormatter={(v) => v.toFixed(1) + '%'} />
                                                                <YAxis type="category" dataKey="name" tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                                                                <Tooltip formatter={(value: number, name: string) => [name === 'conversion_rate' ? value.toFixed(1) + '%' : value, name === 'conversion_rate' ? 'Taxa Conv.' : name === 'buyers' ? 'Compradores' : 'Total Respostas']} />
                                                                <Legend />
                                                                <Bar dataKey="conversion_rate" name="Conversão (%)" fill="#ec4899" radius={[0, 4, 4, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Ranking de Criativos */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 pb-2 gap-4">
                                        <div>
                                            <h3 className="text-lg font-medium">Ranking de Criativos</h3>
                                            <p className="text-sm text-muted-foreground">Desempenho dos criativos que mais trouxeram compradores.</p>
                                        </div>
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar criativo..."
                                                value={creativesSearch}
                                                onChange={(e) => setCreativesSearch(e.target.value)}
                                                className="pl-9 h-9"
                                            />
                                        </div>
                                    </div>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="border rounded-md overflow-hidden">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow>
                                                            <TableHead className="w-[80px]">Criativo</TableHead>
                                                            <TableHead className="cursor-pointer hover:bg-muted/80" onClick={() => handleCreativesSort('name')}>
                                                                <div className="flex items-center gap-1">Nome {creativesSort.key === 'name' ? (creativesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleCreativesSort('buyers')}>
                                                                <div className="flex items-center justify-end gap-1">Compradores {creativesSort.key === 'buyers' ? (creativesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleCreativesSort('total')}>
                                                                <div className="flex items-center justify-end gap-1">Leads {creativesSort.key === 'total' ? (creativesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleCreativesSort('conversion_rate')}>
                                                                <div className="flex items-center justify-end gap-1">Conversão {creativesSort.key === 'conversion_rate' ? (creativesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleCreativesSort('revenue')}>
                                                                <div className="flex items-center justify-end gap-1">Faturamento {creativesSort.key === 'revenue' ? (creativesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(!filteredCreatives || filteredCreatives.length === 0) && (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                                    Nenhum criativo encontrado.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        {(filteredCreatives || []).map((content, i) => {
                                                            const creative = creativesMap[normalizeText(content.name)];
                                                            return (
                                                                <TableRow key={i}>
                                                                    <TableCell>
                                                                        {creative?.thumbnail ? (
                                                                            <div className="relative w-12 h-12 rounded overflow-hidden border group bg-muted flex items-center justify-center">
                                                                                <img src={creative.thumbnail} alt={content.name} className="w-full h-full object-cover" />
                                                                                {creative.url && (
                                                                                    <a href={creative.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                        <Eye className="w-4 h-4 text-white" />
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                                                                                <span className="text-xs text-muted-foreground">N/A</span>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="font-medium text-sm max-w-[200px]" title={content.name}>{content.name || '(sem conteúdo)'}</TableCell>
                                                                    <TableCell className="text-right font-medium">{content.buyers}</TableCell>
                                                                    <TableCell className="text-right">{content.total || 0}</TableCell>
                                                                    <TableCell className="text-right">{content.conversion_rate.toFixed(1)}%</TableCell>
                                                                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(content.revenue || 0)}</TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Ranking de Públicos */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 pb-2 gap-4">
                                        <div>
                                            <h3 className="text-lg font-medium">Ranking de Públicos</h3>
                                            <p className="text-sm text-muted-foreground">Desempenho dos públicos que mais trouxeram compradores.</p>
                                        </div>
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar público..."
                                                value={audiencesSearch}
                                                onChange={(e) => setAudiencesSearch(e.target.value)}
                                                className="pl-9 h-9"
                                            />
                                        </div>
                                    </div>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="border rounded-md overflow-hidden">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow>
                                                            <TableHead className="cursor-pointer hover:bg-muted/80" onClick={() => handleAudiencesSort('name')}>
                                                                <div className="flex items-center gap-1">Público {audiencesSort.key === 'name' ? (audiencesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleAudiencesSort('buyers')}>
                                                                <div className="flex items-center justify-end gap-1">Compradores {audiencesSort.key === 'buyers' ? (audiencesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleAudiencesSort('total')}>
                                                                <div className="flex items-center justify-end gap-1">Leads {audiencesSort.key === 'total' ? (audiencesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleAudiencesSort('conversion_rate')}>
                                                                <div className="flex items-center justify-end gap-1">Conversão {audiencesSort.key === 'conversion_rate' ? (audiencesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                            <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleAudiencesSort('revenue')}>
                                                                <div className="flex items-center justify-end gap-1">Faturamento {audiencesSort.key === 'revenue' ? (audiencesSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</div>
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(!filteredAudiences || filteredAudiences.length === 0) && (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                                                    Nenhum público encontrado.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        {(filteredAudiences || []).map((term, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium text-sm max-w-[200px]" title={term.name}>{term.name || '(sem termo)'}</TableCell>
                                                                <TableCell className="text-right font-medium">{term.buyers}</TableCell>
                                                                <TableCell className="text-right">{term.total || 0}</TableCell>
                                                                <TableCell className="text-right">{term.conversion_rate.toFixed(1)}%</TableCell>
                                                                <TableCell className="text-right text-green-600 font-medium">{formatCurrency(term.revenue || 0)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                </>
                            )}
                        </div>
                    )}

                    {/* Tabela de Compradores */}
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 gap-4">
                            <CardTitle className="text-base">Lista de Compradores</CardTitle>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar comprador..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md overflow-hidden">
                                <div className="max-h-[400px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {data.length > 0 && Object.keys(data[0])
                                                    .filter(header => !header.startsWith('_mapped_'))
                                                    .map((header) => (
                                                        <TableHead
                                                            key={header}
                                                            className="whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                                                            onClick={() => handleSort(header)}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                <span>{header}</span>
                                                                {sortConfig.key === header ? (
                                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedData.map((row, i) => (
                                                <TableRow key={i}>
                                                    {Object.entries(row)
                                                        .filter(([k]) => !k.startsWith('_mapped_'))
                                                        .map(([k, val]: any, j) => (
                                                            <TableCell key={j} className="whitespace-nowrap">
                                                                {String(val || '')}
                                                            </TableCell>
                                                        ))}
                                                </TableRow>
                                            ))}
                                            {sortedData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={Object.keys(data[0] || {}).filter(k => !k.startsWith('_mapped_')).length || 1} className="text-center py-6 text-muted-foreground">
                                                        Nenhum resultado encontrado.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                </>
            )}

            {/* Modal de Mapeamento */}
            <Dialog open={mappingModalOpen} onOpenChange={setMappingModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Mapear Colunas do CSV</DialogTitle>
                        <DialogDescription>
                            Relacione as colunas relevantes do seu CSV com os campos abaixo para podermos analisar os dados corretamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nome">Coluna: Nome do Comprador</Label>
                            <Select value={columnMapping.nome} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, nome: val }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Não mapear</SelectItem>
                                    {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Coluna: Email</Label>
                            <Select value={columnMapping.email} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, email: val }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Não mapear</SelectItem>
                                    {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="telefone">Coluna: Telefone</Label>
                            <Select value={columnMapping.telefone} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, telefone: val }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Não mapear</SelectItem>
                                    {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="valor">Coluna: ValorPago / Faturamento</Label>
                            <Select value={columnMapping.valor} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, valor: val }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Não mapear</SelectItem>
                                    {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setMappingModalOpen(false); setPendingData([]); }}>Cancelar</Button>
                        <Button onClick={handleSaveMapping} disabled={uploading}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar e Analisar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
