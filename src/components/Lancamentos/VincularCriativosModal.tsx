import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CriativoSelector } from './CriativoSelector';
import { Loader2 } from 'lucide-react';

interface VincularCriativosModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lancamentoId: string;
    clienteId: string;
    onSuccess: () => void;
}

export function VincularCriativosModal({
    open,
    onOpenChange,
    lancamentoId,
    clienteId,
    onSuccess
}: VincularCriativosModalProps) {
    const [selectedCriativos, setSelectedCriativos] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            fetchCriativosVinculados();
        }
    }, [open, lancamentoId]);

    const fetchCriativosVinculados = async () => {
        try {
            setFetching(true);
            const { data, error } = await supabase
                .from('lancamento_criativos')
                .select('folder_name')
                .eq('lancamento_id', lancamentoId);

            if (error) throw error;

            const folders = data
                .map(item => item.folder_name)
                .filter((name): name is string => name !== null);

            setSelectedCriativos(folders);
        } catch (error) {
            console.error('Erro ao buscar criativos vinculados:', error);
            toast({
                title: "Erro ao carregar vínculos",
                description: "Não foi possível carregar as pastas já vinculadas.",
                variant: "destructive",
            });
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // 1. Remove all existing links for this launch
            const { error: deleteError } = await supabase
                .from('lancamento_criativos')
                .delete()
                .eq('lancamento_id', lancamentoId);

            if (deleteError) throw deleteError;

            // 2. Insert new links
            if (selectedCriativos.length > 0) {
                const criativosLinks = selectedCriativos.map(folderName => ({
                    lancamento_id: lancamentoId,
                    folder_name: folderName
                }));

                const { error: insertError } = await supabase
                    .from('lancamento_criativos')
                    .insert(criativosLinks);

                if (insertError) throw insertError;
            }

            toast({
                title: "Sucesso",
                description: "Vínculos de criativos atualizados com sucesso.",
            });

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Erro ao salvar vínculos:', error);
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gerenciar Criativos</DialogTitle>
                    <DialogDescription>
                        Selecione as pastas de criativos que serão utilizadas neste lançamento.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {fetching ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <CriativoSelector
                            clienteId={clienteId}
                            selectedIds={selectedCriativos}
                            onSelectionChange={setSelectedCriativos}
                            className="max-h-[400px]"
                        />
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading || fetching}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar Alterações'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
