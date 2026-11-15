export type MarkerVariant = "ok" | "down" | "pending";
export type MarkerRole = "nodo" | "puente";

// Clases completas (no interpoladas) para que Tailwind las detecte.
const COLORS: Record<MarkerVariant, { ring: string; glyph: string }> = {
  ok: {
    ring: "border-emerald-400",
    glyph: "text-emerald-300",
  },
  down: {
    ring: "border-red-500",
    glyph: "text-red-400",
  },
  pending: {
    ring: "border-amber-400",
    glyph: "text-amber-300",
  },
};

/** Iconos basados en Lucide (ISC): "radio" para nodos, "radio-tower" para el puente. */
function Glyph({ role }: { role: MarkerRole }) {
  return (
    <svg
      className="w-[18px] h-[18px]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {role === "puente" ? (
        <>
          <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9" />
          <path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5" />
          <circle cx="12" cy="9" r="2" />
          <path d="M16.9 12.2a6.14 6.14 0 0 0-.8-7.5" />
          <path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1" />
          <path d="M9.5 18h5" />
          <path d="m8 22 4-11 4 11" />
        </>
      ) : (
        <>
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
        </>
      )}
    </svg>
  );
}

/** Tamaño del icono (el ancla está en el centro del círculo). */
export const MARKER_SIZE = 40;

export default function MapMarker({
  label,
  variant = "ok",
  role = "nodo",
}: {
  label?: string;
  variant?: MarkerVariant;
  role?: MarkerRole;
}) {
  const c = COLORS[variant];
  const shape = role === "puente" ? "rounded-xl" : "rounded-full";

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative flex items-center justify-center w-10 h-10">
        <div
          className={`relative flex items-center justify-center w-9 h-9 ${shape} border-2 ${c.ring} ${c.glyph} bg-[#07130d]`}
        >
          <Glyph role={role} />
        </div>
      </div>
      {label && (
        <span
          className={`marker-label ${variant === "down" ? "is-down" : ""} absolute top-full mt-1 flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-[#07130d]/90 text-white border border-white/10 rounded-md whitespace-nowrap`}
        >
          {label}
          {variant === "down" && (
            <span className="px-1 rounded bg-red-500 text-[10px] font-bold text-white">
              DOWN
            </span>
          )}
        </span>
      )}
    </div>
  );
}
