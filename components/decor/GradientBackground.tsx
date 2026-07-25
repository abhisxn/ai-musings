export function GradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="gb-blob gb-blob--amber"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, var(--color-accent) 0%, transparent 60%)',
        }}
      />
      <div
        className="gb-blob gb-blob--teal"
        style={{
          background:
            'radial-gradient(circle at 70% 70%, var(--color-secondary) 0%, transparent 60%)',
        }}
      />
      <div
        className="gb-blob gb-blob--rust"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(192, 78, 36, 0.55) 0%, transparent 65%)',
        }}
      />
      <style>{`
        @keyframes gb-drift-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.32; }
          50%      { transform: translate3d(8%, -6%, 0) scale(1.08); opacity: 0.42; }
        }
        @keyframes gb-drift-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.28; }
          50%      { transform: translate3d(-7%, 5%, 0) scale(1.1); opacity: 0.38; }
        }
        @keyframes gb-drift-c {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.22; }
          50%      { transform: translate3d(5%, 4%, 0) scale(0.95); opacity: 0.3; }
        }
        .gb-blob {
          position: absolute;
          inset: -20%;
          filter: blur(96px);
          will-change: transform, opacity;
        }
        .gb-blob--amber {
          animation: gb-drift-a 22s ease-in-out infinite;
        }
        .gb-blob--teal {
          animation: gb-drift-b 28s ease-in-out infinite;
        }
        .gb-blob--rust {
          animation: gb-drift-c 34s ease-in-out infinite;
        }
        [data-theme="light"] .gb-blob {
          opacity: 0.6;
        }
        @media (prefers-reduced-motion: reduce) {
          .gb-blob {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
