import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import type { ValidacaoTesteLab } from '@/types/laboratorio-testes';
import { VALIDACAO_LABELS, VALIDACAO_COLORS } from '@/types/laboratorio-testes';

interface ConcluirTesteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: ConcluirTesteData) => Promise<void>;
  testeName: string;
}

export interface ConcluirTesteData {
  validacao: ValidacaoTesteLab;
  resultado_observado: string;
  comentario: string;
  aprendizados: string;
}

const VALIDACAO_OPTIONS: { value: ValidacaoTesteLab; label: string; icon: typeof ThumbsUp; iconColor: string }[] = [
  { value: 'deu_bom', label: 'Deu Bom', icon: ThumbsUp, iconColor: 'text-emerald-600' },
  { value: 'deu_ruim', label: 'Deu Ruim', icon: ThumbsDown, iconColor: 'text-red-600' },
  { value: 'inconclusivo', label: 'Inconclusivo', icon: HelpCircle, iconColor: 'text-orange-600' },
];

export const ConcluirTesteModal = ({
  open,
  onOpenChange,
  onConfirm,
  testeName,
}: ConcluirTesteModalProps) => {
  const [validacao, setValidacao] = useState<ValidacaoTesteLab | ''>('');
  const [resultadoObservado, setResultadoObservado] = useState('');
  const [comentario, setComentario] = useState('');
  const [aprendizados, setAprendizados] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ validacao?: string; comentario?: string }>({});

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};
    if (!validacao) newErrors.validacao = 'Selecione o resultado do teste';
    if (!comentario.trim()) newErrors.comentario = 'Descreva o resultado do teste';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    await onConfirm({
      validacao: validacao as ValidacaoTesteLab,
      resultado_observado: resultadoObservado,
      comentario: comentario.trim(),
      aprendizados: aprendizados.trim(),
    });
    setLoading(false);

    // Reset form
    setValidacao('');
    setResultadoObservado('');
    setComentario('');
    setAprendizados('');
    setErrors({});
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setValidacao('');
      setResultadoObservado('');
      setComentario('');
      setAprendizados('');
      setErrors({});
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-violet-600" />
            Concluir Teste
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {testeName}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Validação */}
          <div className="space-y-2">
            <Label>O teste deu certo? *</Label>
            <div className="grid grid-cols-3 gap-2">
              {VALIDACAO_OPTIONS.map(({ value, label, icon: Icon, iconColor }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setValidacao(value);
                    setErrors(prev => ({ ...prev, validacao: undefined }));
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    validacao === value
                      ? `${VALIDACAO_COLORS[value]} border-current font-medium`
                      : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${validacao === value ? iconColor : 'text-muted-foreground'}`} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
            {errors.validacao && (
              <p className="text-xs text-red-600">{errors.validacao}</p>
            )}
          </div>

          {/* Resultado Observado */}
          <div className="space-y-2">
            <Label htmlFor="resultado_obs">Resultado observado (valor numerico)</Label>
            <Input
              id="resultado_obs"
              type="number"
              step="any"
              value={resultadoObservado}
              onChange={(e) => setResultadoObservado(e.target.value)}
              placeholder="Ex: 2.5, 150, 0.8"
            />
          </div>

          {/* Comentário/Descrição */}
          <div className="space-y-2">
            <Label htmlFor="comentario_conclusao">Descricao do resultado *</Label>
            <Textarea
              id="comentario_conclusao"
              rows={3}
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                setErrors(prev => ({ ...prev, comentario: undefined }));
              }}
              placeholder="Descreva o que aconteceu no teste, os resultados observados..."
            />
            {errors.comentario && (
              <p className="text-xs text-red-600">{errors.comentario}</p>
            )}
          </div>

          {/* Aprendizados */}
          <div className="space-y-2">
            <Label htmlFor="aprendizados_conclusao">Aprendizados (opcional)</Label>
            <Textarea
              id="aprendizados_conclusao"
              rows={2}
              value={aprendizados}
              onChange={(e) => setAprendizados(e.target.value)}
              placeholder="O que voce aprendeu com esse teste?"
            />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Concluindo...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Concluir Teste
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
