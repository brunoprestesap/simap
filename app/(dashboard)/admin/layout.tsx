import { requireRole } from "@/lib/auth-guard";
import Link from "next/link";

const adminTabs = [
  { label: "Unidades", href: "/admin/unidades" },
  { label: "Setores", href: "/admin/setores" },
  { label: "Responsáveis", href: "/admin/responsaveis" },
  { label: "Perfis", href: "/admin/perfis" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Administração</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie unidades, setores, lotação de usuários e perfis de acesso
        </p>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {adminTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="shrink-0 rounded-t-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-b-2 border-transparent data-[active]:border-primary data-[active]:text-primary"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
