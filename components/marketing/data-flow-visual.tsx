"use client"

type DataFlowVisualProps = {
  mode?: "subtle"
}

const paths = [
  "M-40 84 C180 62 280 72 430 52 S700 20 860 48",
  "M-30 60 C150 46 260 58 390 70 S650 106 880 42",
  "M80 112 C240 88 330 58 470 46 S700 34 940 -18",
  "M180 -18 C270 34 360 84 520 92 S760 70 940 26",
] as const

export function DataFlowVisual({ mode = "subtle" }: DataFlowVisualProps) {
  return (
    <svg
      aria-hidden="true"
      className={`data-flow-visual data-flow-visual--${mode}`}
      viewBox="0 0 900 120"
      preserveAspectRatio="none"
      fill="none"
      focusable="false"
    >
      <defs>
        <linearGradient id="dashboard-flow-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f97316" stopOpacity="0" />
          <stop offset="0.35" stopColor="#fb923c" stopOpacity="0.7" />
          <stop offset="0.8" stopColor="#f97316" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="dashboard-flow-packet">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="0.35" stopColor="#fb923c" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <filter id="dashboard-flow-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      <g className="data-flow-visual__paths">
        {paths.map((path, index) => (
          <g key={path}>
            <path
              d={path}
              pathLength="1"
              stroke="url(#dashboard-flow-line)"
              strokeWidth={index === 2 ? 1.1 : 0.8}
              strokeLinecap="round"
              opacity={index === 2 ? 0.24 : 0.16}
            />
            <circle
              className="data-flow-visual__packet"
              r={index % 2 === 0 ? 1.8 : 1.35}
              fill="url(#dashboard-flow-packet)"
              filter="url(#dashboard-flow-glow)"
              opacity="0.65"
            >
              <animateMotion
                dur={`${10 + index * 1.8}s`}
                begin={`${index * 1.7}s`}
                repeatCount="indefinite"
              >
                <mpath href={`#dashboard-flow-path-${index}`} />
              </animateMotion>
            </circle>
            <path id={`dashboard-flow-path-${index}`} d={path} pathLength="1" fill="none" opacity="0" />
          </g>
        ))}
      </g>
    </svg>
  )
}
