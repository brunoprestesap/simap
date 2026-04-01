import type { TipoNotificacao, PerfilUsuario, StatusMovimentacao } from "@/lib/generated/prisma/client";
import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Package,
} from "lucide-react";
import type { ElementType } from "react";

/** Ícone lucide para cada tipo de notificação. */
export const NOTIFICACAO_ICONS: Record<TipoNotificacao, ElementType> = {
  SAIDA_TOMBO: Package,
  ENTRADA_TOMBO: ArrowLeftRight,
  CONFIRMACAO_REALIZADA: CheckCircle2,
  REGISTRO_SICAM: ClipboardCheck,
  IMPORTACAO_CSV: FileSpreadsheet,
};

/** Labels legíveis para perfis de usuário. */
export const PERFIL_LABELS: Record<PerfilUsuario, string> = {
  TECNICO_TI: "Técnico TI",
  SERVIDOR_RESPONSAVEL: "Servidor Responsável",
  SERVIDOR_SEMAP: "Servidor SEMAP",
  GESTOR_ADMIN: "Gestor/Admin",
};

/** Cores de badge por perfil. */
export const PERFIL_COLORS: Record<PerfilUsuario, string> = {
  TECNICO_TI: "bg-primary/10 text-primary",
  SERVIDOR_RESPONSAVEL: "bg-jf-warning/15 text-jf-warning",
  SERVIDOR_SEMAP: "bg-secondary/10 text-secondary",
  GESTOR_ADMIN: "bg-destructive/10 text-destructive",
};

/** Configuração centralizada de status de movimentação. */
export const STATUS_CONFIG: Record<
  StatusMovimentacao,
  { label: string; className: string; order: number }
> = {
  PENDENTE_CONFIRMACAO: {
    label: "Pendente",
    className: "bg-jf-warning/15 text-jf-warning",
    order: 0,
  },
  CONFIRMADA_ORIGEM: {
    label: "Confirmada",
    className: "bg-primary/10 text-primary",
    order: 1,
  },
  REGISTRADA_SICAM: {
    label: "Registrada SICAM",
    className: "bg-secondary/10 text-secondary",
    order: 2,
  },
  NAO_CONFIRMADA: {
    label: "Não Confirmada",
    className: "bg-destructive/10 text-destructive",
    order: -1,
  },
};

/** Steps da timeline de movimentação (excluindo NAO_CONFIRMADA). */
export const TIMELINE_STEPS: {
  status: StatusMovimentacao;
  label: string;
  icon: ElementType;
}[] = [
  { status: "PENDENTE_CONFIRMACAO", label: "Registrada", icon: FileText },
  { status: "CONFIRMADA_ORIGEM", label: "Confirmada", icon: CheckCircle2 },
  { status: "REGISTRADA_SICAM", label: "Registrada SICAM", icon: ClipboardCheck },
];
