import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCreateTicket } from "@/hooks/useTicketMutations";
import { supabase } from "@/integrations/supabase/client";

interface CreateTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultClienteId?: string;
    defaultOrigem?: string;
}

export function CreateTicketModal({ isOpen, onClose, defaultClienteId, defaultOrigem }: CreateTicketModalProps) {
    const [clienteId, setClienteId] = useState(defaultClienteId || "");
    const [categoria, setCategoria] = useState("");
    const [prioridade, setPrioridade] = useState("media");
    const [responsavelId, setResponsavelId] = useState("");
    const [descricao, setDescricao] = useState("");
    const [origem, setOrigem] = useState(defaultOrigem || "interno");
    const [clientes, setClientes] = useState<{ id: string; name: string }[]>([]);
    const [colaboradores, setColaboradores] = useState<{ id: string; name: string; avatar_url?: string | null }[]>([]);

    const createTicket = useCreateTicket();

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                const { data: clientesData } = await supabase
                    .from("clientes")
                    .select("id, nome")
                    .eq("is_active", true)
                    .order("nome");

                if (clientesData) {
                    setClientes(clientesData.map(c => ({ id: c.id, name: c.nome })));
                }

                const { data: colabData } = await supabase
                    .from("colaboradores")
                    .select("user_id, nome, avatar_url")
                    .eq("ativo", true)
                    .order("nome");

                if (colabData) {
                    setColaboradores(colabData.filter(c => c.user_id).map(c => ({
                        id: c.user_id!,
                        name: c.nome,
                        avatar_url: c.avatar_url,
                    })));
                }
            };

            fetchData();

            // Reset form
            if (!defaultClienteId) setClienteId("");
            setCategoria("");
            setPrioridade("media");
            setResponsavelId("");
            setDescricao("");
            setOrigem(defaultOrigem || "interno");
        }
    }, [isOpen, defaultClienteId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clienteId || !categoria || !descricao) return;

        await createTicket.mutateAsync({
            cliente_id: clienteId,
            categoria,
            prioridade,
            responsavel_id: responsavelId || null,
            descricao,
            origem,
            status: "aberto",
        });

        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Abrir Novo Ticket</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="cliente">Cliente *</Label>
                        <SearchableSelect
                            options={clientes}
                            value={clienteId}
                            onValueChange={setClienteId}
                            placeholder="Selecione o cliente..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="categoria">Categoria *</Label>
                            <Select value={categoria} onValueChange={setCategoria} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="duvida">Dúvida / Suporte</SelectItem>
                                    <SelectItem value="financeiro">Financeiro</SelectItem>
                                    <SelectItem value="tecnico">Problema Técnico</SelectItem>
                                    <SelectItem value="estrategico">Estratégico</SelectItem>
                                    <SelectItem value="comercial">Comercial</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prioridade">Prioridade</Label>
                            <Select value={prioridade} onValueChange={setPrioridade}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baixa">Baixa</SelectItem>
                                    <SelectItem value="media">Média</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                    <SelectItem value="critica">Crítica (Copa do Mundo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="responsavel">Responsável (Atribuir a)</Label>
                        <SearchableSelect
                            options={colaboradores}
                            value={responsavelId}
                            onValueChange={setResponsavelId}
                            placeholder="Deixe em branco para atribuir depois"
                            showAvatar
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="descricao">Nome da Demanda *</Label>
                        <Input
                            id="descricao"
                            placeholder="Descreva brevemente a demanda..."
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="origem">Origem</Label>
                        <Select value={origem} onValueChange={setOrigem}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="interno">Interno (Time)</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp Client</SelectItem>
                                <SelectItem value="email">E-mail</SelectItem>
                                <SelectItem value="reuniao">Reunião / Meeting</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={createTicket.isPending}>
                            {createTicket.isPending ? "Criando..." : "Criar Ticket"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
