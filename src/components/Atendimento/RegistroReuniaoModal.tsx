import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCreateMeeting, useUpdateMeeting, useDeleteMeeting } from "@/hooks/useMeetings";
import { VALIDACAO_LABELS } from "@/types/laboratorio-testes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIPO_LABELS: Record<string, string> = {
    alinhamento: "Alinhamento",
    estrategica: "Estratégica",
    crise: "Crise",
    resultado: "Resultado",
    onboarding: "Onboarding",
};

const RISCO_LABELS: Record<string, string> = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
};

interface RegistroReuniaoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    meeting?: any | null;
    defaultDate?: string;
}

function useClientes() {
    return useQuery({
        queryKey: ["clientes-ativos-select"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, situacao_cliente")
                .eq("ativo", true)
                .order("nome", { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

function useColaboradores() {
    return useQuery({
        queryKey: ["colaboradores-select"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("colaboradores")
                .select("id, nome")
                .eq("ativo", true)
                .order("nome", { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function RegistroReuniaoModal({ open, onOpenChange, meeting, defaultDate }: RegistroReuniaoModalProps) {
    const { toast } = useToast();
    const { data: clientes = [] } = useClientes();
    const { data: colaboradores = [] } = useColaboradores();
    const createMeeting = useCreateMeeting();
    const updateMeeting = useUpdateMeeting();
    const deleteMeeting = useDeleteMeeting();

    const [form, setForm] = useState({
        cliente_id: "",
        gestor_id: "",
        data: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
        hora_inicio: "",
        hora_fim: "",
        tipo: "" as any,
        classificacao_reuniao: "" as any,
        nota: "" as any,
        nivel_risco: "" as any,
        pontos_discutidos: "",
        problemas_levantados: "",
        decisoes_tomadas: "",
        proximos_passos: "",
    });

    const [showAlertaPrompt, setShowAlertaPrompt] = useState(false);
    const [savedClienteId, setSavedClienteId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (meeting) {
            setForm({
                cliente_id: meeting.cliente_id ?? "",
                gestor_id: meeting.gestor_id ?? "",
                data: meeting.data ?? format(new Date(), "yyyy-MM-dd"),
                hora_inicio: meeting.hora_inicio ?? "",
                hora_fim: meeting.hora_fim ?? "",
                tipo: meeting.tipo ?? "",
                classificacao_reuniao: meeting.classificacao_reuniao ?? "",
                nota: meeting.nota ?? "",
                nivel_risco: meeting.nivel_risco ?? "",
                pontos_discutidos: meeting.pontos_discutidos ?? "",
                problemas_levantados: meeting.problemas_levantados ?? "",
                decisoes_tomadas: meeting.decisoes_tomadas ?? "",
                proximos_passos: meeting.proximos_passos ?? "",
            });
        } else {
            setForm(f => ({ ...f, data: defaultDate ?? format(new Date(), "yyyy-MM-dd") }));
        }
    }, [meeting, defaultDate, open]);

    const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

    const handleSave = async () => {
        if (!form.cliente_id || !form.data) {
            toast({ title: "Preencha os campos obrigatórios.", variant: "destructive" });
            return;
        }

        const payload: any = {
            ...form,
            nota: form.nota ? Number(form.nota) : null,
            gestor_id: form.gestor_id || null,
            tipo: form.tipo || null,
            classificacao_reuniao: form.classificacao_reuniao || null,
            nivel_risco: form.nivel_risco || null,
            hora_fim: form.hora_fim || null,
            hora_inicio: form.hora_inicio || null,
        };

        if (meeting?.id) {
            await updateMeeting.mutateAsync({ id: meeting.id, ...payload });
        } else {
            await createMeeting.mutateAsync(payload);
        }

        // Prompt to update client to ALERTA if classification is negative
        if (form.classificacao_reuniao === "deu_ruim" || form.nivel_risco === "alto") {
            setSavedClienteId(form.cliente_id);
            setShowAlertaPrompt(true);
        } else {
            onOpenChange(false);
        }
    };

    const handleUpdateClienteAlerta = async () => {
        if (!savedClienteId) return;
        await supabase
            .from("clientes")
            .update({ situacao_cliente: "ALERTA" })
            .eq("id", savedClienteId);
        toast({ title: "Situação do cliente atualizada para ALERTA." });
        setShowAlertaPrompt(false);
        onOpenChange(false);
    };

    const handleDeleteConfirm = async () => {
        if (!meeting?.id) return;
        await deleteMeeting.mutateAsync(meeting.id);
        setConfirmDelete(false);
        onOpenChange(false);
    };

    const isSaving = createMeeting.isPending || updateMeeting.isPending;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{meeting ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Cliente */}
                        <div className="col-span-2 space-y-1.5">
                            <Label>Cliente *</Label>
                            <Select value={form.cliente_id} onValueChange={v => set("cliente_id", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clientes.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Gestor */}
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                            <Label>CS / Gestor</Label>
                            <Select value={form.gestor_id} onValueChange={v => set("gestor_id", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o CS" />
                                </SelectTrigger>
                                <SelectContent>
                                    {colaboradores.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tipo */}
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                            <Label>Tipo de Reunião</Label>
                            <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Data */}
                        <div className="space-y-1.5">
                            <Label>Data *</Label>
                            <Input type="date" value={form.data} onChange={e => set("data", e.target.value)} />
                        </div>

                        {/* Horários */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label>Início</Label>
                                <Input type="time" value={form.hora_inicio} onChange={e => set("hora_inicio", e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Fim</Label>
                                <Input type="time" value={form.hora_fim} onChange={e => set("hora_fim", e.target.value)} />
                            </div>
                        </div>

                        {/* Classificação */}
                        <div className="space-y-1.5">
                            <Label>Classificação</Label>
                            <Select value={form.classificacao_reuniao} onValueChange={v => set("classificacao_reuniao", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Como foi?" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(VALIDACAO_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Nota */}
                        <div className="space-y-1.5">
                            <Label>Nota (1–5)</Label>
                            <Select value={String(form.nota)} onValueChange={v => set("nota", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Nota" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Nível de Risco */}
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                            <Label>Nível de Risco</Label>
                            <Select value={form.nivel_risco} onValueChange={v => set("nivel_risco", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o risco" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(RISCO_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pontos Discutidos */}
                        <div className="col-span-2 space-y-1.5">
                            <Label>Pontos Discutidos</Label>
                            <Textarea
                                placeholder="O que foi discutido na reunião?"
                                value={form.pontos_discutidos}
                                onChange={e => set("pontos_discutidos", e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Problemas */}
                        <div className="col-span-2 space-y-1.5">
                            <Label>Problemas Levantados</Label>
                            <Textarea
                                placeholder="Quais problemas foram identificados?"
                                value={form.problemas_levantados}
                                onChange={e => set("problemas_levantados", e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Decisões */}
                        <div className="col-span-2 space-y-1.5">
                            <Label>Decisões Tomadas</Label>
                            <Textarea
                                placeholder="Quais decisões foram feitas?"
                                value={form.decisoes_tomadas}
                                onChange={e => set("decisoes_tomadas", e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Próximos Passos */}
                        <div className="col-span-2 space-y-1.5">
                            <Label>Próximos Passos</Label>
                            <Textarea
                                placeholder="Quais são os próximos passos?"
                                value={form.proximos_passos}
                                onChange={e => set("proximos_passos", e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                        {meeting && (
                            <Button
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                                onClick={() => setConfirmDelete(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alert dialog: update client status */}
            <AlertDialog open={showAlertaPrompt} onOpenChange={setShowAlertaPrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Atualizar Situação do Cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            A reunião foi classificada negativamente. Deseja atualizar a situação do cliente para <strong>ALERTA</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setShowAlertaPrompt(false); onOpenChange(false); }}>
                            Não, obrigado
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdateClienteAlerta} className="bg-destructive hover:bg-destructive/90">
                            Sim, marcar como ALERTA
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation */}
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A reunião será removida permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
