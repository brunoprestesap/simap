/**
 * Reusable filter builders for Prisma queries.
 */
import { parseDateOnlyLocal } from "@/lib/format";

/**
 * Builds a case-insensitive search filter for multiple fields.
 */
export function buildSearchFilter(
  busca: string | undefined,
  fields: string[],
): Record<string, unknown> | undefined {
  if (!busca?.trim()) return undefined;
  return {
    OR: fields.map((field) => ({
      [field]: { contains: busca.trim(), mode: "insensitive" as const },
    })),
  };
}

/**
 * Builds a date range filter for createdAt.
 */
export function buildDateRangeFilter(
  inicio?: string,
  fim?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!inicio && !fim) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (inicio) {
    const start = parseDateOnlyLocal(inicio);
    start.setHours(0, 0, 0, 0);
    filter.gte = start;
  }
  if (fim) {
    const end = parseDateOnlyLocal(fim);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return filter;
}
