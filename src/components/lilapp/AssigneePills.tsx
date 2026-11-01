// Always renders every assignee — no truncation, no overflow. Wraps as needed.
export function AssigneePills({ names }: { names: string[]; max?: number }) {
  if (!names.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((n) => (
        <span
          key={n}
          className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground"
        >
          {n}
        </span>
      ))}
    </div>
  );
}
