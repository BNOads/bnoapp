import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CriativoSelector } from '../Lancamentos/CriativoSelector';
import { Loader2 } from 'lucide-react';

interface VincularOrcamentoCriativosModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orcamentoId: string;
    clienteId: string;
    onSuccess: () => void;
}

export function VincularOrcamentoCriativosModal({
    open,
    onOpenChange,
    orcamentoId,
    clienteId,
    onSuccess
}: VincularOrcamentoCriativosModalProps) {
    const [selectedCriativos, setSelectedCriativos] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && orcamentoId) {
            fetchCriativosVinculados();
        }
    }, [open, orcamentoId]);

    const fetchCriativosVinculados = async () => {
        try {
            setFetching(true);
            const { data, error } = await supabase
                .from('orcamento_criativos')
                .select('folder_name')
                .eq('orcamento_id', orcamentoId);

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
            // 1. Remove all existing links for this budget/funnel
            const { error: deleteError } = await supabase
                .from('orcamento_criativos')
                .delete()
                .eq('orcamento_id', orcamentoId);

            if (deleteError) throw deleteError;

            // 2. Insert new links
            if (selectedCriativos.length > 0) {
                const orcamentoLinks = selectedCriativos.map(folderName => ({
                    orcamento_id: orcamentoId,
                    folder_name: folderName
                }));

                const { error: insertError } = await supabase
                    .from('orcamento_criativos')
                    .insert(orcamentoLinks);

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
                    <DialogTitle>Gerenciar Criativos do Funil</DialogTitle>
                    <DialogDescription>
                        Selecione as pastas de criativos que serão atreladas a este funil.
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
