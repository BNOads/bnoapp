import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Send, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NovoAvisoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: any;
}

export const NovoAvisoModal: React.FC<NovoAvisoModalProps> = ({ open, onOpenChange, onSuccess, initialData }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [novoAviso, setNovoAviso] = useState({
        titulo: '',
        conteudo: '',
        tipo: 'info' as const,
        prioridade: 'normal' as const,
        destinatarios: ['all'],
        canais: {
            painel: true,
            slack: false,
            email: false
        },
        dataInicio: '',
        dataInicio: '',
        dataFim: ''
    });

    React.useEffect(() => {
        if (open) {
            if (initialData) {
                setNovoAviso({
                    titulo: `[Reenvio] ${initialData.titulo}`,
                    conteudo: initialData.conteudo,
                    tipo: initialData.tipo,
                    prioridade: initialData.prioridade,
                    destinatarios: initialData.destinatarios || ['all'],
                    canais: initialData.canais || { painel: true, slack: false, email: false },
                    dataInicio: '',
                    dataFim: ''
                });
            } else {
                setNovoAviso({
                    titulo: '',
                    conteudo: '',
                    tipo: 'info',
                    prioridade: 'normal',
                    destinatarios: ['all'],
                    canais: {
                        painel: true,
                        slack: false,
                        email: false
                    },
                    dataInicio: '',
                    dataFim: ''
                });
            }
        }
    }, [open, initialData]);

    const createNotification = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.functions.invoke('slack-notifications', {
                body: {
                    action: 'create_notification',
                    ...novoAviso
                }
            });

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: "Aviso criado com sucesso"
            });

            onOpenChange(false);
            setNovoAviso({
                titulo: '',
                conteudo: '',
                tipo: 'info',
                prioridade: 'normal',
                destinatarios: ['all'],
                canais: {
                    painel: true,
                    slack: false,
                    email: false
                },
                dataInicio: '',
                dataFim: ''
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Erro ao criar aviso:', error);
            toast({
                title: "Erro",
                description: "Falha ao criar aviso",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Criar Novo Aviso</DialogTitle>
                    <DialogDescription>
                        Crie um novo aviso para a equipe
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="titulo">Título</Label>
                        <Input
                            id="titulo"
                            value={novoAviso.titulo}
                            onChange={(e) => setNovoAviso({ ...novoAviso, titulo: e.target.value })}
                            placeholder="Título do aviso"
                            disabled={loading}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="conteudo">Conteúdo</Label>
                        <Textarea
                            id="conteudo"
                            value={novoAviso.conteudo}
                            onChange={(e) => setNovoAviso({ ...novoAviso, conteudo: e.target.value })}
                            placeholder="Conteúdo detalhado do aviso"
                            rows={4}
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="tipo">Tipo</Label>
                            <Select disabled={loading} value={novoAviso.tipo} onValueChange={(value: any) => setNovoAviso({ ...novoAviso, tipo: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-blue-500" />
                                            <span>Informação</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="alerta">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            <span>Aviso</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="erro">
                                        <div className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-red-500" />
                                            <span>Erro/Problema</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="sucesso">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>Sucesso</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="prioridade">Prioridade</Label>
                            <Select disabled={loading} value={novoAviso.prioridade} onValueChange={(value: any) => setNovoAviso({ ...novoAviso, prioridade: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baixa">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1" />
                                            <span>Baixa</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="normal">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1" />
                                            <span>Normal</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="alta">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1" />
                                            <span>Alta</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="critica">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-700 mr-1" />
                                            <span>Crítica</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Canais de Notificação</Label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    disabled={loading}
                                    checked={novoAviso.canais.painel}
                                    onCheckedChange={(checked) => setNovoAviso({
                                        ...novoAviso,
                                        canais: { ...novoAviso.canais, painel: checked }
                                    })}
                                />
                                <Label>Painel</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    disabled={loading}
                                    checked={novoAviso.canais.slack}
                                    onCheckedChange={(checked) => setNovoAviso({
                                        ...novoAviso,
                                        canais: { ...novoAviso.canais, slack: checked }
                                    })}
                                />
                                <Label>Slack</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    disabled={loading}
                                    checked={novoAviso.canais.email}
                                    onCheckedChange={(checked) => setNovoAviso({
                                        ...novoAviso,
                                        canais: { ...novoAviso.canais, email: checked }
                                    })}
                                />
                                <Label>Email</Label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dataInicio">Data de Início (opcional)</Label>
                            <Input
                                id="dataInicio"
                                type="datetime-local"
                                value={novoAviso.dataInicio}
                                onChange={(e) => setNovoAviso({ ...novoAviso, dataInicio: e.target.value })}
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="dataFim">Data de Fim (opcional)</Label>
                            <Input
                                id="dataFim"
                                type="datetime-local"
                                value={novoAviso.dataFim}
                                onChange={(e) => setNovoAviso({ ...novoAviso, dataFim: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={createNotification} disabled={loading || !novoAviso.titulo || !novoAviso.conteudo}>
                        <Send className="h-4 w-4 mr-2" />
                        {loading ? 'Criando...' : 'Criar Aviso'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
