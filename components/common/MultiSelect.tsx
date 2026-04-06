"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  function remove(optionValue: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  }

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as MultiSelectOption[];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-9 w-full items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {selectedLabels.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selectedLabels.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium"
            >
              {opt.label}
              {!disabled && (
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={(e) => remove(opt.value, e)}
                />
              )}
            </span>
          ))}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma opção disponível</p>
          ) : (
            options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  {opt.label}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
