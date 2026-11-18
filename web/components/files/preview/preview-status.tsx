export function PreviewLoading({ label = "Loading preview…" }: { label?: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{label}</p>
  );
}

export function PreviewEmpty({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{label}</p>;
}
