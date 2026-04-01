import { requireAuth } from "@/lib/auth-guard";
import { AppLayout } from "@/components/layout/AppLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  const { perfil, nome, id: userId } = user;

  return (
    <AppLayout perfil={perfil} userName={nome} userId={userId} pageTitle="SIMAP">
      {children}
    </AppLayout>
  );
}
