import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    const url = process.env.VITE_SUPABASE_URL + '/rest/v1/arquivo_reuniao?ano=eq.2026&select=id,conteudo';
    const res = await fetch(url, {
        headers: {
            apikey: process.env.VITE_SUPABASE_ANON_KEY!,
            Authorization: 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY!,
        }
    });

    const data = await res.json();
    if (!data || data.length === 0) return console.log('not found');

    const cont = data[0].conteudo;
    console.log('Keys:', Object.keys(cont));

    let nodes = [];
    if (cont.content) {
        console.log('is tiptap');
        nodes = cont.content;
    } else if (cont.root?.children) {
        console.log('is lexical');
        nodes = cont.root.children;
    } else {
        console.log('unknown format');
        console.log(JSON.stringify(cont, null, 2).slice(0, 500));
    }

    console.log('Total nodes:', nodes.length);

    for (const n of nodes) {
        if (n.type === 'heading') {
            console.log('HEADING:', JSON.stringify(n));
        }
    }
}

run().catch(console.error);
