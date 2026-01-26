import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface NewLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newCard?: any) => void;
    columns: any[];
    initialColumnId?: string | null;
}

export const NewLeadModal = ({ isOpen, onClose, onSuccess, columns, initialColumnId }: NewLeadModalProps) => {
    const { userData: user } = useCurrentUser();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        column_id: columns[0]?.id || '',
        instagram: '',
        segment: '',
        origin: 'Frio',
        company: '',
        phone: '',
        email: '',
        description: '',
        amount: '',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, column_id: initialColumnId || columns[0]?.id || '' }));
        }
    }, [isOpen, columns, initialColumnId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: newCard, error } = await supabase.from('crm_cards').insert({
                ...formData,
                amount: formData.amount ? parseFloat(formData.amount) : null,
                owner_id: user?.user_id || user?.id,
                created_by: user?.user_id || user?.id,
                next_action_at: new Date(Date.now() + (columns.find(c => c.id === formData.column_id)?.column_sla_days || 0) * 24 * 60 * 60 * 1000).toISOString()
            }).select().single();

            if (error) throw error;

            // Log activity
            await supabase.from('crm_activity').insert({
                card_id: newCard.id,
                user_id: user?.user_id || user?.id || null,
                activity_type: 'created',
                activity_data: { info: 'Lead criado manualmente' }
            });

            toast.success("Lead criado com sucesso!");
            onSuccess(newCard);
            onClose();
            resetForm();
        } catch (err: any) {
            console.error('Error creating lead:', err);
            toast.error(err.message || "Erro ao criar lead");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            column_id: columns[0]?.id || '',
            instagram: '',
            segment: '',
            origin: 'Frio',
            company: '',
            phone: '',
            email: '',
            description: '',
            amount: '',
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Lead</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="title">Nome do Lead / Oportunidade *</Label>
                            <Input
                                id="title"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="column">Coluna Inicial</Label>
                            <Select
                                value={formData.column_id}
                                onValueChange={val => setFormData({ ...formData, column_id: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="origin">Origem</Label>
                            <Select
                                value={formData.origin}
                                onValueChange={val => setFormData({ ...formData, origin: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Frio">Frio</SelectItem>
                                    <SelectItem value="Indicação">Indicação</SelectItem>
                                    <SelectItem value="Pago">Tráfego Pago</SelectItem>
                                    <SelectItem value="Orgânico">Orgânico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="instagram">Instagram</Label>
                            <Input
                                id="instagram"
                                placeholder="@perfil"
                                value={formData.instagram}
                                onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone / WhatsApp</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="segment">Segmento de Negócio</Label>
                            <Input
                                id="segment"
                                value={formData.segment}
                                onChange={e => setFormData({ ...formData, segment: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor Potencial (R$)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="description">Descrição / Notas</Label>
                            <Textarea
                                id="description"
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Criando..." : "Criar Lead"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
