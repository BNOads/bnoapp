
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { FileText, AlignLeft } from 'lucide-react';

interface SheetAnalysisProps {
    data: any[];
    title: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#3b82f6', '#6366f1'];

export const SheetAnalysis = ({ data, title }: SheetAnalysisProps) => {

    const analysis = useMemo(() => {
        if (!data || data.length === 0) return { charts: [], wordClouds: [] };

        const headers = Object.keys(data[0]).filter(key =>
            !['id', 'created_at', 'updated_at', 'lancamento_id', 'nome', 'email', 'telefone', 'celular', 'phone', 'data', 'date'].includes(key.toLowerCase()) &&
            !key.startsWith('_')
        );

        const charts: any[] = [];
        const wordClouds: any[] = [];

        headers.forEach(header => {
            const values = data.map(row => String(row[header] || '').trim()).filter(v => v !== '');
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
                // Check if it's long text (avg > 10 chars) to treat as "Open Answer"
                // Or if it's just many short categories, still maybe word cloud is better than 50 pie slices.
                // We will take top 30 terms.

                // Simple stop word filter could go here but let's stick to raw values for now as they might be short sentences.
                // Actually, for word cloud, we usually split by words. 
                // But the screenshot shows "Word Cloud of sentences" or "Tags". 
                // "Como você espera ser ajudado" -> Sentences.
                // "Em qual curso..." -> One or two words.

                // Strategy: If values are long sentences, split words. If short, keep as tags.
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
                            if (w.length > 3 && !['para', 'com', 'que', 'não', 'uma', 'pelo', 'mais'].includes(w)) {
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

                wordClouds.push({
                    title: header,
                    data: cloudData,
                    isSentence
                });
            }
        });

        return { charts, wordClouds };
    }, [data]);

    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Sem dados para analisar.</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground">
                        Total de Respostas: <span className="font-bold text-foreground">{data.length}</span>
                    </p>
                </div>
            </div>

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
                                            height={80}
                                            iconType="circle"
                                            layout="horizontal"
                                            wrapperStyle={{ fontSize: '11px', lineHeight: '14px' }}
                                            formatter={(value, entry: any) => {
                                                const { payload } = entry;
                                                return <span className="text-muted-foreground ml-1">{value} <strong>({payload.percent.toFixed(1)}%)</strong></span>;
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
                                            // Simple visual weighting
                                            const fontSize = Math.max(0.75, Math.min(2, 0.75 + (item.value / data.length) * 3)) + 'rem';
                                            const opacity = Math.max(0.6, Math.min(1, 0.4 + (item.value / data.length) * 2));

                                            return (
                                                <span
                                                    key={i}
                                                    className="inline-block bg-muted/50 rounded-md px-2 py-1 text-center transition-all hover:bg-muted hover:scale-105"
                                                    style={{ fontSize, opacity }}
                                                    title={`${item.value} ocorrências`}
                                                >
                                                    {item.name}
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
