interface ActiveBadgeProps {
  ativo: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function ActiveBadge({
  ativo,
  activeLabel = "Ativo",
  inactiveLabel = "Inativo",
}: ActiveBadgeProps) {
  return ativo ? (
    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
      {activeLabel}
    </span>
  ) : (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      {inactiveLabel}
    </span>
  );
}
