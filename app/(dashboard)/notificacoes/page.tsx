import { requireAuth } from "@/lib/auth-guard";
import { NotificationList } from "@/components/views/NotificationList";

export default async function NotificacoesPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
        <p className="text-sm text-muted-foreground">
          Central de notificações do sistema
        </p>
      </div>
      <NotificationList userId={user.id} />
    </div>
  );
}
