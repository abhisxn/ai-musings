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
        px-2 py-0.5 text-xs font-mono border transition-colors
        ${active
          ? 'border-green-400 text-green-400 bg-green-400/10'
          : 'border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {label}
    </button>
  )
}
