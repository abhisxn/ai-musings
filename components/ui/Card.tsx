interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        ring-1 ring-border-1 bg-surface-1 p-1.5 rounded-card transition-all duration-300
        hover:ring-border-2 hover:shadow-[0_0_24px_theme(colors.accent/0.12)]
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="bg-surface-2 rounded-[calc(var(--radius-card)-0.5rem)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4">
        {children}
      </div>
    </div>
  )
}
