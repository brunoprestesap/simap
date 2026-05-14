import { CheckCircle2, XCircle, Database, Search } from "lucide-react";
import {
  describeSicamOracleConfigForUi,
  describeSicamObject,
  listSicamObjects,
  pingSicam,
  type SicamColumnSummary,
  type SicamHealth,
  type SicamObjectSummary,
  type SicamObjectType,
} from "@/lib/sicam-oracle";
import { isSafeOracleIdentifier } from "@/lib/sicam-oracle/identifier";
import { requireAuth } from "@/lib/auth-guard";
import { listarHistoricoSincronizacoesSicam } from "@/server/queries/sicam-sync";
import type { SicamSyncHistoricoItem } from "@/server/queries/sicam-sync";
import { SicamSyncPanel } from "@/components/views/SicamSyncPanel";
import { formatDateBR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SicamAdminPageProps {
  searchParams: Promise<{
    q?: string;
    table?: string;
    owner?: string;
    type?: string;
  }>;
}

type ObjectTypeFilter = SicamObjectType | "ALL";

function parseObjectType(raw: string | undefined): ObjectTypeFilter {
  if (raw === "TABLE" || raw === "VIEW") return raw;
  return "ALL";
}

export default async function SicamAdminPage({
  searchParams,
}: SicamAdminPageProps) {
  const user = await requireAuth();
  const sp = await searchParams;
  const search = sp.q?.trim() ?? "";
  const objectType = parseObjectType(sp.type?.trim().toUpperCase());
  const selectedRaw = sp.table?.trim().toUpperCase() ?? "";
  const selectedObject = isSafeOracleIdentifier(selectedRaw) ? selectedRaw : "";
  const selectedOwnerRaw = sp.owner?.trim().toUpperCase() ?? "";
  const selectedOwner = isSafeOracleIdentifier(selectedOwnerRaw)
    ? selectedOwnerRaw
    : "";

  const configSummary = describeSicamOracleConfigForUi();

  if (!configSummary.configured) {
    return <NotConfiguredState missingVars={configSummary.missingVars} />;
  }

  // Probe + listagem + histórico em paralelo. Erros de listagem viram array vazio +
  // o ping captura o estado real de saúde, então não quebram a página.
  const [health, objects, columns, historicoSync] = await Promise.all([
    pingSicam(),
    safeListObjects(search, objectType),
    selectedObject
      ? safeDescribeObject(selectedObject, selectedOwner || undefined)
      : Promise.resolve<SicamColumnSummary[]>([]),
    safeListarHistoricoSync(),
  ]);

  const podeIniciarSync = user.perfil === "GESTOR_ADMIN";

  return (
    <div className="space-y-6">
      <ConnectionStatusCard health={health} config={configSummary} />

      <SicamSyncPanel
        podeIniciar={podeIniciarSync}
        conexaoOk={health.ok}
      />




      {historicoSync.length > 0 && (
        <HistoricoSyncSection items={historicoSync} />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <ObjectsPanel
          search={search}
          objectType={objectType}
          objects={objects}
          health={health}
        />
        <ColumnsPanel
          objectName={selectedObject}
          owner={selectedOwner}
          columns={columns}
        />
      </div>
    </div>
  );
}

async function safeListarHistoricoSync(): Promise<SicamSyncHistoricoItem[]> {
  try {
    return await listarHistoricoSincronizacoesSicam(10);
  } catch {
    return [];
  }
}

async function safeListObjects(
  search: string,
  objectType: ObjectTypeFilter,
): Promise<SicamObjectSummary[]> {
  try {
    return await listSicamObjects({ search, objectType });
  } catch {
    return [];
  }
}

async function safeDescribeObject(
  name: string,
  owner: string | undefined,
): Promise<SicamColumnSummary[]> {
  try {
    return await describeSicamObject(name, owner);
  } catch {
    return [];
  }
}

function NotConfiguredState({ missingVars }: { missingVars: string[] }) {
  const allVars = ["SICAM_ORACLE_USER", "SICAM_ORACLE_PASSWORD", "SICAM_ORACLE_CONNECT_STRING"];
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            SICAM Oracle não configurado
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina as variáveis de ambiente abaixo no secret{" "}
            <code>APP_ENV_FILE</code> (GitHub Actions) e faça um novo deploy.
          </p>
          <ul className="mt-3 space-y-1.5">
            {allVars.map((v) => {
              const missing = missingVars.includes(v);
              return (
                <li key={v} className="flex items-center gap-2 text-xs">
                  {missing ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-jf-green" />
                  )}
                  <code className={missing ? "text-destructive" : "text-foreground"}>
                    {v}
                  </code>
                  {missing && (
                    <span className="text-muted-foreground">— ausente</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Formato Easy Connect:{" "}
            <code>host:porta/servicename</code> — opcionalmente defina{" "}
            <code>SICAM_ORACLE_SCHEMA_OWNER</code> para filtrar as tabelas
            listadas.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConnectionStatusCard({
  health,
  config,
}: {
  health: SicamHealth;
  config: Extract<ReturnType<typeof describeSicamOracleConfigForUi>, { configured: true }>;
}) {
  const ok = health.ok;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-jf-green" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            {ok ? "Conexão SICAM Oracle ativa" : "Falha ao conectar no SICAM Oracle"}
          </h3>
          {ok ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Latência {health.latencyMs}ms
              {health.serverVersion ? ` • ${health.serverVersion}` : ""}
            </p>
          ) : (
            <p
              className="mt-1 wrap-break-word text-xs text-destructive"
              data-ora-code={health.oraCode ?? undefined}
            >
              {health.error}
              {health.oraCode ? ` (ORA-${String(health.oraCode).padStart(5, "0")})` : ""}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
        <ConfigField label="Usuário" value={config.user ?? "—"} />
        <ConfigField label="Connect String" value={config.connectString ?? "—"} />
        <ConfigField
          label="Schema (filtro)"
          value={config.schemaOwner ?? "todos"}
        />
        <ConfigField
          label="Pool"
          value={`${config.poolMin ?? "?"}–${config.poolMax ?? "?"} conexões`}
        />
        <ConfigField
          label="Driver"
          value={
            config.driverMode === "thick"
              ? `Thick (${config.instantClientDir ?? "?"})`
              : "Thin"
          }
        />
        {config.driverMode === "thick" && (
          <ConfigField
            label="TNS Config Dir"
            value={config.configDir ?? "<TNS_ADMIN do sistema>"}
          />
        )}
      </dl>
    </div>
  );
}

const SYNC_STATUS_LABEL: Record<SicamSyncHistoricoItem["status"], string> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ERRO: "Erro",
};

const SYNC_STATUS_COLOR: Record<SicamSyncHistoricoItem["status"], string> = {
  EM_ANDAMENTO: "bg-jf-warning/15 text-jf-warning",
  CONCLUIDA: "bg-jf-green/15 text-jf-green",
  ERRO: "bg-destructive/15 text-destructive",
};

function HistoricoSyncSection({ items }: { items: SicamSyncHistoricoItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Últimas sincronizações
      </p>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                {formatDateBR(item.createdAt)}
                <span className="ml-2 text-xs text-muted-foreground">
                  por {item.iniciadoPor.nome} ({item.iniciadoPor.matricula})
                </span>
              </p>
              {item.status === "ERRO" && item.mensagemErro && (
                <p className="mt-0.5 wrap-break-word text-xs text-destructive">
                  {item.mensagemErro}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">
                {item.totalProcessados.toLocaleString("pt-BR")} processados ·{" "}
                <span className="text-jf-green">+{item.novos}</span> ·{" "}
                <span className="text-primary">↻{item.atualizados}</span>
                {item.erros > 0 && (
                  <>
                    {" · "}
                    <span className="text-destructive">!{item.erros}</span>
                  </>
                )}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SYNC_STATUS_COLOR[item.status]}`}
              >
                {SYNC_STATUS_LABEL[item.status]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfigField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-mono text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}

const TYPE_TABS: { value: ObjectTypeFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "TABLE", label: "Tabelas" },
  { value: "VIEW", label: "Views" },
];

function ObjectsPanel({
  search,
  objectType,
  objects,
  health,
}: {
  search: string;
  objectType: ObjectTypeFilter;
  objects: SicamObjectSummary[];
  health: SicamHealth;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Objetos no Oracle
        </h3>
        <span className="text-xs text-muted-foreground">
          {objects.length} resultado{objects.length === 1 ? "" : "s"}
        </span>
      </div>

      <form action="/admin/sicam" method="get" className="mb-3 space-y-2">
        <div role="tablist" className="flex gap-1 text-xs">
          {TYPE_TABS.map((tab) => {
            const params = new URLSearchParams();
            if (search) params.set("q", search);
            if (tab.value !== "ALL") params.set("type", tab.value);
            return (
              <a
                key={tab.value}
                role="tab"
                aria-selected={objectType === tab.value}
                href={`/admin/sicam${params.toString() ? `?${params}` : ""}`}
                className="rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-accent aria-selected:bg-primary/10 aria-selected:text-primary"
              >
                {tab.label}
              </a>
            );
          })}
        </div>

        <label htmlFor="sicam-object-search" className="sr-only">
          Buscar objeto
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="sicam-object-search"
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Filtrar por nome…"
            autoComplete="off"
            className="h-9 w-full rounded-md border border-input bg-background pl-7 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {/* preserva o tipo selecionado ao submeter via Enter no input de busca */}
          {objectType !== "ALL" && (
            <input type="hidden" name="type" value={objectType} />
          )}
        </div>
      </form>

      {!health.ok ? (
        <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
          Resolva o problema de conexão acima para listar os objetos.
        </p>
      ) : objects.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
          Nenhum objeto encontrado
          {search ? ` para "${search}"` : ""}.
        </p>
      ) : (
        <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
          {objects.map((o) => {
            const params = new URLSearchParams();
            params.set("table", o.objectName);
            params.set("owner", o.owner);
            if (search) params.set("q", search);
            if (objectType !== "ALL") params.set("type", objectType);
            return (
              <li key={`${o.owner}.${o.objectName}.${o.objectType}`}>
                <a
                  href={`/admin/sicam?${params.toString()}`}
                  className="flex items-center justify-between gap-2 px-2 py-2 text-xs hover:bg-accent"
                >
                  <span className="flex flex-col">
                    <span className="font-mono text-foreground">{o.objectName}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {o.owner} · {o.objectType === "VIEW" ? "view" : "tabela"}
                    </span>
                  </span>
                  {o.numRows !== null && (
                    <span className="shrink-0 text-muted-foreground">
                      ~{o.numRows.toLocaleString("pt-BR")} linhas
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ColumnsPanel({
  objectName,
  owner,
  columns,
}: {
  objectName: string;
  owner: string;
  columns: SicamColumnSummary[];
}) {
  if (!objectName) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6">
        <p className="text-center text-xs text-muted-foreground">
          Selecione um objeto à esquerda para inspecionar suas colunas.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-mono text-sm font-semibold text-foreground">
          {owner ? `${owner}.${objectName}` : objectName}
        </h3>
        <span className="text-xs text-muted-foreground">
          {columns.length} coluna{columns.length === 1 ? "" : "s"}
        </span>
      </div>

      {columns.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
          Objeto vazio, sem permissão de leitura, ou nome inválido.
        </p>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Coluna</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 font-medium">Nulo?</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((c) => (
                <tr key={c.columnName} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                    {c.columnId}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-foreground">
                    {c.columnName}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                    {c.dataType}
                    {c.dataLength ? `(${c.dataLength})` : ""}
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    {c.nullable ? "sim" : "não"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


