import { requireAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { PerfisAdmin } from "@/components/views/PerfisAdmin";

export default async function PerfisPage() {
  const user = await requireAuth();

  // Only GESTOR_ADMIN can manage profiles
  if (user.perfil !== "GESTOR_ADMIN") {
    redirect("/admin/unidades");
  }

  return <PerfisAdmin />;
}
