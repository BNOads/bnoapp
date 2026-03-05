import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateHTML } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import CustomHeading from '@/components/Reunioes/CustomHeading';
import { useClienteByName } from '@/hooks/useClienteByName';
import { parseClientFromTitle } from '@/utils/parseClientFromTitle';
import { convertLexicalToTipTap, isLexicalContent } from '@/lib/migrateArquivoToYjs';

const extensions = [
    Document,
    Paragraph,
    Text,
    CustomHeading, // Use CustomHeading exactly as in the editor to correctly parse eventId
    Heading.configure({ levels: [1, 2, 3] }),
    Bold,
    Italic,
    BulletList,
    OrderedList,
    ListItem,
    Link,
    Underline,
    Strike,
    TaskList,
    TaskItem,
    Highlight
];

function normStr(str?: string | null) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
}

function extractText(node: any): string {
    if (!node.content) return '';
    return node.content.map((c: any) => c.text).join(' ');
}

// Retorna todas as pautas em H1 e H2 para popular a Select Box
export function useAllMeetingHeadings() {
    return useQuery({
        queryKey: ['all-meeting-headings'],
        queryFn: async () => {
            const currentYear = new Date().getFullYear();
            const { data, error } = await supabase
                .from('arquivo_reuniao')
                .select('conteudo')
                .eq('ano', currentYear)
                .maybeSingle();

            if (error || !data?.conteudo) return [];

            let conteudoDataStr = typeof data.conteudo === 'string' ? data.conteudo : JSON.stringify(data.conteudo);
            let conteudoData;
            try {
                conteudoData = JSON.parse(conteudoDataStr);
            } catch (e) { return []; }

            // Migration from Lexical to Yjs?
            if (isLexicalContent(conteudoData)) {
                conteudoData = convertLexicalToTipTap(conteudoData);
            }

            if (!conteudoData?.content) return [];

            const headings: string[] = [];
            for (const node of conteudoData.content) {
                if (node.type === 'heading' && (node.attrs?.level === 1 || node.attrs?.level === 2)) {
                    const text = extractText(node);
                    if (text && text.length > 2) {
                        headings.push(text);
                    }
                }
            }

            return headings;
        },
        staleTime: 60 * 1000,
    });
}

export function useMeetingPauta(
    eventId: string | null,
    eventTitle: string | null,
    eventDateStr: string | null,
    ano: number | null,
    manualPautaText?: string | null
) {
    const { data: clientMatch } = useClienteByName(eventTitle ? parseClientFromTitle(eventTitle) : null);

    return useQuery({
        queryKey: ['meeting-pauta', eventId, eventTitle, eventDateStr, ano, manualPautaText],
        enabled: (!!eventId || !!eventTitle) && !!ano,
        queryFn: async () => {
            if (!ano) return null;

            const { data, error } = await supabase
                .from('arquivo_reuniao')
                .select('*')
                .eq('ano', ano)
                .maybeSingle();

            if (error) {
                console.error('Erro ao buscar arquivo de reunião', error);
                return null;
            }

            if (!data?.conteudo) return null;

            let conteudoDataStr = typeof data.conteudo === 'string' ? data.conteudo : JSON.stringify(data.conteudo);
            let conteudoData;
            try {
                conteudoData = JSON.parse(conteudoDataStr);
            } catch (e) {
                console.error("Failed to parse conteudo JSON in hook");
                return null;
            }

            if (isLexicalContent(conteudoData)) {
                conteudoData = convertLexicalToTipTap(conteudoData);
            }

            if (!conteudoData?.content || !Array.isArray(conteudoData.content)) {
                return null;
            }

            let bestScore = 0;
            let targetHeadingNode: any = null;
            let startLevel = 1;
            let currentH1DateScan = '';

            const eventDateObj = eventDateStr ? new Date(eventDateStr) : null;
            const eventDateFormatted = eventDateObj ? eventDateObj.toLocaleDateString('pt-BR') : null;
            const eventDateShort = eventDateFormatted ? eventDateFormatted.substring(0, 5) : null;
            const titleParts = eventTitle ? eventTitle.split(/[|\-]/).map(p => normStr(p)) : [];

            // Escanear todos os nodos de heading para encontrar o melhor
            for (const node of conteudoData.content) {
                if (node.type === 'heading' && node.attrs?.level === 1) {
                    currentH1DateScan = extractText(node);
                }

                if (node.type === 'heading') {
                    const headingText = extractText(node);
                    const normHeading = normStr(headingText);

                    if (normHeading.length < 3) continue;

                    let score = 0;
                    let hasDateMatch = false;

                    // Match de Data (Exata ou Parcial)
                    if (eventDateFormatted && (headingText.includes(eventDateFormatted) || currentH1DateScan.includes(eventDateFormatted))) {
                        score += 50; // Aumentar bonus de data
                        hasDateMatch = true;
                    } else if (eventDateShort && (headingText.includes(eventDateShort) || currentH1DateScan.includes(eventDateShort))) {
                        score += 30; // Aumentar bonus de data
                        hasDateMatch = true;
                    }

                    // Override Manual via Atendimento Drawer: Passe Livre Absoluto
                    if (manualPautaText) {
                        const isMatch = normHeading.includes(normStr(manualPautaText)) || normStr(manualPautaText).includes(normHeading);
                        if (isMatch) {
                            console.log("Matched Manual Pauta!", manualPautaText, headingText);
                            targetHeadingNode = node;
                            startLevel = node.attrs?.level || 1;
                            break;
                        }
                    }

                    // Se não tiver ao menos um cruzamento de data E não for uma busca vazia
                    if (!hasDateMatch) {
                        continue; // Evita que puxemos pauta da semana passada por causa de ID Base Mestre igual na Adivinhação
                    }

                    // Se a pontuação for boa o suficiente e melhor que a anterior, substitui
                    // Precisa de no mínimo Match de Data (30/50) + Match de Cliente (20) ou Título (10) para adivinhar
                    if (score > 35 && score > bestScore) {
                        bestScore = score;
                        targetHeadingNode = node;
                        startLevel = node.attrs?.level || 1;
                    }
                }
            }

            if (!targetHeadingNode) return null;

            // Extract content belonging to this heading
            let extracting = false;
            const extractedNodes = [];

            for (const node of conteudoData.content) {
                if (!extracting) {
                    if (node === targetHeadingNode) {
                        extracting = true;
                    }
                } else {
                    if (node.type === 'heading' && node.attrs?.level <= startLevel) {
                        break; // Finished extracting this meeting's block
                    }
                }

                if (extracting) {
                    extractedNodes.push(node);
                }
            }

            if (extractedNodes.length === 0) return null;

            const doc = {
                type: 'doc',
                content: extractedNodes
            };

            try {
                const html = generateHTML(doc, extensions);
                return html;
            } catch (err) {
                console.error('Erro ao gerar HTML da pauta', err);
                return null;
            }
        },
        staleTime: 60 * 1000,
    });
}
