import {
  parseISO,
  format,
  isToday as isTodayDateFns,
  isTomorrow,
  isYesterday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Parses a Postgres timestamp ("2026-02-04 14:41:29.882+00") or
 * date-only ("2026-02-04") to a local Date object.
 * To avoid timezone shifting for date-only strings, we append T00:00:00.
 */
export function parseToLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // If it's a date-only string (YYYY-MM-DD), force it to local midnight
  if (value.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  // Otherwise, use date-fns parseISO to handle the full timestamp
  return parseISO(value);
}

export function toLocalDateString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : parseToLocalDate(value);
  if (!date) return null;
  return format(date, "yyyy-MM-dd");
}

export function isToday(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : parseToLocalDate(value);
  if (!date) return false;
  return isTodayDateFns(date);
}

export function formatDateFriendly(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : parseToLocalDate(value);
  if (!date) return "";

  if (isTodayDateFns(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  if (isYesterday(date)) return "Ontem";

  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function isOverdue(dateValue: string | Date | null | undefined, completed: boolean): boolean {
  if (completed || !dateValue) return false;
  const date = dateValue instanceof Date ? dateValue : parseToLocalDate(dateValue);
  if (!date) return false;

  const todayStr = toLocalDateString(new Date());
  const dateStr = toLocalDateString(date);

  // if both string forms are valid, compare strings
  if (!todayStr || !dateStr) return false;

  return dateStr < todayStr;
}

export type DateRangePreset = "all" | "today" | "week" | "month" | "overdue" | "custom";

export function isInDateRange(
  dateValue: string | Date | null | undefined,
  range: DateRangePreset,
  completed: boolean = false,
  customStart?: Date | null,
  customEnd?: Date | null
): boolean {
  if (range === "all") return true;

  const date = dateValue instanceof Date ? dateValue : parseToLocalDate(dateValue);

  if (range === "overdue") {
    return isOverdue(date, completed);
  }

  // If we need a date but don't have one
  if (!date) {
    return false;
  }

  const today = new Date();

  switch (range) {
    case "today":
      return isTodayDateFns(date);
    case "week": {
      const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(today, { weekStartsOn: 1 });
      return isWithinInterval(date, { start: startOfDay(start), end: endOfDay(end) });
    }
    case "month": {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return isWithinInterval(date, { start: startOfDay(start), end: endOfDay(end) });
    }
    case "custom": {
      if (!customStart || !customEnd) return true;
      return isWithinInterval(date, { start: startOfDay(customStart), end: endOfDay(customEnd) });
    }
    default:
      return true;
  }
}

export function calcularDiasParaAniversario(dataNascimento: string | Date | null | undefined): number | null {
  if (!dataNascimento) return null;
  const hoje = startOfDay(new Date());
  const dataNasc = dataNascimento instanceof Date ? dataNascimento : parseToLocalDate(dataNascimento);

  if (!dataNasc) return null;

  const dataAniversarioEsteAno = new Date(hoje.getFullYear(), dataNasc.getMonth(), dataNasc.getDate());

  if (dataAniversarioEsteAno < hoje) {
    dataAniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
  }

  const diferencaTempo = dataAniversarioEsteAno.getTime() - hoje.getTime();
  const diferencaDias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

  return diferencaDias;
}

export function formatarAniversario(dataNascimento: string | Date | null | undefined): string {
  if (!dataNascimento) return "";
  const data = dataNascimento instanceof Date ? dataNascimento : parseToLocalDate(dataNascimento);
  if (!data) return "";
  return format(data, "dd/MM");
}

export function formatarNivelAcesso(nivel: string | null | undefined): string {
  if (!nivel) return "";
  const dict: Record<string, string> = {
    admin: "Admin",
    gestor_trafego: "Gestor de Tráfego",
    cs: "CS / Atendimento",
    designer: "Designer",
    webdesigner: "Web Designer",
    editor_video: "Editor de Vídeo",
    gestor_projetos: "Gestor de Projetos",
    dono: "Dono"
  };
  return dict[nivel] || nivel.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
