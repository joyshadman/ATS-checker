"use client";

type Props = {
  /** Names the item in the accessible labels, e.g. "Acme Corp" or "bullet 2". */
  itemLabel: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  size?: "sm" | "md";
};

const iconClass = "w-4 h-4";

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  size,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  size: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-30 disabled:pointer-events-none ${
        size === "sm" ? "h-9 w-9" : "h-10 w-10"
      } ${danger ? "hover:text-danger hover:bg-danger/10" : "hover:text-foreground hover:bg-surface"}`}
    >
      {children}
    </button>
  );
}

/** Move up, move down, and remove for one list item (spec 0002, AC-3). */
export function ItemControls({ itemLabel, index, count, onMove, onRemove, size = "md" }: Props) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <IconButton
        label={`Move ${itemLabel} up`}
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        size={size}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 15l7-7 7 7" />
        </svg>
      </IconButton>
      <IconButton
        label={`Move ${itemLabel} down`}
        onClick={() => onMove(index, index + 1)}
        disabled={index === count - 1}
        size={size}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </IconButton>
      <IconButton label={`Remove ${itemLabel}`} onClick={onRemove} danger size={size}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </IconButton>
    </div>
  );
}

/** "+ Add …" button with the cap note shown when the list is full. */
export function AddButton({
  label,
  onClick,
  count,
  max,
  noun,
}: {
  label: string;
  onClick: () => void;
  count: number;
  max: number;
  noun: string;
}) {
  const full = count >= max;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={full}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3.5 py-2 text-sm font-medium text-accent hover:border-accent/60 hover:bg-accent/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40 disabled:pointer-events-none"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {label}
      </button>
      {full && (
        <span className="text-xs text-muted">
          Limit reached: at most {max} {noun}.
        </span>
      )}
    </div>
  );
}
