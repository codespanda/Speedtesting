import type { SVGProps } from "react"

/** Stroke icon drawn from a single SVG path, matching the design's icon set. */
export function PathIcon({
  d,
  size = 24,
  strokeWidth = 2,
  ...props
}: { d: string; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={d} />
    </svg>
  )
}
