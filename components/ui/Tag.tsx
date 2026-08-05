interface TagProps {
  label: string
}

export function Tag({ label }: TagProps) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-pill bg-surface-2 text-fg/65 whitespace-nowrap">
      {label}
    </span>
  )
}
