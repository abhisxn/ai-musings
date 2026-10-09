interface TagProps {
  label: string
}

/* Palette ported from thatguyabhishek Tag — hashed per label so a tag keeps its colour */
const TAG_PALETTE = [
  { bg: '#FADEC9', color: '#D9730D' },
  { bg: '#FDECC8', color: '#cb912f' },
  { bg: '#DBEDDB', color: '#448361' },
  { bg: '#D3E5EF', color: '#2e7dae' },
  { bg: '#E8DEEE', color: '#9065B0' },
  { bg: '#F5E0E9', color: '#C14F8A' },
  { bg: '#FFE2DD', color: '#c4554d' },
  { bg: '#EEE0DA', color: '#9F6B53' },
  { bg: '#E3E2E0', color: '#787774' },
]

function tagStyle(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  const { bg, color } = TAG_PALETTE[h % TAG_PALETTE.length]
  return { background: bg, color, border: `1px solid ${color}` }
}

export function Tag({ label }: TagProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-normal leading-[1.2] whitespace-nowrap"
      style={tagStyle(label)}
    >
      {label}
    </span>
  )
}
