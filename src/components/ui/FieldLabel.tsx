import { cn } from "@/lib/utils";

type FieldLabelProps = {
  children: React.ReactNode;
  className?: string;
};

export function FieldLabel({ children, className }: FieldLabelProps) {
  return (
    <p className={cn("block text-sm font-bold text-text-dark", className)}>
      {children}
    </p>
  );
}
