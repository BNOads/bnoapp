import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Wifi } from "lucide-react";
import { useMetaConnection } from "@/hooks/useMetaConnection";
import { useToast } from "@/hooks/use-toast";

export const MetaConnectionStatus = () => {
  const [token, setToken] = useState("");
  const { activeConnection, isLoading, validateToken, isValidating } = useMetaConnection();
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!token.trim()) {
      toast({ title: "Token obrigatório", description: "Cole o token de acesso do Meta.", variant: "destructive" });
      return;
    }

    try {
      const result = await validateToken(token);
      toast({
        title: "Token validado com sucesso!",
        description: `Usuário: ${result.user.name} | ${result.accounts_count} contas encontradas`,
      });
      setToken("");
    } catch (err: any) {
      toast({
        title: "Erro ao validar token",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (!activeConnection) {
      return <Badge variant="secondary">Não conectado</Badge>;
    }

    if (activeConnection.status === 'active') {
      const expiresAt = activeConnection.expires_at ? new Date(activeConnection.expires_at) : null;
      const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;

      if (isExpiringSoon) {
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expirando em breve
          </Badge>
        );
      }

      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Conectado
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Erro
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Conexão Meta Ads
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeConnection && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
            <p><span className="font-medium">Última validação:</span> {activeConnection.last_validated_at ? new Date(activeConnection.last_validated_at).toLocaleString('pt-BR') : '-'}</p>
            {activeConnection.expires_at && (
              <p><span className="font-medium">Expira em:</span> {new Date(activeConnection.expires_at).toLocaleString('pt-BR')}</p>
            )}
            {activeConnection.error_message && (
              <p className="text-red-600"><span className="font-medium">Erro:</span> {activeConnection.error_message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="meta-token">Token de Acesso Meta</Label>
          <div className="flex gap-2">
            <Input
              id="meta-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o token de acesso do Meta Ads aqui"
              className="flex-1"
            />
            <Button onClick={handleValidate} disabled={isValidating || !token.trim()}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar e Conectar'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use um token de longa duração gerado no Meta Business Manager.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
