import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FieldOption {
  id: string;
  field_key: string;
  option_key: string;
  option_label: string;
  color: string;
  sort_order: number;
}

export const useFieldOptions = (fieldKey: string) => {
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('client_field_options')
          .select('*')
          .eq('field_key', fieldKey)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        setOptions(data || []);
      } catch (err) {
        console.error(`Erro ao carregar opções de ${fieldKey}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [fieldKey]);

  const getOption = (optionKey: string | null) => {
    return options.find(o => o.option_key === optionKey) || null;
  };

  const getLabel = (optionKey: string | null) => {
    return getOption(optionKey)?.option_label || optionKey || 'Não definido';
  };

  const getColor = (optionKey: string | null) => {
    return getOption(optionKey)?.color || '#6B7280';
  };

  return { options, loading, getOption, getLabel, getColor };
};
