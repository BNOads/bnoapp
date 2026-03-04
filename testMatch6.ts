import * as fs from 'fs';

function normStr(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function extractText(node) {
    if (!node.content) return '';
    return node.content.map(c => c.text).join(' ');
}

function run() {
    const data = JSON.parse(fs.readFileSync('db_snap.json', 'utf-8'));
    let nodes = data.root?.children || data.content;

    if (!nodes) return console.log('no nodes');

    let eventId = '1puik9nbek69116a4hbeljdg77_20260304T130000Z'; // Mock da instancia de hj
    let eventTitle = 'CAROLVELTEN | Alinhamento';
    let eventDateStr = '2026-03-04T13:00:00.000Z'; // mock

    const eventDateFormatted = '04/03/2026';
    const eventDateShort = '04/03';
    const titleParts = eventTitle.split(/[|\-]/).map(p => normStr(p));

    let bestScore = 0;
    let targetHeadingNode = null;
    let currentH1DateScan = '';
    const clientMatch = 'carol velten';

    for (const node of nodes) {
        if (node.type === 'heading' && node.attrs?.level === 1) {
            currentH1DateScan = extractText(node);
        }

        if (node.type === 'heading') {
            const headingText = extractText(node);
            const normHeading = normStr(headingText);

            if (normHeading.length < 3) continue;

            let score = 0;

            // Match por ID com tratamento para série recorrente
            if (eventId && node.attrs?.eventId) {
                const nodeEventIdStr = String(node.attrs.eventId);

                if (nodeEventIdStr === eventId) {
                    console.log('>>> EXACT INSTANCE MATCH:', nodeEventIdStr, 'para', headingText);
                    targetHeadingNode = node;
                    break;
                }

                const cleanTargetId = String(eventId).split('_')[0];
                const cleanNodeId = nodeEventIdStr.split('_')[0];
                if (cleanTargetId === cleanNodeId) {
                    console.log('>>> SERIES PREFIX MATCH (+100):', nodeEventIdStr, 'para', headingText);
                    score += 100;
                }
            }

            // Match por partes do título (ex: "Alinhamento")
            if (titleParts.length > 0) {
                for (const part of titleParts) {
                    if (part.length > 2 && normHeading.includes(part)) {
                        score += 10;
                    }
                }
            }

            // Match Inteligente de Cliente (Nome ou Aliases)
            if (clientMatch && normHeading.includes(clientMatch)) {
                score += 20;
            }

            // Match de Data (Exata ou Parcial)
            if (headingText.includes(eventDateFormatted) || currentH1DateScan.includes(eventDateFormatted)) {
                score += 20;
            } else if (headingText.includes(eventDateShort) || currentH1DateScan.includes(eventDateShort)) {
                score += 10;
            }

            // Se a pontuação for boa o suficiente e melhor que a anterior, substitui
            if (score > 15 && score > bestScore) {
                console.log('=> Score update:', score, 'para', headingText);
                bestScore = score;
                targetHeadingNode = node;
            }
        }
    }

    console.log('RESULTADO FINAL SCORE:', bestScore, extractText(targetHeadingNode));
}
run();
