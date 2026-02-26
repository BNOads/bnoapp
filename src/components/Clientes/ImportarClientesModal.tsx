import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

interface ImportarClientesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type CsvRow = Record<string, string>;
interface ClientLookup {
  id: string;
  nome: string;
}

interface KickoffData {
  responsavel: string;
  nicho: string;
  investimento: string;
  historia_empresa: string;
  servico: string;
  objetivo_trafego: string;
  fluxo_vendas: string;
  diferencial: string;
  desafios: string;
  genero: string;
  idade: string;
  cliente_ideal: string;
  dificuldade: string;
}

const KICKOFF_TEMPLATE = `# Kickoff — {{client_name}}

## Informações Principais
- **Nome do Responsável:** {{responsavel}}
- **Nicho:** {{nicho}}
- **Investimento:** {{investimento}}

## Sobre o Curso e a Empresa
- **História da Empresa:** {{historia_empresa}}
- **Serviço Oferecido:** {{servico}}
- **Objetivo com o Tráfego:** {{objetivo_trafego}}
- **Fluxo de Vendas Atual / Experiência com Tráfego:** {{fluxo_vendas}}
- **Diferencial Competitivo:** {{diferencial}}
- **Desafios Atuais:** {{desafios}}

## Público-Alvo
- **Gênero Ideal:** {{genero}}
- **Idade:** {{idade}}
- **Cliente Ideal (Profissão/Comportamento):** {{cliente_ideal}}
- **Principal Dificuldade:** {{dificuldade}}`;

const EMPTY_KICKOFF_DATA: KickoffData = {
  responsavel: "",
  nicho: "",
  investimento: "",
  historia_empresa: "",
  servico: "",
  objetivo_trafego: "",
  fluxo_vendas: "",
  diferencial: "",
  desafios: "",
  genero: "",
  idade: "",
  cliente_ideal: "",
  dificuldade: "",
};

const CLIENT_NAME_ALIASES = [
  "nome",
  "nome_do_cliente",
  "nome_cliente",
  "cliente",
  "cliente_nome",
  "customer_name",
  "nome_conta",
  "client_name",
  "client",
  "account_name",
];

const TASK_CONTENT_ALIASES = [
  "task_content",
  "task_content_md",
  "task_content_markdown",
  "task_content_text",
  "taskcontent",
  "task_description",
  "conteudo_tarefa",
  "conteudo_task",
  "conteudo",
  "kickoff",
  "kickoff_content",
];

const CLIENT_TEXT_FIELD_ALIASES: Record<string, string[]> = {
  nicho: ["nicho", "segmento", "nicho_do_cliente"],
  pasta_drive_url: ["pasta_drive_url", "pasta_drive", "link_drive", "drive_url", "link_da_pasta_do_google_drive"],
  link_painel: ["link_painel", "painel_url", "dashboard_url", "dashboard", "link_do_painel"],
  observacoes: ["observacoes", "observacao", "obs", "notas", "notes", "observacoes_gerais"],
  descricao_breve: ["descricao_breve", "detalhes_cliente", "detalhes_do_cliente", "descricao", "resumo_cliente"],
  investimento_mensal: ["investimento_mensal", "investimento", "investimento_mensal_r", "orcamento_mensal", "budget"],
  promessas_cliente: ["promessas_cliente", "promessas", "promessa", "promessas_realizadas"],
  whatsapp_cliente: ["whatsapp_cliente", "whatsapp", "whatsapp_do_cliente", "telefone", "phone", "celular"],
  instagram_cliente: ["instagram_cliente", "instagram", "instagram_do_cliente", "insta"],
  localizacao: ["localizacao", "location", "cidade", "estado", "pais", "endereco"],
};

const KICKOFF_FIELD_ALIASES: Record<keyof KickoffData, string[]> = {
  responsavel: ["responsavel", "nome_responsavel", "nome_do_responsavel"],
  nicho: ["nicho_kickoff", "nicho"],
  investimento: ["investimento_kickoff", "investimento", "investimento_mensal"],
  historia_empresa: ["historia_empresa", "historia", "historia_da_empresa"],
  servico: ["servico", "servico_oferecido", "produto_servico"],
  objetivo_trafego: ["objetivo_trafego", "objetivo", "objetivo_com_trafego"],
  fluxo_vendas: ["fluxo_vendas", "fluxo_de_vendas", "experiencia_trafego"],
  diferencial: ["diferencial", "diferencial_competitivo"],
  desafios: ["desafios", "desafios_atuais"],
  genero: ["genero", "genero_ideal"],
  idade: ["idade", "faixa_etaria"],
  cliente_ideal: ["cliente_ideal", "avatar_cliente", "publico_ideal"],
  dificuldade: ["dificuldade", "principal_dificuldade"],
};

const IGNORED_CELL_VALUES = new Set(["-", "--", "n/a", "na", "null", "undefined", "não informado", "nao informado"]);

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  if (IGNORED_CELL_VALUES.has(normalized.toLowerCase())) return "";
  return normalized;
};

const normalizeClientName = (value: string) => normalizeHeader(value).replace(/_/g, "");

const getFirstValue = (row: CsvRow, aliases: string[]): string => {
  for (const alias of aliases) {
    const value = normalizeCell(row[normalizeHeader(alias)]);
    if (value) return value;
  }
  return "";
};

const hasKickoffData = (kickoffData: KickoffData) =>
  Object.values(kickoffData).some((value) => value.trim().length > 0);

const renderKickoffMarkdown = (clientName: string, kickoffData: KickoffData) => {
  const replacements: Record<string, string> = {
    client_name: clientName,
    ...kickoffData,
  };

  return KICKOFF_TEMPLATE.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    return replacements[key]?.trim() || "";
  });
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
};

export const ImportarClientesModal = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: ImportarClientesModalProps) => {
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const { toast } = useToast();

  const processarCSV = (texto: string) => {
    const parsed = Papa.parse<Record<string, unknown>>(texto, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      delimitersToGuess: [",", ";", "\t", "|"],
    });

    if (parsed.errors.length > 0) {
      const formatted = parsed.errors
        .slice(0, 3)
        .map((e) => `linha ${e.row}: ${e.message}`)
        .join(" | ");
      throw new Error(`CSV inválido: ${formatted}`);
    }

    return parsed.data.map((row) => {
      const normalizedRow: CsvRow = {};
      Object.entries(row).forEach(([key, value]) => {
        normalizedRow[normalizeHeader(key)] = normalizeCell(value);
      });
      return normalizedRow;
    });
  };

  const encontrarClientePorNome = (nome: string, clientes: ClientLookup[]) => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return null;

    const exact = clientes.find((cliente) => cliente.nome.trim().toLowerCase() === nomeLimpo.toLowerCase());
    if (exact) return exact;

    const normalizedTarget = normalizeClientName(nomeLimpo);
    if (!normalizedTarget) return null;

    const normalizedExact = clientes.find(
      (cliente) => normalizeClientName(cliente.nome) === normalizedTarget
    );
    if (normalizedExact) return normalizedExact;

    if (normalizedTarget.length >= 6) {
      const fuzzy = clientes.find((cliente) => {
        const normalizedClientName = normalizeClientName(cliente.nome);
        return (
          normalizedClientName.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedClientName)
        );
      });
      if (fuzzy) return fuzzy;
    }

    return null;
  };

  const montarUpdateCliente = (row: CsvRow) => {
    const payload: Record<string, string> = {};

    Object.entries(CLIENT_TEXT_FIELD_ALIASES).forEach(([field, aliases]) => {
      const value = getFirstValue(row, aliases);
      if (value) payload[field] = value;
    });

    return payload;
  };

  const montarKickoffData = (
    row: CsvRow,
    taskContent: string,
    fallbackNicho: string,
    fallbackInvestimento: string
  ): KickoffData => {
    const kickoffData = { ...EMPTY_KICKOFF_DATA };

    (Object.keys(KICKOFF_FIELD_ALIASES) as Array<keyof KickoffData>).forEach((field) => {
      kickoffData[field] = getFirstValue(row, KICKOFF_FIELD_ALIASES[field]);
    });

    if (!kickoffData.nicho && fallbackNicho) {
      kickoffData.nicho = fallbackNicho;
    }

    if (!kickoffData.investimento && fallbackInvestimento) {
      kickoffData.investimento = fallbackInvestimento;
    }

    if (taskContent) {
      if (!kickoffData.historia_empresa) {
        kickoffData.historia_empresa = taskContent;
      } else {
        kickoffData.desafios = kickoffData.desafios
          ? `${kickoffData.desafios}\n\n${taskContent}`
          : taskContent;
      }
    }

    return kickoffData;
  };

  const salvarKickoff = async (clienteId: string, clienteNome: string, kickoffData: KickoffData, userId: string) => {
    let kickoffId: string;

    const { data: kickoffExistente, error: kickoffExistenteError } = await supabase
      .from("kickoffs")
      .select("id")
      .eq("client_id", clienteId)
      .maybeSingle();

    if (kickoffExistenteError && kickoffExistenteError.code !== "PGRST116") {
      throw kickoffExistenteError;
    }

    if (kickoffExistente?.id) {
      kickoffId = kickoffExistente.id;
    } else {
      const { data: novoKickoff, error: novoKickoffError } = await supabase
        .from("kickoffs")
        .insert({
          client_id: clienteId,
          created_by: userId,
        })
        .select("id")
        .single();

      if (novoKickoffError) throw novoKickoffError;
      kickoffId = novoKickoff.id;
    }

    const { data: ultimaVersao, error: ultimaVersaoError } = await supabase
      .from("kickoff_content")
      .select("version")
      .eq("kickoff_id", kickoffId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimaVersaoError && ultimaVersaoError.code !== "PGRST116") {
      throw ultimaVersaoError;
    }

    const nextVersion = (ultimaVersao?.version || 0) + 1;
    const markdown = renderKickoffMarkdown(clienteNome, kickoffData);

    const { error: insertError } = await supabase
      .from("kickoff_content")
      .insert({
        kickoff_id: kickoffId,
        content_md: markdown,
        version: nextVersion,
        created_by: userId,
      });

    if (insertError) throw insertError;
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Por favor, cole os dados CSV para importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setImportLog([]);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const rows = processarCSV(csvData);

      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nome")
        .is("deleted_at", null);

      if (clientesError) throw clientesError;
      const clientesIndex = (clientesData || []) as ClientLookup[];

      if (rows.length === 0) {
        throw new Error("Nenhuma linha válida encontrada no CSV.");
      }

      let clientesAtualizados = 0;
      let kickoffsAtualizados = 0;
      let linhasIgnoradas = 0;
      const warnings: string[] = [];

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const linha = i + 2;

        try {
          const nomeCliente = getFirstValue(row, CLIENT_NAME_ALIASES);
          if (!nomeCliente) {
            linhasIgnoradas += 1;
            warnings.push(`Linha ${linha}: sem nome do cliente.`);
            continue;
          }

          const cliente = encontrarClientePorNome(nomeCliente, clientesIndex);
          if (!cliente) {
            linhasIgnoradas += 1;
            warnings.push(`Linha ${linha}: cliente "${nomeCliente}" não encontrado.`);
            continue;
          }

          const updatePayload = montarUpdateCliente(row);
          if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabase
              .from("clientes")
              .update(updatePayload)
              .eq("id", cliente.id);

            if (updateError) throw updateError;
            clientesAtualizados += 1;
          }

          const taskContent = getFirstValue(row, TASK_CONTENT_ALIASES);
          const kickoffData = montarKickoffData(
            row,
            taskContent,
            updatePayload.nicho || "",
            updatePayload.investimento_mensal || ""
          );

          if (hasKickoffData(kickoffData)) {
            await salvarKickoff(cliente.id, cliente.nome, kickoffData, user.id);
            kickoffsAtualizados += 1;
          }

          if (Object.keys(updatePayload).length === 0 && !hasKickoffData(kickoffData)) {
            linhasIgnoradas += 1;
            warnings.push(`Linha ${linha}: sem campos mapeáveis para "${nomeCliente}".`);
          }
        } catch (rowError: unknown) {
          linhasIgnoradas += 1;
          warnings.push(`Linha ${linha}: ${getErrorMessage(rowError)}.`);
        }
      }

      toast({
        title: "Importação concluída",
        description: `${clientesAtualizados} cliente(s) atualizado(s), ${kickoffsAtualizados} kickoff(s) preenchido(s), ${linhasIgnoradas} linha(s) ignorada(s).`,
      });

      setImportLog(warnings);
      onSuccess();
      if (warnings.length === 0) {
        onOpenChange(false);
        setCsvData('');
      }
    } catch (error: unknown) {
      console.error('Erro ao importar clientes:', error);
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Erro na importação",
        description: errorMessage,
        variant: "destructive",
      });
      setImportLog([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const exemploCSV = `nome,descricao_breve,investimento_mensal,promessas_cliente,whatsapp_cliente,instagram_cliente,localizacao,task_content
"Cliente Exemplo","Especialista em mentoria para carreira","R$ 8.000","Escalar captação e previsibilidade","11999999999","https://instagram.com/cliente","São Paulo - BR","História da empresa, desafios atuais e contexto do cliente para kickoff."`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-primary" />
            <DialogTitle>Importar Dados de Clientes via CSV</DialogTitle>
          </div>
          <DialogDescription>
            Atualize os dados textuais de clientes existentes e envie o `task content` para o kickoff.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Regras desta importação:</strong> o nome é usado apenas para localizar o cliente. Não alteramos nome, categoria, série, status ou outros campos de dropdown.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-data">Dados CSV</Label>
            <Textarea
              id="csv-data"
              placeholder="Cole aqui os dados CSV..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Exemplo de formato CSV:</span>
            </Label>
            <div className="bg-muted p-3 rounded-md">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {exemploCSV}
              </pre>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Colunas aceitas (principais):</strong> nome*, task_content, descricao_breve, investimento_mensal, promessas_cliente, whatsapp_cliente, instagram_cliente, localizacao, nicho, observacoes, pasta_drive_url, link_painel.
              <br />
              <small>* O campo nome é obrigatório para localizar o cliente.</small>
            </AlertDescription>
          </Alert>

          {importLog.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {importLog.slice(0, 10).map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Importando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Importar Clientes</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
