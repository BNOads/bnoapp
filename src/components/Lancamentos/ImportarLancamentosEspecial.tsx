import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2 } from 'lucide-react';

interface ImportarLancamentosEspecialProps {
  onImportComplete: () => void;
}

export const ImportarLancamentosEspecial: React.FC<ImportarLancamentosEspecialProps> = ({ 
  onImportComplete 
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const parseDateString = (dateStr: string): string => {
    const hoje = new Date();
    
    // "Hoje"
    if (dateStr.toLowerCase() === 'hoje') {
      return hoje.toISOString().split('T')[0];
    }
    
    // "X dias atrás"
    const diasAtrasMatch = dateStr.match(/(\d+)\s*dias?\s*atrás/i);
    if (diasAtrasMatch) {
      const dias = parseInt(diasAtrasMatch[1]);
      const data = new Date(hoje);
      data.setDate(data.getDate() - dias);
      return data.toISOString().split('T')[0];
    }
    
    // Formato DD/MM/YY
    const ddmmyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (ddmmyyMatch) {
      const dia = parseInt(ddmmyyMatch[1]);
      const mes = parseInt(ddmmyyMatch[2]) - 1; // mês é 0-indexed
      const ano = 2000 + parseInt(ddmmyyMatch[3]); // assumindo 20XX
      const data = new Date(ano, mes, dia);
      return data.toISOString().split('T')[0];
    }
    
    // Tentar parse direto
    const tentativa = new Date(dateStr);
    if (!isNaN(tentativa.getTime())) {
      return tentativa.toISOString().split('T')[0];
    }
    
    // Fallback: hoje
    return hoje.toISOString().split('T')[0];
  };

  const normalizarTipo = (tipo: string): string => {
    const mapa: { [key: string]: string } = {
      'captação simples': 'captacao_simples',
      'lançamento tradicional': 'tradicional',
      'semente': 'semente',
      'interno': 'interno',
      'externo': 'externo',
      'perpétuo': 'perpetuo',
      'flash': 'flash',
      'evento': 'evento',
      'outro': 'outro'
    };
    
    const tipoNormalizado = tipo.toLowerCase().trim();
    return mapa[tipoNormalizado] || 'outro';
  };

  const handleImportCSV = async () => {
    setLoading(true);
    try {
      // Buscar CSV do public
      const response = await fetch('/lancamentos_importacao.csv');
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV vazio ou sem dados');
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar clientes para identificação
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, slug, aliases, primary_gestor_user_id')
        .eq('ativo', true);

      let sucessos = 0;
      const erros: string[] = [];

      // Processar cada linha (pular cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(val => val.trim().replace(/^"|"$/g, ''));
          
          if (values.length < 4 || !values[0]) {
            continue;
          }

          const nomeLancamento = values[0];
          const tipoOriginal = values[1];
          const dataStr = values[2];
          const investimento = parseFloat(values[3]) || 0;

          // Converter tipo
          const tipo = normalizarTipo(tipoOriginal);
          
          // Converter data
          const dataInicio = parseDateString(dataStr);

          // Identificar cliente pelo nome do lançamento
          const nomeNormalizado = nomeLancamento.toLowerCase().trim();
          const clienteEncontrado = (clientes || []).find(cliente => {
            if (cliente.slug && nomeNormalizado.includes(cliente.slug.toLowerCase())) {
              return true;
            }
            if (cliente.aliases && Array.isArray(cliente.aliases)) {
              return cliente.aliases.some(alias => 
                nomeNormalizado.includes(alias.toLowerCase())
              );
            }
            return nomeNormalizado.includes(cliente.nome.toLowerCase());
          });

          // Preparar dados
          const lancamentoData = {
            nome_lancamento: nomeLancamento,
            tipo_lancamento: tipo,
            data_inicio_captacao: dataInicio,
            investimento_total: investimento,
            status_lancamento: 'em_captacao',
            cliente_id: clienteEncontrado?.id || null,
            gestor_responsavel_id: clienteEncontrado?.primary_gestor_user_id || null,
            created_by: userData.user.id
          } as any;

          // Verificar duplicata
          const { data: existente } = await supabase
            .from('lancamentos')
            .select('id')
            .eq('nome_lancamento', lancamentoData.nome_lancamento)
            .eq('data_inicio_captacao', lancamentoData.data_inicio_captacao)
            .maybeSingle();

          if (existente?.id) {
            // Atualizar
            const { error: updErr } = await supabase
              .from('lancamentos')
              .update(lancamentoData)
              .eq('id', existente.id);
            if (updErr) throw updErr;
          } else {
            // Inserir
            const { error: insErr } = await supabase
              .from('lancamentos')
              .insert([lancamentoData]);
            if (insErr) throw insErr;
          }
          
          sucessos++;
          
        } catch (error: any) {
          erros.push(`Linha ${i + 1}: ${error.message}`);
          console.error(`Erro linha ${i + 1}:`, error);
        }
      }

      toast({
        title: "Importação concluída",
        description: `${sucessos} lançamentos importados com sucesso. ${erros.length} erros.`,
      });

      if (erros.length > 0) {
        console.log('Erros de importação:', erros);
      }

      onImportComplete();
      
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      onClick={handleImportCSV}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Importando...
        </>
      ) : (
        <>
          <Upload className="h-4 w-4" />
          Importar CSV Especial
        </>
      )}
    </Button>
  );
};
