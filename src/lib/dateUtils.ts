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
 * To avoid timezone shifting for date-only strings, we append T12:00:00.
 */
export function parseToLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // If it's a date-only string (YYYY-MM-DD), force it to local midday to avoid TZ shifts
  if (value.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
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

/**
 * Returns the date of the Nth occurrence of a weekday in a given month.
 * weekPos: "1","2","3","4","last"
 * dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat
 */
function getNthWeekdayOfMonth(year: number, month: number, weekPos: string, dayOfWeek: number): Date | null {
  if (weekPos === "last") {
    // Find last occurrence: start from end of month and go back
    const lastDay = new Date(year, month + 1, 0); // last day of month
    const diff = (lastDay.getDay() - dayOfWeek + 7) % 7;
    const result = new Date(year, month, lastDay.getDate() - diff);
    return result.getMonth() === month ? result : null;
  }
  const n = parseInt(weekPos, 10);
  // Find the first occurrence of dayOfWeek in the month
  const firstDay = new Date(year, month, 1);
  const firstOccurrence = (dayOfWeek - firstDay.getDay() + 7) % 7;
  const date = 1 + firstOccurrence + (n - 1) * 7;
  const result = new Date(year, month, date);
  return result.getMonth() === month ? result : null;
}

export function isRecurringDate(
  candidateStr: string | Date | null | undefined,
  recurrence: string | null | undefined,
  baseDateStr: string | null | undefined
): boolean {
  if (!candidateStr || !baseDateStr || !recurrence || recurrence === "none") return false;

  const candidate = candidateStr instanceof Date ? candidateStr : parseToLocalDate(candidateStr);
  const baseDate = parseToLocalDate(baseDateStr);

  if (!candidate || !baseDate) return false;

  const candidateTimestamp = candidate.getTime();
  const baseTimestamp = baseDate.getTime();

  // Future dates only
  if (candidateTimestamp <= baseTimestamp) return false;

  if (recurrence === "daily") {
    // Standard daily recurrence skips weekends
    const dayOfWeek = candidate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    return true;
  }

  if (["weekly", "biweekly", "monthly", "semiannual", "yearly"].includes(recurrence)) {
    // Weekends skipped for all standard recurrences during generation,
    // so if the candidate is a weekend it shouldn't be valid
    const dayOfWeek = candidate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  }

  if (recurrence === "weekly") return diffDays % 7 === 0;
  if (recurrence === "biweekly") return diffDays % 14 === 0;

  const candidateYear = candidate.getFullYear();
  const candidateMonth = candidate.getMonth();
  const candidateD = candidate.getDate();

  const baseYear = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth();
  const baseD = baseDate.getDate();

  if (recurrence === "monthly") {
    return candidateD === baseD;
  }
  if (recurrence === "semiannual") {
    if (candidateD !== baseD) return false;
    const monthsDiff = (candidateYear - baseYear) * 12 + (candidateMonth - baseMonth);
    return monthsDiff % 6 === 0;
  }
  if (recurrence === "yearly") {
    return candidateD === baseD && candidateMonth === baseMonth;
  }

  // monthly_dow_{week}_{day} - e.g. monthly_dow_2_2 = 2nd Tuesday of each month
  if (recurrence.startsWith("monthly_dow_")) {
    const parts = recurrence.split("_");
    const weekPos = parts[2]; // "1","2","3","4","last"
    const targetDay = parseInt(parts[3] || "1", 10); // 0=Sun…6=Sat

    const monthsDiff = (candidateYear - baseYear) * 12 + (candidateMonth - baseMonth);
    if (monthsDiff <= 0) return false;

    const expected = getNthWeekdayOfMonth(candidateYear, candidateMonth, weekPos, targetDay);
    if (!expected) return false;
    return expected.getDate() === candidateD && expected.getMonth() === candidateMonth;
  }

  if (recurrence.startsWith("custom_weekly_")) {
    const daysStr = recurrence.replace("custom_weekly_", "");
    const targetDays = daysStr.split(",").map(Number);
    return targetDays.includes(candidate.getDay());
  }

  if (recurrence.startsWith("custom_")) {
    // custom_interval_amount_days?
    const parts = recurrence.split("_");
    if (parts.length >= 3) {
      const interval = parts[1]; // day, week, month, year
      const amount = parseInt(parts[2] || "1", 10);
      const days = parts[3] ? parts[3].split(",").map(Number) : null;

      if (interval === "day") {
        return diffDays % amount === 0;
      }
      if (interval === "week") {
        // Compare week boundaries
        const baseStart = startOfWeek(baseDate, { weekStartsOn: 1 }).getTime();
        const candStart = startOfWeek(candidate, { weekStartsOn: 1 }).getTime();
        const weeksApart = Math.round((candStart - baseStart) / (1000 * 3600 * 24 * 7));

        if (weeksApart % amount !== 0) return false;

        if (days && days.length > 0) {
          return days.includes(candidate.getDay());
        }
        return candidate.getDay() === baseDate.getDay();
      }
      if (interval === "month") {
        if (candidateD !== baseD) return false;
        const monthsDiff = (candidateYear - baseYear) * 12 + (candidateMonth - baseMonth);
        return monthsDiff % amount === 0;
      }
      if (interval === "year") {
        if (candidateD !== baseD || candidateMonth !== baseMonth) return false;
        return (candidateYear - baseYear) % amount === 0;
      }
    }
  }

  return false;
}
