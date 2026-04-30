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
        px-3 py-1 text-[10px] font-mono transition-all duration-200 uppercase tracking-tighter
        ${active
          ? 'text-neon-green text-glow border-l-2 border-neon-green bg-neon-green/5'
          : 'text-zinc-600 hover:text-zinc-300 hover:border-l-2 hover:border-zinc-500'
        }
        ${onClick ? 'cursor-crosshair' : 'cursor-default'}
      `}
    >
      <span className="opacity-50 mr-1">{active ? '●' : '○'}</span>
      {label}
    </button>
  )
}
