import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    column: any;
}

export const EditColumnModal = ({ isOpen, onClose, onSuccess, column }: EditColumnModalProps) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#94a3b8');
    const [sla, setSla] = useState(0);

    useEffect(() => {
        if (column) {
            setName(column.name || '');
            setColor(column.color || '#94a3b8');
            setSla(column.column_sla_days || 0);
        }
    }, [column]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (column?.id) {
                // Update
                const { error } = await supabase.from('crm_columns').update({
                    name,
                    color,
                    column_sla_days: sla
                }).eq('id', column.id);
                if (error) throw error;
                toast.success("Coluna atualizada!");
            } else {
                // Create
                const { data: lastCol } = await supabase.from('crm_columns').select('order').order('order', { ascending: false }).limit(1).single();
                const nextOrder = (lastCol?.order ?? -1) + 1;

                const { error } = await supabase.from('crm_columns').insert({
                    name,
                    color,
                    column_sla_days: sla,
                    order: nextOrder
                });
                if (error) throw error;
                toast.success("Coluna criada!");
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error saving column:', err);
            toast.error("Erro ao salvar coluna");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!column?.id) return;
        if (!confirm("Tem certeza que deseja excluir esta coluna? Todos os cards nela serão removidos.")) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('crm_columns').delete().eq('id', column.id);
            if (error) throw error;
            toast.success("Coluna excluída!");
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error deleting column:', err);
            toast.error("Erro ao excluir coluna");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{column?.id ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="col-name">Nome da Coluna</Label>
                        <Input
                            id="col-name"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="col-color">Cor da Coluna</Label>
                        <div className="flex gap-2">
                            <Input
                                id="col-color"
                                type="color"
                                className="w-12 p-1"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                            />
                            <Input
                                type="text"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="col-sla">SLA Sugerido (Dias, ex: D+2)</Label>
                        <Input
                            id="col-sla"
                            type="number"
                            value={sla}
                            onChange={e => setSla(parseInt(e.target.value) || 0)}
                        />
                    </div>

                    <DialogFooter className="flex justify-between items-center sm:justify-between">
                        {column?.id && (
                            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                                Excluir
                            </Button>
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
