async function run() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tbdooscfrrkwfutkdjha.supabase.co';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZG9vc2NmcnJrd2Z1dGtkamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQwODIsImV4cCI6MjA3MTUzMDA4Mn0.yd988Fotgc9LIZi83NlGDTaeB4f8BNgr9TYJgye0Cqw';

    const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };

    const getRes = await fetch(`${supabaseUrl}/rest/v1/clientes?nome=ilike.*MYLLAMURTA*&select=id,aliases,nome`, { headers });
    const data = await getRes.json();

    if (!data || data.length === 0) {
        console.log('Cliente MYLLAMURTA não encontrada');
        return;
    }

    const client = data[0];
    const aliases = client.aliases || [];

    if (!aliases.includes('Feita Para Mais') && !aliases.includes('feita para mais')) {
        const newAliases = [...aliases, 'Feita Para Mais', 'feita para mais'];
        const uniqueAliases = Array.from(new Set(newAliases));

        // Atualiza BD
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/clientes?id=eq.${client.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ aliases: uniqueAliases })
        });
        const patchData = await patchRes.json();
        console.log('Aliases atualizados:', patchData);
    } else {
        console.log('O alias Feita Para Mais já existia:', aliases);
    }
}

run();
