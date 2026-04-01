import { getHomeByPerfil } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";

export default async function RootPage() {
  const user = await requireAuth();
  redirect(getHomeByPerfil(user.perfil));
}
