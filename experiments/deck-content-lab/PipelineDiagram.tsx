const layers = [
  {
    x: 20,
    title: 'Intake & Synthesis',
    agents: ['contentExtractor', 'visionArchitect', 'narrativeSynthesizer', 'intentInterrogator'],
    accent: true,
  },
  {
    x: 280,
    title: 'Framework & Draft',
    agents: ['creativeStrategist', 'intentInterpreter', 'storyMapper'],
    accent: false,
  },
  {
    x: 540,
    title: 'Critique & Audience',
    agents: ['skepticCritic', 'storytellerCritic', 'narrativeInterrogator', 'lensAnalyzer'],
    accent: false,
  },
  {
    x: 800,
    title: 'Quality Gate',
    agents: ['contentFixer', 'voiceCalibrator'],
    accent: false,
  },
  {
    x: 1060,
    title: 'Visual Compilation',
    agents: ['slideArchitect', 'visualPlanner', 'slideInterpreter'],
    accent: false,
  },
]

const arrowLabels = ['NarrativeSeed', 'Draft beats', 'CritiqueReport', 'Calibrated narrative']

const BOX_W = 220
const BOX_Y = 90
const BOX_H = 210
const CENTER_Y = BOX_Y + BOX_H / 2

export function PipelineDiagram() {
  return (
    <figure className="text-fg flex flex-col gap-3">
      <svg
        viewBox="0 0 1360 420"
        role="img"
        aria-label="16 subagents grouped into five pipeline layers: Intake and Synthesis turns raw documents into a NarrativeSeed, Framework and Draft builds the beats, Critique and Audience runs the murder board and lens simulation, Quality Gate surgically fixes and voice-calibrates the narrative, and Visual Compilation renders the final slides."
        className="w-full h-auto"
      >
        <defs>
          <marker id="dcl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="currentColor" />
          </marker>
        </defs>

        <text x={130} y={40} fontSize="15" textAnchor="middle" fill="currentColor" opacity="0.6">
          Docs · URLs · screenshots (3–10, parallel)
        </text>
        <line
          x1={130}
          y1={50}
          x2={130}
          y2={BOX_Y - 4}
          stroke="currentColor"
          strokeOpacity="0.5"
          markerEnd="url(#dcl-arrow)"
        />

        {layers.map((layer) => (
          <g key={layer.title}>
            <rect
              x={layer.x}
              y={BOX_Y}
              width={BOX_W}
              height={BOX_H}
              rx={10}
              fill="none"
              stroke="currentColor"
              strokeOpacity={layer.accent ? '1' : '0.35'}
              className={layer.accent ? 'stroke-accent' : ''}
              strokeWidth={layer.accent ? 2 : 1.5}
            />
            <text
              x={layer.x + BOX_W / 2}
              y={BOX_Y + 28}
              fontSize="15"
              fontWeight="600"
              textAnchor="middle"
              fill="currentColor"
              className={layer.accent ? 'fill-accent' : ''}
            >
              {layer.title}
            </text>
            {layer.agents.map((agent, ai) => (
              <text
                key={agent}
                x={layer.x + BOX_W / 2}
                y={BOX_Y + 58 + ai * 27}
                fontSize="13"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.75"
              >
                {agent}
              </text>
            ))}
          </g>
        ))}

        {layers.slice(0, -1).map((layer, i) => {
          const x1 = layer.x + BOX_W
          const x2 = layers[i + 1].x
          const midX = (x1 + x2) / 2
          return (
            <g key={`arrow-${i}`}>
              <line
                x1={x1}
                y1={CENTER_Y}
                x2={x2}
                y2={CENTER_Y}
                stroke="currentColor"
                strokeOpacity="0.5"
                markerEnd="url(#dcl-arrow)"
              />
              <text
                x={midX}
                y={CENTER_Y - 10}
                fontSize="12"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.55"
              >
                {arrowLabels[i]}
              </text>
            </g>
          )
        })}

        <line
          x1={1280}
          y1={195}
          x2={1340}
          y2={195}
          stroke="currentColor"
          strokeOpacity="0.5"
          markerEnd="url(#dcl-arrow)"
        />
        <text x={1350} y={175} fontSize="14" fill="currentColor" opacity="0.6" textAnchor="end">
          slides.html
        </text>
        <text x={1350} y={193} fontSize="14" fill="currentColor" opacity="0.6" textAnchor="end">
          config.json
        </text>
      </svg>
      <figcaption className="t-caption text-fg/50">
        Sixteen subagents across five layers: raw source material becomes a synthesized seed, then a
        draft, then a critiqued and audience-tested narrative, then a voice-calibrated final pass,
        then rendered slides. Nothing skips the queue.
      </figcaption>
    </figure>
  )
}
