/**
 * Formata data relativa em português (ex: "agora", "5min atrás", "3h atrás", "2d atrás").
 */
export function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const target = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const diffMs = now - target;
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;

  return new Date(target).toLocaleDateString("pt-BR");
}

/**
 * Converte string ISO curta (yyyy-mm-dd) para Date no horário local.
 * Usa meio-dia para evitar deslocamentos de timezone/DST em data-only.
 */
export function parseDateOnlyLocal(value: string): Date {
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    throw new Error("Data inválida no formato yyyy-mm-dd");
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Retorna data local no formato yyyy-mm-dd para inputs type=date.
 */
export function toDateInputValueLocal(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formata data no padrão brasileiro curto: dd/mm/aaaa.
 */
export function formatDateBR(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata data e hora no padrão brasileiro: dd/mm/aaaa, HH:mm.
 */
export function formatDateTimeBR(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata data por extenso: dd de mês de aaaa, HH:mm.
 */
export function formatDateLongBR(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
