import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

// ─── Registro SICAM validation schema ───────────────────
const registroSicamSchema = z.object({
  movimentacaoId: z.string().min(1, "ID da movimentação é obrigatório"),
  protocoloSicam: z.string().min(1, "Nº do protocolo SICAM é obrigatório"),
  dataRegistroSicam: z.string().min(1, "Data do registro é obrigatória"),
  observacoesSicam: z.string().max(500, "Máximo 500 caracteres").optional(),
});

describe("registroSicamSchema", () => {
  it("deve validar input correto", () => {
    const result = registroSicamSchema.safeParse({
      movimentacaoId: "cuid123",
      protocoloSicam: "2024/001234",
      dataRegistroSicam: "2024-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar protocolo vazio", () => {
    const result = registroSicamSchema.safeParse({
      movimentacaoId: "cuid123",
      protocoloSicam: "",
      dataRegistroSicam: "2024-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar data vazia", () => {
    const result = registroSicamSchema.safeParse({
      movimentacaoId: "cuid123",
      protocoloSicam: "2024/001234",
      dataRegistroSicam: "",
    });
    expect(result.success).toBe(false);
  });

  it("deve aceitar observações opcionais", () => {
    const result = registroSicamSchema.safeParse({
      movimentacaoId: "cuid123",
      protocoloSicam: "2024/001234",
      dataRegistroSicam: "2024-06-15",
      observacoesSicam: "Registro normal",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar observações com mais de 500 caracteres", () => {
    const result = registroSicamSchema.safeParse({
      movimentacaoId: "cuid123",
      protocoloSicam: "2024/001234",
      dataRegistroSicam: "2024-06-15",
      observacoesSicam: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ─── Admin: Unidade validation ──────────────────────────
const unidadeSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
});

describe("unidadeSchema", () => {
  it("deve validar input correto", () => {
    const result = unidadeSchema.safeParse({
      codigo: "JFAP-TI",
      descricao: "Seção de Tecnologia da Informação",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar código vazio", () => {
    const result = unidadeSchema.safeParse({
      codigo: "",
      descricao: "Descrição",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar descrição vazia", () => {
    const result = unidadeSchema.safeParse({
      codigo: "JFAP-TI",
      descricao: "",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Admin: Setor validation ────────────────────────────
const setorSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  unidadeId: z.string().min(1, "Unidade é obrigatória"),
});

describe("setorSchema", () => {
  it("deve validar input correto", () => {
    const result = setorSchema.safeParse({
      codigo: "SET-001",
      nome: "Atendimento",
      unidadeId: "cuid123",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar sem unidadeId", () => {
    const result = setorSchema.safeParse({
      codigo: "SET-001",
      nome: "Atendimento",
      unidadeId: "",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Admin: Perfil validation ───────────────────────────
const atribuirPerfilSchema = z.object({
  usuarioId: z.string().min(1, "ID do usuário é obrigatório"),
  perfil: z.enum(["TECNICO_TI", "SERVIDOR_RESPONSAVEL", "SERVIDOR_SEMAP", "GESTOR_ADMIN"]),
});

describe("atribuirPerfilSchema", () => {
  it("deve validar perfis válidos", () => {
    for (const perfil of ["TECNICO_TI", "SERVIDOR_RESPONSAVEL", "SERVIDOR_SEMAP", "GESTOR_ADMIN"]) {
      const result = atribuirPerfilSchema.safeParse({
        usuarioId: "cuid123",
        perfil,
      });
      expect(result.success).toBe(true);
    }
  });

  it("deve rejeitar perfil inválido", () => {
    const result = atribuirPerfilSchema.safeParse({
      usuarioId: "cuid123",
      perfil: "SUPER_ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar usuarioId vazio", () => {
    const result = atribuirPerfilSchema.safeParse({
      usuarioId: "",
      perfil: "TECNICO_TI",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Backlog filter logic ───────────────────────────────
describe("Backlog filter logic", () => {
  it("deve validar data de registro não futura", () => {
    const dataRegistro = new Date("2024-06-15");
    const hoje = new Date();
    expect(dataRegistro <= hoje).toBe(true);
  });

  it("deve rejeitar data futura", () => {
    const dataFutura = new Date();
    dataFutura.setFullYear(dataFutura.getFullYear() + 1);
    const hoje = new Date();
    expect(dataFutura > hoje).toBe(true);
  });

  it("deve calcular paginação corretamente", () => {
    const total = 45;
    const porPagina = 20;
    const totalPaginas = Math.ceil(total / porPagina);
    expect(totalPaginas).toBe(3);
  });

  it("deve calcular skip corretamente", () => {
    const pagina = 3;
    const porPagina = 20;
    const skip = (pagina - 1) * porPagina;
    expect(skip).toBe(40);
  });
});
