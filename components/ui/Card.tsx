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
        relative border border-zinc-800/50 bg-black/40 backdrop-blur-sm p-4 transition-all duration-300
        group hover:border-neon-green/50 hover:shadow-[0_0_20px_rgba(0,255,0,0.05)]
        ${onClick ? 'cursor-crosshair' : ''}
        ${className}
      `}
    >
      {/* ASCII Corners */}
      <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-zinc-700 group-hover:border-neon-green" />
      <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-zinc-700 group-hover:border-neon-green" />
      <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-zinc-700 group-hover:border-neon-green" />
      <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-zinc-700 group-hover:border-neon-green" />
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
