interface MetricExtrasProps {
  description?: string;
  accessories?: React.ReactNode;
}

export function MetricExtras({ description, accessories }: MetricExtrasProps) {
  if (!description && !accessories) {
    return null;
  }

  return (
    <div>
      {description && <div>{description}</div>}
      {accessories && <div>{accessories}</div>}
    </div>
  );
}