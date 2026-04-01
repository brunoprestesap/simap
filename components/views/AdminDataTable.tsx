"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  emptyMessage?: string;
}

export function AdminDataTable<T>({
  data,
  columns,
  getRowId,
  searchPlaceholder = "Buscar...",
  onSearch,
  onAdd,
  addLabel = "Novo",
  emptyMessage = "Nenhum registro encontrado.",
}: AdminDataTableProps<T>) {
  const [busca, setBusca] = useState("");

  function handleSearch(valor: string) {
    setBusca(valor);
    onSearch?.(valor);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {onSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        )}
        {onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            {addLabel}
          </Button>
        )}
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={`px-4 py-2 text-left font-medium text-muted-foreground ${col.className || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={getRowId(row)}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {columns.map((col, i) => (
                    <td key={i} className={`px-4 py-3 ${col.className || ""}`}>
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
