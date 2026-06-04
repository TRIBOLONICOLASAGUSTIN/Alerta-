import { motion } from "framer-motion";
import { Radio } from "lucide-react";

export default function Header() {
  return (
    <motion.header
      className="bg-[#050b14]/95 border-b shrink-0 backdrop-blur-sm"
      style={{ borderBottomColor: "rgba(245,158,11,0.12)" }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="px-5 py-3 flex items-center justify-between gap-4">
        {/* Logo + Título */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-9 h-9 shrink-0">
            <svg viewBox="0 0 36 36" fill="none" className="w-9 h-9">
              <circle cx="18" cy="18" r="3"    fill="#f59e0b" />
              <circle cx="18" cy="18" r="7"    stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 2" />
              <circle cx="18" cy="18" r="12"   stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.35" strokeDasharray="2 3" />
              <circle cx="18" cy="18" r="16.5" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.18" strokeDasharray="1.5 4" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base tracking-tight">AlertAR</span>
              <span className="text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-md leading-none">
                Alerta Sofía
              </span>
            </div>
            <p className="text-slate-600 text-[10px] leading-none mt-0.5 font-mono">
              3GPP TS 23.041 · SIFEBU · Simulador CBE — Argentina
            </p>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-400/80 font-medium">Sistema activo</span>
          </div>
          <span className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-mono">
            <Radio size={11} className="text-slate-700 shrink-0" />
            <span>UTN · FRSF — Buffa · Gerber · Merschon · Tribolo</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
