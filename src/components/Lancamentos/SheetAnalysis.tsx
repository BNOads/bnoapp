
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { FileText, AlignLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface SheetAnalysisProps {
    data: any[];
    title: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#3b82f6', '#6366f1'];

export const SheetAnalysis = ({ data, title }: SheetAnalysisProps) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Detect Date Column
    const dateColumn = useMemo(() => {
        if (!data || data.length === 0) return null;
        const headers = Object.keys(data[0]);
        // Priority check
        const candidates = ['Carimbo de data/hora', 'Timestamp', 'Data', 'Date', 'Created at', 'Time'];
        for (const candidate of candidates) {
            const match = headers.find(h => h.toLowerCase() === candidate.toLowerCase());
            if (match) return match;
        }
        // Fallback: Check first column if it looks like a date
        const firstVal = data[0][headers[0]];
        if (headers[0] && !isNaN(Date.parse(firstVal))) {
            return headers[0];
        }
        return null; // No clear date column found
    }, [data]);

    const filteredData = useMemo(() => {
        if (!data) return [];
        if (!dateRange?.from || !dateColumn) return data;

        const fromTime = dateRange.from.getTime();
        const toTime = dateRange.to ? dateRange.to.getTime() + 86400000 : fromTime + 86400000; // Inclusive of end day

        return data.filter(row => {
            const dateVal = row[dateColumn];
            if (!dateVal) return false;

            // Handle Google Sheets Date formats or ISO
            let d = new Date(dateVal);
            if (isNaN(d.getTime())) {
                // Try parsing "dd/mm/yyyy hh:mm:ss" manually if needed, but assuming standard parse works for now
                // or if it's Excel serial date (rare in JSON API output usually)
                return false;
            }
            const t = d.getTime();
            return t >= fromTime && t < toTime;
        });
    }, [data, dateRange, dateColumn]);

    const analysis = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return { charts: [], wordClouds: [] };

        const headers = Object.keys(filteredData[0]).filter(key => {
            const lowerKey = key.toLowerCase();
            const forbidden = ['id', 'created_at', 'updated_at', 'lancamento_id', 'nome', 'email', 'telefone', 'celular', 'phone', 'whatsapp', 'cpf', 'rg', 'ip'];

            // Exact match forbidden
            if (forbidden.includes(lowerKey)) return false;

            // Partial match forbidden (e.g. "E-mail Address", "Celular (WhatsApp)")
            if (lowerKey.includes('email') || lowerKey.includes('e-mail') || lowerKey.includes('e_mail')) return false;
            if (lowerKey.includes('telefone') || lowerKey.includes('celular') || lowerKey.includes('whatsapp') || lowerKey.includes('phone') || lowerKey.includes('whats')) return false;
            if (lowerKey.includes('carimbo') || lowerKey.includes('data') || lowerKey.includes('hora') || lowerKey.includes('time')) return false;

            // System columns
            if (key.startsWith('_')) return false;

            // Date column excluded from charts
            if (key === dateColumn) return false;

            return true;
        });

        const charts: any[] = [];
        const wordClouds: any[] = [];

        headers.forEach(header => {
            const values = filteredData.map(row => String(row[header] || '').trim()).filter(v => v !== '');
            const total = values.length;
            if (total === 0) return;

            const counts: Record<string, number> = {};
            values.forEach(v => {
                counts[v] = (counts[v] || 0) + 1;
            });

            const uniqueCount = Object.keys(counts).length;
            const uniqueValues = Object.entries(counts)
                .map(([name, value]) => ({
                    name,
                    value,
                    percent: (value / total) * 100
                }))
                .sort((a, b) => b.value - a.value);

            // Heuristics for Chart Type

            // 1. Pie Chart: Few unique values (<= 15)
            if (uniqueCount <= 15 && uniqueCount > 1) {
                charts.push({
                    title: header,
                    data: uniqueValues,
                    type: 'pie'
                });
            }
            // 2. Word Cloud (List): Many unique values, appears to be text
            else if (uniqueCount > 15) {
                const avgLength = values.reduce((sum, val) => sum + val.length, 0) / total;

                let cloudData = uniqueValues;
                let isSentence = false;

                if (avgLength > 30) {
                    isSentence = true;
                    // Tokenize
                    const wordCounts: Record<string, number> = {};
                    values.forEach(val => {
                        val.split(/\s+/).forEach(word => {
                            const w = word.toLowerCase().replace(/[.,!?;:()]/g, '');
                            if (w.length > 3 && !['para', 'com', 'que', 'não', 'uma', 'pelo', 'mais', 'estou', 'está', 'fazer', 'como', 'você', 'tenho', 'minha', 'meu', 'muito'].includes(w)) {
                                wordCounts[w] = (wordCounts[w] || 0) + 1;
                            }
                        });
                    });
                    cloudData = Object.entries(wordCounts)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 50);
                } else {
                    cloudData = uniqueValues.slice(0, 30);
                }

                if (cloudData.length > 0) {
                    wordClouds.push({
                        title: header,
                        data: cloudData,
                        isSentence,
                        maxCount: cloudData[0].value // For normalization
                    });
                }
            }
        });

        return { charts, wordClouds };
    }, [filteredData, dateColumn]);

    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Sem dados para analisar.</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground">
                        Total de Respostas: <span className="font-bold text-foreground">{filteredData.length}</span>
                        {filteredData.length !== data.length && <span className="text-xs ml-2">(Filtrado de {data.length})</span>}
                    </p>
                </div>

                {dateColumn && (
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                                                {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                                        )
                                    ) : (
                                        <span>Filtrar por data</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        {dateRange && (
                            <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                                Limpar
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {filteredData.length === 0 && (
                <div className="p-12 text-center border dashed rounded-lg">
                    <p className="text-muted-foreground">Nenhum dado encontrado para o período selecionado.</p>
                </div>
            )}

            {/* Categorical Charts (Pie) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysis.charts.map((chart, idx) => (
                    <Card key={idx} className="flex flex-col">
                        <CardHeader className="items-center pb-2">
                            <CardTitle className="text-base text-center font-medium capitalize">
                                {chart.title.replace(/_/g, ' ')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 pb-6">
                            <div className="h-[300px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chart.data}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {chart.data.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                                                            <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
                                                            <p className="text-gray-600">
                                                                {data.value} <span className="text-gray-400">({data.percent.toFixed(1)}%)</span>
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={120}
                                            iconType="circle"
                                            layout="horizontal"
                                            wrapperStyle={{
                                                fontSize: '11px',
                                                lineHeight: '14px',
                                                maxHeight: '120px',
                                                overflowY: 'auto',
                                                paddingTop: '10px'
                                            }}
                                            formatter={(value, entry: any) => {
                                                const { payload } = entry;
                                                const truncValue = value.length > 25 ? value.substring(0, 25) + '...' : value;
                                                return <span className="text-muted-foreground ml-1" title={value}>{truncValue} <strong>({payload.percent.toFixed(1)}%)</strong></span>;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[45%] left-0 right-0 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="text-2xl font-bold text-foreground">{chart.data[0].percent.toFixed(0)}%</span>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Maioria</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Word Clouds / Open Text Analysis */}
            {analysis.wordClouds.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlignLeft className="h-5 w-5" />
                        Análise de Textos e Perguntas Abertas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {analysis.wordClouds.map((cloud, idx) => (
                            <Card key={idx}>
                                <CardHeader>
                                    <CardTitle className="text-base font-medium capitalize">
                                        {cloud.title.replace(/_/g, ' ')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-2">
                                        {cloud.data.map((item: any, i: number) => {
                                            // Intensity Mapping based on frequency
                                            // alpha goes from 0.1 (min) to 1 (max)
                                            // We'll use a primary color base.

                                            const ratio = item.value / cloud.maxCount;
                                            const opacity = Math.max(0.2, ratio); // min 0.2 opacity
                                            const fontSize = Math.max(0.8, 0.8 + (ratio * 1.5)) + 'rem'; // scale size a bit too for emphasis

                                            return (
                                                <span
                                                    key={i}
                                                    className="inline-block rounded-md px-3 py-1.5 text-center transition-all hover:scale-105 select-none"
                                                    style={{
                                                        backgroundColor: `hsl(var(--primary) / ${opacity})`,
                                                        color: opacity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                                                        fontSize
                                                    }}
                                                    title={`${item.value} ocorrências`}
                                                >
                                                    {item.name} <span className="ml-1 opacity-70 text-[0.8em]">({item.value})</span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
