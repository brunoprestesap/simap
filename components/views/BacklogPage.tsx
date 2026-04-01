"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { BacklogList } from "./BacklogList";
import { RegistroSicamSheet } from "./RegistroSicamSheet";
import type { listarBacklog } from "@/server/queries/backlog";

type MovimentacaoItem = Awaited<ReturnType<typeof listarBacklog>>["movimentacoes"][number];

export function BacklogPage() {
  const router = useRouter();
  const [selectedMov, setSelectedMov] = useState<MovimentacaoItem | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Backlog SEMAP</h2>
        <p className="text-sm text-muted-foreground">
          Movimentações pendentes de registro no SICAM
        </p>
      </div>

      <Suspense fallback={<div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />)}</div>}>
        <BacklogList onRegistrar={setSelectedMov} />
      </Suspense>

      {selectedMov && (
        <RegistroSicamSheet
          movimentacao={selectedMov}
          onClose={() => setSelectedMov(null)}
          onSuccess={() => {
            setSelectedMov(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
