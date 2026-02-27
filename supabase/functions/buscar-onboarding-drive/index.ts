import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pasta central de gravações de reuniões
const MEET_RECORDINGS_FOLDER_ID = "1P8nHVBmw2Qx2WXLiuT96B-cdxRnphwda";

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
}

// Busca todos os arquivos na pasta de gravações com nome contendo "onboarding"
async function searchOnboardingFiles(apiKey: string): Promise<DriveFile[]> {
    const allFiles: DriveFile[] = [];
    let nextPageToken: string | undefined;

    do {
        const params = new URLSearchParams({
            key: apiKey,
            q: `'${MEET_RECORDINGS_FOLDER_ID}' in parents and name contains 'Onboarding' and trashed=false`,
            fields: "nextPageToken,files(id,name,mimeType,webViewLink)",
            pageSize: "200",
            orderBy: "name",
        });

        if (nextPageToken) params.append("pageToken", nextPageToken);

        const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`Drive API error: ${resp.status} - ${err}`);
        }

        const data = await resp.json();
        allFiles.push(...(data.files || []));
        nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return allFiles;
}

// Normaliza texto para comparação: remove acentos, espaços extras, uppercase
function normalize(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

// Verifica se um nome do cliente ou alias aparece no nome do arquivo
function clientMatchesFile(fileName: string, clienteNome: string, aliases: string[]): boolean {
    const normalizedFile = normalize(fileName);
    const terms = [clienteNome, ...aliases].map(normalize);
    return terms.some((term) => normalizedFile.includes(term));
}

// Determina o tipo do arquivo pelo nome
function detectFileType(fileName: string): "recording" | "transcricao" | "chat" | "outro" {
    const lower = fileName.toLowerCase();
    if (lower.includes("anotações do gemini") || lower.includes("anotacoes do gemini") || lower.includes("gemini notes")) {
        return "transcricao";
    }
    if (lower.includes("transcrição do chat") || lower.includes("transcricao do chat") || lower.includes("chat transcript")) {
        return "chat";
    }
    if (lower.includes("recording") || lower.includes("gravação") || lower.includes("gravacao")) {
        return "recording";
    }
    return "outro";
}

// Gera a seção de onboarding em Markdown
function buildOnboardingSection(
    recording: DriveFile | null,
    transcricao: DriveFile | null,
    chat: DriveFile | null
): string {
    const lines: string[] = ["## Onboarding", ""];

    if (recording) {
        lines.push(`- 🎥 **Gravação:** [Assistir](${recording.webViewLink})`);
    }
    if (transcricao) {
        lines.push(`- 📄 **Transcrição (Gemini):** [Ver documento](${transcricao.webViewLink})`);
    }
    if (chat) {
        lines.push(`- 💬 **Chat da reunião:** [Ver chat](${chat.webViewLink})`);
    }

    if (!recording && !transcricao && !chat) {
        lines.push("_Nenhuma gravação de onboarding encontrada._");
    }

    lines.push("");
    return lines.join("\n");
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");
        if (!API_KEY) throw new Error("GOOGLE_DRIVE_API_KEY não configurada");

        // clienteId opcional — se não passar, roda em modo batch para todos os clientes
        const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
        const { clienteId } = body;

        console.log(clienteId ? `Modo individual: ${clienteId}` : "Modo batch: todos os clientes");

        // 1. Buscar todos os arquivos de onboarding na pasta central
        console.log("Buscando arquivos de onboarding no Drive...");
        const onboardingFiles = await searchOnboardingFiles(API_KEY);
        console.log(`${onboardingFiles.length} arquivos de onboarding encontrados`);

        // 2. Buscar clientes com kickoff
        const clienteQuery = supabase
            .from("clientes")
            .select("id, nome, aliases")
            .order("nome");

        if (clienteId) clienteQuery.eq("id", clienteId);

        const { data: clientes, error: clientesError } = await clienteQuery;
        if (clientesError) throw clientesError;

        // 3. Para cada cliente, buscar arquivos correspondentes
        const results: { clienteNome: string; found: boolean; kickoffUpdated: boolean }[] = [];

        for (const cliente of clientes || []) {
            const aliases: string[] = cliente.aliases || [];
            const matchedFiles = onboardingFiles.filter((f) =>
                clientMatchesFile(f.name, cliente.nome, aliases)
            );

            if (matchedFiles.length === 0) {
                console.log(`Nenhum onboarding encontrado para: ${cliente.nome}`);
                results.push({ clienteNome: cliente.nome, found: false, kickoffUpdated: false });
                continue;
            }

            console.log(`${matchedFiles.length} arquivos para ${cliente.nome}:`);
            matchedFiles.forEach((f) => console.log(`  - ${f.name}`));

            // Classificar os arquivos
            let recording: DriveFile | null = null;
            let transcricao: DriveFile | null = null;
            let chat: DriveFile | null = null;

            for (const file of matchedFiles) {
                const tipo = detectFileType(file.name);
                if (tipo === "recording" && !recording) recording = file;
                else if (tipo === "transcricao" && !transcricao) transcricao = file;
                else if (tipo === "chat" && !chat) chat = file;
            }

            const onboardingSection = buildOnboardingSection(recording, transcricao, chat);

            // 4. Buscar o kickoff do cliente
            const { data: kickoff } = await supabase
                .from("kickoffs")
                .select("id")
                .eq("client_id", cliente.id)
                .maybeSingle();

            let kickoffId = kickoff?.id;

            // Se não tem kickoff, criar um
            if (!kickoffId) {
                const { data: adminUser } = await supabase
                    .from("colaboradores")
                    .select("user_id")
                    .limit(1)
                    .single();

                const { data: novoKickoff, error: kickoffError } = await supabase
                    .from("kickoffs")
                    .insert({ client_id: cliente.id, status: "active", created_by: adminUser?.user_id })
                    .select("id")
                    .single();

                if (kickoffError) {
                    console.error(`Erro ao criar kickoff para ${cliente.nome}:`, kickoffError);
                    results.push({ clienteNome: cliente.nome, found: true, kickoffUpdated: false });
                    continue;
                }
                kickoffId = novoKickoff.id;
            }

            // 5. Buscar versão atual do kickoff
            const { data: latestContent } = await supabase
                .from("kickoff_content")
                .select("version, content_md")
                .eq("kickoff_id", kickoffId)
                .order("version", { ascending: false })
                .limit(1)
                .maybeSingle();

            const currentVersion = latestContent?.version || 0;
            const currentContent = latestContent?.content_md || `# Kickoff — ${cliente.nome}\n\n`;

            // Verificar se já tem seção de onboarding
            if (currentContent.includes("## Onboarding")) {
                // Substituir seção existente
                const updatedContent = currentContent.replace(
                    /## Onboarding[\s\S]*?(?=\n## |\n# |$)/,
                    onboardingSection
                );

                const { data: adminUser } = await supabase
                    .from("colaboradores")
                    .select("user_id")
                    .limit(1)
                    .single();

                const { error: insertError } = await supabase
                    .from("kickoff_content")
                    .insert({
                        kickoff_id: kickoffId,
                        content_md: updatedContent,
                        version: currentVersion + 1,
                        created_by: adminUser?.user_id,
                    });

                if (insertError) {
                    console.error(`Erro ao atualizar kickoff de ${cliente.nome}:`, insertError);
                    results.push({ clienteNome: cliente.nome, found: true, kickoffUpdated: false });
                } else {
                    console.log(`Kickoff atualizado (seção onboarding substituída): ${cliente.nome} v${currentVersion + 1}`);
                    results.push({ clienteNome: cliente.nome, found: true, kickoffUpdated: true });
                }
            } else {
                // Adicionar seção de onboarding ao final do conteúdo atual
                const updatedContent = currentContent.trimEnd() + "\n\n" + onboardingSection;

                const { data: adminUser } = await supabase
                    .from("colaboradores")
                    .select("user_id")
                    .limit(1)
                    .single();

                const { error: insertError } = await supabase
                    .from("kickoff_content")
                    .insert({
                        kickoff_id: kickoffId,
                        content_md: updatedContent,
                        version: currentVersion + 1,
                        created_by: adminUser?.user_id,
                    });

                if (insertError) {
                    console.error(`Erro ao inserir seção onboarding em ${cliente.nome}:`, insertError);
                    results.push({ clienteNome: cliente.nome, found: true, kickoffUpdated: false });
                } else {
                    console.log(`Onboarding adicionado ao kickoff: ${cliente.nome} v${currentVersion + 1}`);
                    results.push({ clienteNome: cliente.nome, found: true, kickoffUpdated: true });
                }
            }
        }

        const updated = results.filter((r) => r.kickoffUpdated).length;
        const found = results.filter((r) => r.found).length;

        return new Response(
            JSON.stringify({
                success: true,
                message: `${updated} kickoffs atualizados de ${found} clientes com gravações encontradas`,
                results,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("Erro em buscar-onboarding-drive:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
