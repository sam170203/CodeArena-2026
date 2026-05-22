export function ScanlineOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] mix-blend-overlay opacity-30"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.025) 3px 4px)",
      }}
    />
  );
}
