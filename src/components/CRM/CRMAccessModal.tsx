import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CRMAccessModalProps {
  isOpen: boolean;
  attempts: number;
  onAuthenticate: (password: string) => Promise<boolean>;
}

export const CRMAccessModal = ({ isOpen, attempts, onAuthenticate }: CRMAccessModalProps) => {
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
        setError('Acesso negado. Entre em contato com o administrador.');
      } else {
        setError('Senha incorreta. Tente novamente.');
      }
      setPassword('');
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <img 
              src="/lovable-uploads/aa058792-aa89-40ce-8f0d-8f6e8c759294.png" 
              alt="BNOads" 
              className="h-16 w-auto"
            />
            <DialogTitle className="text-center">Acesso Restrito - CRM</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Digite a senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || attempts >= 3}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {attempts >= 3 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Número máximo de tentativas excedido. Contate o administrador do sistema.
              </AlertDescription>
            </Alert>
          ) : (
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !password || attempts >= 3}
            >
              {isLoading ? 'Verificando...' : 'Entrar'}
            </Button>
          )}

          {attempts > 0 && attempts < 3 && (
            <p className="text-sm text-center text-muted-foreground">
              Tentativa {attempts} de 3
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};