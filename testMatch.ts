import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tbdooscfrrkwfutkdjha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZG9vc2NmcnJrd2Z1dGtkamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQwODIsImV4cCI6MjA3MTUzMDA4Mn0.yd988Fotgc9LIZi83NlGDTaeB4f8BNgr9TYJgye0Cqw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: arqs, error } = await supabase.from('arquivo_reuniao').select('ano, id').order('ano', { ascending: false });
    console.log("Arquivos disponíveis:", arqs);

    if (arqs && arqs.length > 0) {
        const ano = arqs[0].ano;
        console.log("Buscando ano:", ano);
        const { data: arq } = await supabase.from('arquivo_reuniao').select('conteudo').eq('ano', ano).maybeSingle();
        console.log("Raw conteudo keys:", arq ? Object.keys(arq.conteudo || {}) : 'null');
        console.log("Raw conteudo type:", arq?.conteudo?.type);
        if (arq?.conteudo?.content) {
            console.log("Number of root nodes:", arq.conteudo.content.length);
            for (let i = 0; i < Math.min(10, arq.conteudo.content.length); i++) {
                console.log("Node type:", arq.conteudo.content[i].type);
                if (arq.conteudo.content[i].type === 'paragraph') {
                    console.log("Text:", arq.conteudo.content[i].content?.map((c: any) => c.text).join(''));
                }
            }
        }
    }
}
run();
