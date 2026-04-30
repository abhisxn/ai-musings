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
        border border-zinc-800 bg-zinc-950 p-4 transition-colors
        ${onClick ? 'cursor-pointer hover:border-zinc-600' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
