export default function Monitor() {
  return (
    <div className="w-80 h-full p-4 rounded-xl border border-emerald-950/50 bg-[#060e0a]/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Live Monitor
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">CANOPY-01</span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-2.5 rounded-lg bg-[#040806] border border-emerald-900/30">
            <p className="text-xs text-zinc-400">Vegetation Health (NDVI)</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">0.78 <span className="text-xs text-emerald-600 font-normal">Optimal</span></p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#040806] border border-emerald-900/30">
            <p className="text-xs text-zinc-400">Canopy Moisture</p>
            <p className="text-lg font-bold text-zinc-200 font-mono">64%</p>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-emerald-950/40 text-[11px] text-zinc-500 flex justify-between items-center">
        <span>Sentinel-2 Feed</span>
        <span className="text-emerald-500/80">Active</span>
      </div>
    </div>
  );
}
