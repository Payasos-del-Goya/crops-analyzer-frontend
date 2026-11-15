/** Leyenda de las líneas de la red mesh del mapa. */
export default function MeshLegend() {
  const item = (stroke: string, dash: string | undefined, label: string) => (
    <li className="flex items-center gap-2">
      <svg aria-hidden height="8" width="28">
        <line
          stroke="#03140c"
          strokeLinecap="round"
          strokeOpacity="0.6"
          strokeWidth="6"
          x1="2"
          x2="26"
          y1="4"
          y2="4"
        />
        <line
          stroke={stroke}
          strokeDasharray={dash}
          strokeLinecap="round"
          strokeWidth="3"
          x1="2"
          x2="26"
          y1="4"
          y2="4"
        />
      </svg>
      {label}
    </li>
  );

  return (
    <ul className="absolute bottom-6 left-4 z-[1100] space-y-1 px-3 py-2 rounded-lg border border-emerald-900/50 bg-[#060e0a]/90 text-[11px] text-zinc-200 shadow-lg">
      {item("#10b981", undefined, "Ruta al puente")}
      {item("#a7f3d0", "6 6", "Enlace mesh")}
      {item("#f87171", "6 6", "Enlace caído")}
    </ul>
  );
}
