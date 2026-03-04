import * as fs from 'fs';

function run() {
    const data = JSON.parse(fs.readFileSync('db_snap.json', 'utf-8'));
    let nodes = data.root?.children || data.content;

    if (!nodes) return console.log('no nodes');

    for (const n of nodes) {
        if (n.type === 'heading') {
            const text = n.content?.map(c => c.text).join('') || n.children?.map(c => c.text).join('');
            console.log('Heading:', text, '| eventId:', n.attrs?.eventId);
        }
    }
}
run();
