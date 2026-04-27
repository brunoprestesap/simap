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
 * Busca e-mail de um usuário (cadastro SIMAP) pela matrícula.
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

  const usuario = await prisma.usuario.findUnique({
    where: { matricula: key },
    select: { email: true },
  });
  return usuario?.email ?? null;
}

/**
 * Busca e-mails por matrícula; LDAP quando disponível, com fallback ao cadastro de usuário.
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

  const usuarios = await prisma.usuario.findMany({
    where: { matricula: { in: stillMissing } },
    select: { matricula: true, email: true },
  });

  for (const u of usuarios) {
    if (u.email) result.set(u.matricula, u.email);
  }

  return result;
}
