import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    History,
    User,
    ExternalLink,
    Trash2,
    Copy,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    card: any;
    columns: any[];
}

export const EditCardModal = ({ isOpen, onClose, onSuccess, card, columns }: EditCardModalProps) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
    const [activities, setActivities] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (card) {
            setFormData({
                title: card.title || '',
                column_id: card.column_id || '',
                instagram: card.instagram || '',
                segment: card.segment || '',
                origin: card.origin || '',
                company: card.company || '',
                phone: card.phone || '',
                email: card.email || '',
                description: card.description || '',
                amount: card.amount || '',
                lost_reason: card.lost_reason || '',
                disqualify_reason: card.disqualify_reason || '',
            });
            fetchActivity();
        }
    }, [card]);

    const fetchActivity = async () => {
        if (!card?.id) return;
        const { data } = await supabase
            .from('crm_activity')
            .select('*, user:user_id(nome)')
            .eq('card_id', card.id)
            .order('created_at', { ascending: false });
        setActivities(data || []);
    };

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('crm_cards')
                .update({
                    ...formData,
                    amount: formData.amount ? parseFloat(formData.amount) : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', card.id);

            if (error) throw error;

            toast.success("Lead atualizado!");
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error updating card:', err);
            toast.error("Erro ao atualizar lead");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja excluir este lead?")) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('crm_cards').delete().eq('id', card.id);
            if (error) throw error;
            toast.success("Lead excluído!");
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error deleting card:', err);
            toast.error("Erro ao excluir lead");
        } finally {
            setLoading(false);
        }
    };

    const navigateToClient = () => {
        if (card.converted_client_id) {
            // Assume a route exists or just show toast
            toast.info(`ID do cliente: ${card.converted_client_id}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle className="text-xl">Editar Lead: {card?.title}</DialogTitle>
                    <div className="flex space-x-2">
                        {card?.converted_client_id && (
                            <Button variant="outline" size="sm" className="bg-green-50 text-green-700 border-green-200" onClick={navigateToClient}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Ver Cliente
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex border-b mb-4">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Detalhes
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        Histórico
                    </button>
                </div>

                {activeTab === 'details' ? (
                    <div className="grid grid-cols-2 gap-4 pb-6">
                        <div className="space-y-2 col-span-2">
                            <Label>Nome / Oportunidade</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Coluna</Label>
                            <Select value={formData.column_id} onValueChange={val => setFormData({ ...formData, column_id: val })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Origem</Label>
                            <Input value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Instagram</Label>
                            <Input value={formData.instagram} onChange={e => setFormData({ ...formData, instagram: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>WhatsApp / Tel</Label>
                            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Segmento</Label>
                            <Input value={formData.segment} onChange={e => setFormData({ ...formData, segment: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Valor Potencial (R$)</Label>
                            <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label>Descrição / Notas</Label>
                            <Textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>

                        {(formData.lost_reason || formData.disqualify_reason) && (
                            <div className="space-y-2 col-span-2 p-3 bg-muted rounded-md border border-destructive/20">
                                <Label className="text-destructive font-bold">
                                    {formData.lost_reason ? "Motivo da Perda" : "Motivo da Desqualificação"}
                                </Label>
                                <p className="text-sm">{formData.lost_reason || formData.disqualify_reason}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 pb-6">
                        {activities.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Nenhuma atividade registrada.</p>
                        ) : (
                            activities.map(act => (
                                <div key={act.id} className="flex space-x-3 border-l-2 border-primary/20 pl-4 py-1">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold">
                                                {act.activity_type === 'created' ? 'Criado' : act.activity_type === 'moved' ? 'Movimentado' : 'Editado'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {format(new Date(act.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                                            <User className="h-2.5 w-2.5 mr-1" />
                                            {act.user?.nome || 'Sistema'}
                                        </p>
                                        {act.activity_data?.reason && (
                                            <p className="text-xs mt-2 bg-muted p-2 rounded italic">"{act.activity_data.reason}"</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Fechar</Button>
                    <Button onClick={handleUpdate} disabled={loading}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
