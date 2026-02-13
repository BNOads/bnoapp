import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface Benchmark {
    id: string;
    chave: string;
    valor: number;
    label: string;
    unidade: string;
    descricao: string;
}

interface AdminBenchmarksModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: () => void;
}

export default function AdminBenchmarksModal({
    open,
    onOpenChange,
    onSave,
}: AdminBenchmarksModalProps) {
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            loadBenchmarks();
        }
    }, [open]);

    const loadBenchmarks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('benchmarks_funil')
                .select('*')
                .order('label');

            if (error) throw error;
            setBenchmarks(data || []);
        } catch (error) {
            console.error('Erro ao carregar benchmarks:', error);
            toast.error('Erro ao carregar metas de mercado');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (id: string, value: string) => {
        setBenchmarks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, valor: parseFloat(value) || 0 } : b))
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const benchmark of benchmarks) {
                const { error } = await supabase
                    .from('benchmarks_funil')
                    .update({
                        valor: benchmark.valor,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', benchmark.id);

                if (error) throw error;
            }

            toast.success('Metas de mercado atualizadas para todos os usuários!');
            onSave?.();
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar benchmarks:', error);
            toast.error('Erro ao salvar algumas metas');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Gerenciar Metas de Mercado (Benchmarks)</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Estas metas são globais e afetam as cores de desempenho (verde/amarelo/vermelho)
                            em todas as projeções da plataforma.
                        </p>
                        {benchmarks.map((benchmark) => (
                            <div key={benchmark.id} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={benchmark.id} className="text-right col-span-1">
                                    {benchmark.label} ({benchmark.unidade})
                                </Label>
                                <Input
                                    id={benchmark.id}
                                    type="number"
                                    value={benchmark.valor}
                                    onChange={(e) => handleValueChange(benchmark.id, e.target.value)}
                                    className="col-span-3"
                                    step={benchmark.unidade === '%' ? '0.1' : '1'}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Salvar para Todos
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
