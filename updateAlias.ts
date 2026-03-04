import { supabase } from './src/integrations/supabase/client';

async function run() {
    const { data: clients, error } = await supabase
        .from('clientes')
        .select('id, aliases, nome')
        .ilike('nome', '%MYLLAMURTA%')
        .single();

    if (error) {
        console.error('Erro ao buscar cliente:', error);
        return;
    }

    const currentAliases = clients.aliases || [];

    if (!currentAliases.includes('Feita Para Mais')) {
        const newAliases = [...currentAliases, 'Feita Para Mais', 'feita para mais'];

        // Remover duplicatas caso a busca ignore case
        const uniqueAliases = Array.from(new Set(newAliases));

        const { error: updateError } = await supabase
            .from('clientes')
            .update({ aliases: uniqueAliases })
            .eq('id', clients.id);

        if (updateError) {
            console.error('Erro ao atualizar aliases:', updateError);
        } else {
            console.log('Aliases atualizados com sucesso para', clients.nome, ':', uniqueAliases);
        }
    } else {
        console.log('Alias já existe na cliente', clients.nome);
    }
}

run();
