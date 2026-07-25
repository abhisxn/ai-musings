const GRAIN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(%23n)'/>
  </svg>`,
)}`

export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.03]"
      style={{
        backgroundImage: `url("${GRAIN_SVG}")`,
        backgroundSize: '160px 160px',
        backgroundRepeat: 'repeat',
      }}
    />
  )
}
