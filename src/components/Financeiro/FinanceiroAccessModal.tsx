import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface FinanceiroAccessModalProps {
  isOpen: boolean;
  attempts: number;
  onAuthenticate: (password: string) => Promise<boolean>;
}

export const FinanceiroAccessModal = ({ isOpen, attempts, onAuthenticate }: FinanceiroAccessModalProps) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await onAuthenticate(password);

    if (!success) {
      if (attempts >= 2) {
        setError('Acesso negado. Contate o administrador.');
      } else {
        setError(`Senha incorreta. ${3 - attempts - 1} tentativa(s) restante(s).`);
      }
      setPassword('');
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/aa058792-aa89-40ce-8f0d-8f6e8c759294.png" 
              alt="BNOads Logo" 
              className="h-16 w-auto"
            />
          </div>
          <DialogTitle className="text-center text-2xl">Acesso ao Financeiro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password">Senha de Acesso</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              disabled={isLoading || attempts >= 3}
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || attempts >= 3 || !password}
          >
            {isLoading ? 'Verificando...' : 'Entrar'}
          </Button>

          {attempts >= 3 && (
            <p className="text-sm text-center text-destructive">
              Número máximo de tentativas excedido. Contate o administrador.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
