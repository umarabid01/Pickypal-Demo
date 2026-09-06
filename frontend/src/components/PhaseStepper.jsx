const STEPS = [
  { key: "discovering", label: "Discover" },
  { key: "ordering", label: "Order" },
  { key: "paying", label: "Pay" },
  { key: "tracking", label: "Track" },
];

// Collapses backend phases into stepper positions.
// "idle" renders nothing (handled by the caller); "delivered" completes all steps.
function stepIndex(phase) {
  if (phase === "delivered") return STEPS.length;
  const i = STEPS.findIndex((s) => s.key === phase);
  return i === -1 ? 0 : i;
}

export default function PhaseStepper({ phase }) {
  if (phase === "idle") return null;

  const current = stepIndex(phase);

  return (
    <div className="stepper" role="status" aria-label={`Order progress: ${phase}`}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div className="stepper-item" key={step.key}>
            <div className={`stepper-dot ${done ? "done" : ""} ${active ? "active" : ""}`}>
              {done ? "✓" : ""}
            </div>
            <span className={`stepper-label ${active ? "active" : ""}`}>{step.label}</span>
            {i < STEPS.length - 1 && <div className={`stepper-line ${done ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}
