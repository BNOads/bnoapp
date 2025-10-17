import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Sparkles } from 'lucide-react';

interface GeradorPromessasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Cliente {
  id: string;
  nome: string;
}

export default function GeradorPromessasModal({
  open,
  onOpenChange,
}: GeradorPromessasModalProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    nomeProduto: '',
    avatar: '',
    goal: '',
    interval: '',
    container: 'mentoria',
    tom: 'profissional',
  });

  useEffect(() => {
    if (open) {
      loadClientes();
    }
  }, [open]);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes.',
        variant: 'destructive',
      });
    }
  };

  const handleGerarPromessa = async () => {
    if (!formData.clienteId) {
      toast({
        title: 'Cliente obrigatório',
        description: 'Por favor, selecione um cliente.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.nomeProduto || !formData.goal) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome do produto e o resultado desejado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResultado('');

    try {
      const clienteSelecionado = clientes.find((c) => c.id === formData.clienteId);

      const { data, error } = await supabase.functions.invoke('gerar-promessas', {
        body: {
          cliente: clienteSelecionado,
          nomeProduto: formData.nomeProduto,
          avatar: formData.avatar,
          goal: formData.goal,
          interval: formData.interval,
          container: formData.container,
          tom: formData.tom,
        },
      });

      if (error) throw error;

      setResultado(data.resultado || '');
    } catch (error: any) {
      console.error('Erro ao gerar promessa:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível gerar as promessas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = () => {
    if (resultado) {
      navigator.clipboard.writeText(resultado);
      toast({
        title: 'Copiado!',
        description: 'Promessas copiadas para a área de transferência.',
      });
    }
  };

  const handleReset = () => {
    setFormData({
      clienteId: '',
      nomeProduto: '',
      avatar: '',
      goal: '',
      interval: '',
      container: 'mentoria',
      tom: 'profissional',
    });
    setResultado('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerador de Promessas - Sistema MAGIC
          </DialogTitle>
          <DialogDescription>
            Use a IA para gerar nomes e promessas impactantes baseadas no método MAGIC de Alex Hormozi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente *</Label>
            <Select
              value={formData.clienteId}
              onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeProduto">Nome do produto/lançamento *</Label>
            <Input
              id="nomeProduto"
              placeholder="Ex: Método Completo de..."
              value={formData.nomeProduto}
              onChange={(e) => setFormData({ ...formData, nomeProduto: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Público-alvo (Avatar)</Label>
            <Input
              id="avatar"
              placeholder="Ex: Empreendedores iniciantes"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Resultado desejado (Goal) *</Label>
            <Input
              id="goal"
              placeholder="Ex: Faturar 50k por mês"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval">Prazo/tempo de entrega</Label>
              <Input
                id="interval"
                placeholder="Ex: 30 dias, 8 semanas"
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="container">Formato do produto</Label>
              <Select
                value={formData.container}
                onValueChange={(value) => setFormData({ ...formData, container: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentoria">Mentoria</SelectItem>
                  <SelectItem value="desafio">Desafio</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                  <SelectItem value="planilha">Planilha</SelectItem>
                  <SelectItem value="curso">Curso</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tom">Tom de comunicação</Label>
            <Select
              value={formData.tom}
              onValueChange={(value) => setFormData({ ...formData, tom: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="inspirador">Inspirador</SelectItem>
                <SelectItem value="agressivo">Agressivo</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="criativo">Criativo</SelectItem>
                <SelectItem value="descontraido">Descontraído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleGerarPromessa}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Promessas
                </>
              )}
            </Button>
            {resultado && (
              <Button onClick={handleReset} variant="outline">
                Nova Geração
              </Button>
            )}
          </div>

          {resultado && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Resultado:</Label>
                <Button onClick={handleCopiar} variant="outline" size="sm">
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
              </div>
              <Textarea
                value={resultado}
                readOnly
                className="min-h-[400px] font-mono text-sm"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
