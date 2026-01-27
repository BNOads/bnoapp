import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/Auth/AuthContext";

interface MoveCardActionModalProps {
    card: any;
    targetColumn: any;
    onConfirm: (data: any) => void;
    onCancel: () => void;
}

export const MoveCardActionModal = ({ card, targetColumn, onConfirm, onCancel }: MoveCardActionModalProps) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [categoria, setCategoria] = useState<'negocio_local' | 'infoproduto'>('negocio_local');

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
                categoria: categoria,
                status_cliente: 'ativo',
                is_active: true,
                observacoes: `Convertido do CRM. Origem: ${card.origin}. Descrição: ${card.description}`,
                created_by: user?.id,
                primary_gestor_user_id: card.owner_id
            }).select().single();

            if (clientError) throw clientError;
            updateData.converted_client_id = newClient.id;

            // Notify team
            await supabase.from('avisos').insert({
                titulo: "Novo Cliente! 🚀",
                conteudo: `Comemore time! 🚀 Novo cliente convertido do CRM: ${card.title}`,
                tipo: 'success',
                prioridade: 'normal',
                created_by: user?.id
            });

            const { error } = await supabase.from('crm_cards').update(updateData).eq('id', card.id);
            if (error) throw error;

            // Activity Log
            await supabase.from('crm_activity').insert({
                card_id: card.id,
                user_id: user?.id || null,
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

                    <div className="space-y-2">
                        <Label htmlFor="categoria">Selecione a Categoria do Cliente</Label>
                        <Select
                            value={categoria}
                            onValueChange={(val: any) => setCategoria(val)}
                        >
                            <SelectTrigger id="categoria">
                                <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="negocio_local">Negócio Local</SelectItem>
                                <SelectItem value="infoproduto">Infoproduto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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
