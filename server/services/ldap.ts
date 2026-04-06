import { prisma } from "@/lib/prisma";
import {
  findDirectoryEmailByMatricula,
  getLdapBindConfig,
  isLdapConfigured,
} from "@/lib/ldap";

function normalizeMatricula(matricula: string): string {
  return matricula.trim().toUpperCase();
}

/**
 * Busca e-mail de um servidor pela matrícula.
 * Com LDAP configurado, consulta o diretório; senão (ou se não houver mail), usa o banco.
 */
export async function buscarEmailPorMatricula(
  matricula: string,
): Promise<string | null> {
  const key = normalizeMatricula(matricula);

  if (isLdapConfigured() && getLdapBindConfig()) {
    const fromDirectory = await findDirectoryEmailByMatricula(key);
    if (fromDirectory) return fromDirectory;
  }

  const servidor = await prisma.servidor.findUnique({
    where: { matricula: key },
    select: { email: true },
  });
  return servidor?.email ?? null;
}

/**
 * Busca e-mails de múltiplos servidores; LDAP quando disponível, com fallback ao banco.
 */
export async function buscarEmailsPorMatriculas(
  matriculas: string[],
): Promise<Map<string, string>> {
  if (matriculas.length === 0) return new Map();

  const normalized = [...new Set(matriculas.map(normalizeMatricula))];
  const result = new Map<string, string>();

  if (isLdapConfigured() && getLdapBindConfig()) {
    for (const m of normalized) {
      const mail = await findDirectoryEmailByMatricula(m);
      if (mail) result.set(m, mail);
    }
  }

  const stillMissing = normalized.filter((m) => !result.has(m));
  if (stillMissing.length === 0) return result;

  const servidores = await prisma.servidor.findMany({
    where: { matricula: { in: stillMissing } },
    select: { matricula: true, email: true },
  });

  for (const s of servidores) {
    if (s.email) result.set(s.matricula, s.email);
  }

  return result;
}
