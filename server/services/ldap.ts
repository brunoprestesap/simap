"use server";

import { prisma } from "@/lib/prisma";

/**
 * Busca e-mail de um servidor pela matrícula.
 * Em produção, consulta o LDAP/AD. Em dev, retorna o e-mail do banco.
 */
export async function buscarEmailPorMatricula(
  matricula: string,
): Promise<string | null> {
  // TODO: Implementar LDAP real quando servidor disponível
  // if (process.env.LDAP_URL) { return await ldapSearchEmail(matricula); }

  const servidor = await prisma.servidor.findUnique({
    where: { matricula },
    select: { email: true },
  });
  return servidor?.email ?? null;
}

/**
 * Busca e-mails de múltiplos servidores em uma única query.
 */
export async function buscarEmailsPorMatriculas(
  matriculas: string[],
): Promise<Map<string, string>> {
  if (matriculas.length === 0) return new Map();

  const servidores = await prisma.servidor.findMany({
    where: { matricula: { in: matriculas } },
    select: { matricula: true, email: true },
  });

  return new Map(
    servidores
      .filter((s) => s.email)
      .map((s) => [s.matricula, s.email!]),
  );
}
