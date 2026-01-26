import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock } from 'lucide-react';

interface CRMLoginModalProps {
    onLoginSuccess: (token: string) => void;
}

export const CRMLoginModal = ({ onLoginSuccess }: CRMLoginModalProps) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (attempts >= 3) {
            toast.error("Acesso negado, contate o administrador");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('crm-auth', {
                body: { password }
            });

            if (error) {
                setAttempts(prev => prev + 1);
                console.error('CRM Auth Error:', error);

                // If it's a 4xx but not 401, it might be a schema issue or code issue
                const errorMsg = error.message || "Senha incorreta";
                toast.error(errorMsg);

                if (attempts + 1 >= 3) {
                    toast.error("Acesso negado, contate o administrador");
                }
            } else if (data?.token) {
                onLoginSuccess(data.token);
                toast.success("Bem-vindo ao CRM!");
            }
        } catch (err) {
            console.error('Login error:', err);
            toast.error("Erro ao validar senha");
        } finally {
            setLoading(false);
        }
    };

    const bnoadsLogo = "/lovable-uploads/aa058792-aa89-40ce-8f0d-8f6e8c759294.png";

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
                <CardHeader className="flex flex-col items-center space-y-4 pb-8">
                    <img src={bnoadsLogo} alt="BNOads Logo" className="h-20 w-20 object-contain" />
                    <div className="text-center">
                        <CardTitle className="text-2xl font-bold bg-gradient-brand bg-clip-text text-transparent">BNOads CRM</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Digite a senha para acessar a ferramenta</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                placeholder="Digite a senha de acesso"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                disabled={loading || attempts >= 3}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-11 text-lg font-semibold"
                            disabled={loading || attempts >= 3 || !password}
                        >
                            {loading ? "Validando..." : "Entrar"}
                        </Button>
                        {attempts > 0 && attempts < 3 && (
                            <p className="text-xs text-center text-red-500 font-medium animate-pulse">
                                Tentativa {attempts} de 3
                            </p>
                        )}
                        {attempts >= 3 && (
                            <p className="text-sm text-center text-red-600 font-bold">
                                Acesso negado, contate o administrador
                            </p>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
