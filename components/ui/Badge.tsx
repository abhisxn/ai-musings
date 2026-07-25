interface BadgeProps {
  label: string
  onClick?: () => void
  active?: boolean
}

export function Badge({ label, onClick, active = false }: BadgeProps) {
  const baseClasses = `
    px-3 py-1 text-[10px] uppercase tracking-[0.2em] rounded-pill transition-all duration-200 border
    ${active
      ? 'bg-accent text-on-accent border-accent'
      : 'bg-transparent text-fg/60 border-border-1 hover:text-fg hover:border-border-2'
    }
  `

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={`${baseClasses} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-pill`}
      >
        {label}
      </button>
    )
  }

  return (
    <span className={`${baseClasses} cursor-default`}>
      {label}
    </span>
  )
}
