"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
}

export function useColumnResize(columns: readonly ColumnDef[]) {
  const [widths, setWidths] = useState<number[]>(() =>
    columns.map((c) => c.defaultWidth),
  );
  const dragRef = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        colIndex,
        startX: e.clientX,
        startWidth: widths[colIndex],
      };
    },
    [widths],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const { colIndex, startX, startWidth } = dragRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(columns[colIndex].minWidth, startWidth + delta);
      setWidths((prev) => {
        const next = [...prev];
        next[colIndex] = newWidth;
        return next;
      });
    },
    [columns],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return { widths, onPointerDown, onPointerMove, onPointerUp };
}
