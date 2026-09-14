interface CardTitleProps {
  children: React.ReactNode;
  color?: string;
}

export function CardTitle({ children, color = "bg-accent" }: CardTitleProps) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
      <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {children}
    </h2>
  );
}
