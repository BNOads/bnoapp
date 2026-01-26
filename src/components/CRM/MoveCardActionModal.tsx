import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MoveCardActionModalProps {
    card: any;
    targetColumn: any;
    onConfirm: (data: any) => void;
    onCancel: () => void;
}

export const MoveCardActionModal = ({ card, targetColumn, onConfirm, onCancel }: MoveCardActionModalProps) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            let updateData: any = {
                column_id: targetColumn.id,
                updated_at: new Date().toISOString()
            };

            // Convert to client
            const { data: newClient, error: clientError } = await supabase.from('clientes').insert({
                nome: card.title,
                nicho: card.segment,
                status_cliente: 'ativo',
                observacoes: `Convertido do CRM. Origem: ${card.origin}. Descrição: ${card.description}`,
                created_by: card.owner_id
            }).select().single();

            if (clientError) throw clientError;
            updateData.converted_client_id = newClient.id;

            const { error } = await supabase.from('crm_cards').update(updateData).eq('id', card.id);
            if (error) throw error;

            // Activity Log
            await supabase.from('crm_activity').insert({
                card_id: card.id,
                user_id: (await supabase.auth.getUser()).data.user?.id || null,
                activity_type: 'moved',
                activity_data: {
                    from_column: card.column_id,
                    to_column: targetColumn.id,
                    converted: true
                }
            });

            toast.success("Cliente criado e Lead marcado como GANHO!");
            onConfirm(updateData);
        } catch (err) {
            console.error('Error moving card:', err);
            toast.error("Erro ao processar alteração");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Parabéns pelo Ganho! 🎉</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Ao marcar como <strong>GANHO</strong>, um novo registro de cliente será criado automaticamente na base de Clientes com os dados deste lead.
                    </p>
                    <p className="text-sm font-medium">Deseja prosseguir?</p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={loading}>
                        {loading ? "Processando..." : "Confirmar e Criar Cliente"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
