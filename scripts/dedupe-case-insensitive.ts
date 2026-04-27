import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

async function dedupeUnidades() {
  const unidades = await prisma.unidade.findMany({
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof unidades>();
  for (const unidade of unidades) {
    const key = normalizeText(unidade.descricao);
    const arr = groups.get(key) ?? [];
    arr.push(unidade);
    groups.set(key, arr);
  }

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    const canonical = group[0];
    const duplicates = group.slice(1);

    for (const duplicate of duplicates) {
      await prisma.$transaction(async (tx) => {
        await tx.setor.updateMany({
          where: { unidadeId: duplicate.id },
          data: { unidadeId: canonical.id },
        });
        await tx.usuario.updateMany({
          where: { unidadeId: duplicate.id },
          data: { unidadeId: canonical.id },
        });
        await tx.tombo.updateMany({
          where: { unidadeId: duplicate.id },
          data: { unidadeId: canonical.id },
        });
        await tx.movimentacao.updateMany({
          where: { unidadeOrigemId: duplicate.id },
          data: { unidadeOrigemId: canonical.id },
        });
        await tx.movimentacao.updateMany({
          where: { unidadeDestinoId: duplicate.id },
          data: { unidadeDestinoId: canonical.id },
        });
        await tx.unidade.delete({ where: { id: duplicate.id } });
      });
    }
  }
}

async function dedupeSetoresByUnidade() {
  const setores = await prisma.setor.findMany({
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof setores>();
  for (const setor of setores) {
    const key = `${setor.unidadeId}::${normalizeCode(setor.codigo)}`;
    const arr = groups.get(key) ?? [];
    arr.push(setor);
    groups.set(key, arr);
  }

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    const canonical = group[0];
    const duplicates = group.slice(1);

    for (const duplicate of duplicates) {
      await prisma.$transaction(async (tx) => {
        await tx.tombo.updateMany({
          where: { setorId: duplicate.id },
          data: { setorId: canonical.id },
        });
        await tx.usuario.updateMany({
          where: { setorId: duplicate.id },
          data: { setorId: canonical.id },
        });
        await tx.movimentacao.updateMany({
          where: { setorOrigemId: duplicate.id },
          data: { setorOrigemId: canonical.id },
        });
        await tx.movimentacao.updateMany({
          where: { setorDestinoId: duplicate.id },
          data: { setorDestinoId: canonical.id },
        });
        await tx.setor.delete({ where: { id: duplicate.id } });
      });
    }
  }

  const byName = new Map<string, typeof setores>();
  for (const setor of setores) {
    const key = `${setor.unidadeId}::${normalizeText(setor.nome)}`;
    const arr = byName.get(key) ?? [];
    arr.push(setor);
    byName.set(key, arr);
  }

  for (const [, group] of byName) {
    if (group.length <= 1) continue;
    const canonical = group[0];
    const duplicates = group.slice(1);
    for (const duplicate of duplicates) {
      if (duplicate.id === canonical.id) continue;
      const exists = await prisma.setor.findUnique({ where: { id: duplicate.id } });
      if (!exists) continue;
      await prisma.$transaction(async (tx) => {
        await tx.tombo.updateMany({
          where: { setorId: duplicate.id },
          data: { setorId: canonical.id },
        });
        await tx.usuario.updateMany({
          where: { setorId: duplicate.id },
          data: { setorId: canonical.id },
        });
        await tx.movimentacao.updateMany({
          where: { setorOrigemId: duplicate.id },
          data: { setorOrigemId: canonical.id },
        });
        await tx.movimentacao.updateMany({
          where: { setorDestinoId: duplicate.id },
          data: { setorDestinoId: canonical.id },
        });
        await tx.setor.delete({ where: { id: duplicate.id } });
      });
    }
  }
}

async function normalizeRemainingFields() {
  const unidades = await prisma.unidade.findMany();
  for (const unidade of unidades) {
    await prisma.unidade.update({
      where: { id: unidade.id },
      data: {
        codigo: normalizeCode(unidade.codigo),
        descricao: unidade.descricao.trim().replace(/\s+/g, " "),
      },
    });
  }

  const setores = await prisma.setor.findMany();
  for (const setor of setores) {
    await prisma.setor.update({
      where: { id: setor.id },
      data: {
        codigo: normalizeCode(setor.codigo),
        nome: setor.nome.trim().replace(/\s+/g, " "),
      },
    });
  }
}

async function main() {
  await dedupeUnidades();
  await dedupeSetoresByUnidade();
  await normalizeRemainingFields();
  console.log("Saneamento concluído: unidades/setores deduplicados por case.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
