interface BadgeProps {
  label: string
  onClick?: () => void
  active?: boolean
}

export function Badge({ label, onClick, active = false }: BadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 text-[10px] uppercase tracking-[0.2em] rounded-pill transition-all duration-200 border
        ${active
          ? 'bg-accent text-bg border-accent'
          : 'bg-transparent text-fg/60 border-border-1 hover:text-fg hover:border-border-2'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {label}
    </button>
  )
}
