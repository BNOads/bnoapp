import { useState, useEffect } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';

interface Cliente {
    id: string;
    nome: string;
}

interface ClientSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ClientSelect({
    value,
    onValueChange,
    placeholder = "Selecione o cliente",
    disabled = false,
}: ClientSelectProps) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadClientes();
    }, []);

    const loadClientes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('clientes')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;
            setClientes(data || []);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const options = clientes.map(c => ({
        id: c.id,
        name: c.nome,
    }));

    return (
        <SearchableSelect
            options={options}
            value={value}
            onValueChange={onValueChange}
            placeholder={loading ? "Carregando clientes..." : placeholder}
            emptyMessage="Nenhum cliente encontrado."
            disabled={disabled || loading}
        />
    );
}
