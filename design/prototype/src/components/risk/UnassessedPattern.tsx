export function UnassessedPattern() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        <pattern id="hatch-unrated" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--surface)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--hatch-line)" strokeWidth="1" />
        </pattern>
        <pattern id="hatch-idle" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="var(--ink)" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--surface)" strokeWidth="1" />
        </pattern>
      </defs>
    </svg>
  );
}
