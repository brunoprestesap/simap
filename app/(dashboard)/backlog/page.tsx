import { requireRole } from "@/lib/auth-guard";
import { BacklogPage } from "@/components/views/BacklogPage";

export default async function BacklogServerPage() {
  await requireRole(["SERVIDOR_SEMAP", "GESTOR_ADMIN"]);

  return <BacklogPage />;
}
