import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload } from 'lucide-react';
interface ImportCSVButtonProps {
  onImportComplete: () => void;
}
export const ImportCSVButton = ({
  onImportComplete
}: ImportCSVButtonProps) => {
  const {
    toast
  } = useToast();
  const handleImportCSV = async () => {
    try {
      // Fetch the CSV file from public folder
      const response = await fetch('/lancamentos_import.csv');
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      const {
        data: userData
      } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }
      let successCount = 0;
      const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(val => val.trim().replace(/"/g, ''));
          if (values[0] && values[2]) {
            // Only import if we have name and start date
            const lancamentoData = {
              nome_lancamento: values[0],
              tipo_lancamento: values[1] || 'outro',
              data_inicio_captacao: values[2],
              investimento_total: parseFloat(values[3]) || 0,
              descricao: values[4] || null,
              data_fim_captacao: values[5] || null,
              link_dashboard: values[6] || null,
              link_briefing: values[7] || null,
              observacoes: values[8] || null,
              status_lancamento: 'em_captacao',
              created_by: userData.user.id
            };
            const {
              error
            } = await supabase.from('lancamentos').insert([lancamentoData as any]);
            if (error) throw error;
            successCount++;
          }
        } catch (error: any) {
          errors.push(`Linha ${i + 1}: ${error.message}`);
        }
      }
      toast({
        title: "Importação concluída",
        description: `${successCount} lançamentos importados com sucesso. ${errors.length} erros encontrados.`
      });
      if (errors.length > 0) {
        console.log('Erros de importação:', errors);
      }
      onImportComplete();
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  return (
    <Button
      variant="outline"
      onClick={handleImportCSV}
      className="gap-2"
    >
      <Upload className="h-4 w-4" />
      Importar CSV
    </Button>
  );
};