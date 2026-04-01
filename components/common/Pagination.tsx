"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  onPageChange: (page: number) => void;
  mobileLoadMore?: boolean;
}

export function Pagination({
  pagina,
  totalPaginas,
  onPageChange,
  mobileLoadMore = false,
}: PaginationProps) {
  if (totalPaginas <= 1) return null;

  return (
    <>
      {/* Desktop (ou único se mobileLoadMore=false) */}
      <div
        className={`${mobileLoadMore ? "hidden md:flex" : "flex"} items-center justify-center gap-2 pt-4`}
      >
        <Button
          variant="outline"
          size="icon-sm"
          disabled={pagina <= 1}
          onClick={() => onPageChange(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onPageChange(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile: botão "Carregar mais" */}
      {mobileLoadMore && pagina < totalPaginas && (
        <div className="flex md:hidden justify-center pt-4">
          <Button variant="outline" onClick={() => onPageChange(pagina + 1)}>
            Carregar mais
          </Button>
        </div>
      )}
    </>
  );
}
