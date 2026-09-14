'use client'

const REPO_URL = 'https://github.com/abhisxn/charts-studio'

export default function ChartsStudioExperiment() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-bg px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <p className="t-caption text-fg/50 uppercase tracking-wide">Charts Studio</p>
        <p className="t-body1 text-fg/80">
          This one's a full standalone app, not an in-page toy. No live deployment yet, still a research-grounded lab. Code and the recommendation pipeline are on GitHub.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-pill bg-accent text-on-accent t-body3 font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            View on GitHub ↗
          </a>
        </div>
      </div>
    </div>
  )
}
