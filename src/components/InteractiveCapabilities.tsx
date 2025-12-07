import React, { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  Ruler, 
  Scale, 
  ShieldCheck, 
  Sparkles 
} from "lucide-react";

// --- Data ---
const CAPABILITIES = [
  {
    id: "semantic",
    title: "Semantic Understanding",
    subtitle: "It speaks Jewelry.",
    desc: "Wireframe doesn't just push vertices. It understands 'bezel', 'pavé', and 'gallery', ensuring parts attach where they belong.",
    icon: Sparkles,
  },
  {
    id: "dimensions",
    title: "Adaptive Sizing",
    subtitle: "Scaling that makes sense.",
    desc: "Change a ring size from 5 to 9, and the shank thickens proportionally while the stone stays secure. No stretching.",
    icon: Ruler,
  },
  {
    id: "physics",
    title: "Material Intelligence",
    subtitle: "Instant weight & cost.",
    desc: "Live calculations for metal volume (g) and stone weights (ct) as you design, so you never underquote.",
    icon: Scale,
  },
  {
    id: "production",
    title: "Manufacturability Checks",
    subtitle: "Print-safe by default.",
    desc: "Auto-detects walls thinner than 0.6mm or unclosed meshes before you even export.",
    icon: ShieldCheck,
  },
];

export function InteractiveCapabilities() {
  const [activeId, setActiveId] = useState<string>("semantic");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleHover = useCallback((id: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveId(id);
    }, 40); 
  }, []);

  return (
    <section className="relative py-24 sm:py-32 bg-[#13000c] border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-(--gold-500)/5 blur-[100px] rounded-full mix-blend-screen opacity-60" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-semibold shiny-text mb-8">
                Engineered for the Bench.
              </h2>
            </motion.div>
            
            <LayoutGroup>
              <div className="space-y-2">
                {CAPABILITIES.map((cap) => (
                  <CapabilityRow 
                    key={cap.id} 
                    data={cap} 
                    isActive={activeId === cap.id} 
                    onHover={() => handleHover(cap.id)} 
                  />
                ))}
              </div>
            </LayoutGroup>
          </div>

          <motion.div 
            layout
            className="relative h-[500px] w-full bg-white/2 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
            
            <div className="absolute inset-0 flex items-center justify-center perspective-[1000px]">
              <CapabilityVisualizer activeId={activeId} />
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center text-[10px] font-mono text-white/30 uppercase tracking-widest pointer-events-none">
              <div className="flex gap-4">
                <span>Mode: <span className="text-(--gold-500) transition-all duration-300">{activeId.toUpperCase()}</span></span>
                <span>Poly: 12,404</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Engine Ready</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

function CapabilityRow({ data, isActive, onHover }: { data: any, isActive: boolean, onHover: () => void }) {
  return (
    <motion.div 
      layout
      onMouseEnter={onHover}
      className={`
        group relative p-6 rounded-2xl cursor-pointer border
        ${isActive ? "bg-white/5 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.2)]" : "bg-transparent border-transparent hover:bg-white/2"}
      `}
      transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
    >
      {isActive && (
        <motion.div 
          layoutId="active-cap-line"
          className="absolute left-0 top-6 bottom-6 w-1 bg-(--gold-500) rounded-r-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      <div className="flex items-start gap-4">
        <motion.div 
          layout
          className={`
            mt-1 p-2 rounded-lg transition-colors duration-300
            ${isActive ? "bg-(--gold-500) text-black" : "bg-white/5 text-white/40 group-hover:text-white/80"}
          `}
        >
          <data.icon size={20} />
        </motion.div>
        
        <div className="flex-1">
          <motion.h3 
            layout="position"
            className={`text-lg font-medium transition-colors ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}
          >
            {data.title}
          </motion.h3>
          <motion.p 
            layout="position"
            className="text-xs font-mono uppercase tracking-wider text-(--gold-500)/80 mt-1 mb-2"
          >
            {data.subtitle}
          </motion.p>
          
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false}>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <p className="text-sm text-white/60 leading-relaxed pb-1">
                    {data.desc}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CapabilityVisualizer({ activeId }: { activeId: string }) {
  return (
    <div className="relative w-64 h-64 preserve-3d">
      <motion.div
        animate={{ rotateY: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 w-full h-full flex items-center justify-center preserve-3d"
      >
        <motion.div
          animate={{ 
            scale: activeId === "dimensions" ? 1.15 : 1,
            rotateX: activeId === "physics" ? 15 : 0,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="w-full h-full flex items-center justify-center preserve-3d"
        >
          <VisualRing mode={activeId} />
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 pointer-events-none">
        
        <AnimatedOverlay show={activeId === "semantic"}>
          <Label x={-80} y={-40} text="PRONGS (6)" delay={0.1} />
          <Label x={90} y={0} text="GALLERY RAIL" delay={0.2} />
          <Label x={-60} y={80} text="SHANK (D-PROFILE)" delay={0.3} />
        </AnimatedOverlay>

        <AnimatedOverlay show={activeId === "dimensions"}>
          <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-40 h-px bg-(--gold-500) flex items-center justify-between shadow-[0_0_8px_rgba(225,185,92,0.5)]">
            <div className="w-px h-3 bg-(--gold-500)" />
            <div className="bg-black/80 px-2 py-1 text-[10px] text-(--gold-500) rounded border border-(--gold-500)/30 backdrop-blur-md">
              18.2mm
            </div>
            <div className="w-px h-3 bg-(--gold-500)" />
          </div>
        </AnimatedOverlay>

        <AnimatedOverlay show={activeId === "physics"}>
          <div className="absolute -right-4 top-10 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-xl w-40 shadow-2xl">
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>Gold 18k</span>
              <span className="text-white font-medium">4.8g</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-[70%] bg-(--gold-500) shadow-[0_0_10px_rgba(225,185,92,0.5)]" />
            </div>
            <div className="flex justify-between text-xs text-white/60 mt-3 mb-2">
              <span>Diamond</span>
              <span className="text-white font-medium">1.02ct</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-[40%] bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
            </div>
          </div>
        </AnimatedOverlay>

        <AnimatedOverlay show={activeId === "production"}>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full text-xs font-mono flex items-center gap-2 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <ShieldCheck size={14} />
            <span>MESH WATERTIGHT</span>
          </div>
        </AnimatedOverlay>

      </div>
    </div>
  );
}

function AnimatedOverlay({ show, children }: { show: boolean, children: React.ReactNode }) {
  return (
    <div 
      className={`absolute inset-0 transition-opacity duration-500 ease-out ${show ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}

function Label({ x, y, text, delay }: { x: number, y: number, text: string, delay: number }) {
  return (
    <div
      className="absolute top-1/2 left-1/2 flex items-center gap-2 transition-transform duration-500"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />
      <div className="h-px w-6 bg-linear-to-r from-white/80 to-transparent" />
      <div className="text-[10px] font-bold text-white/90 bg-black/40 px-2 py-1 rounded backdrop-blur-md border border-white/10 shadow-lg tracking-wider">
        {text}
      </div>
    </div>
  );
}

function VisualRing({ mode }: { mode: string }) {
  const isWireframe = mode === "production" || mode === "semantic";
  const isHeatmap = mode === "physics";
  
  const STRUTS = useMemo(() => [0, 45, 90, 135, 180, 225, 270, 315], []);
  const RINGS = useMemo(() => [0, 8, 16], []);

  const ringBorderClass = isHeatmap
    ? "border-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.3)]"
    : isWireframe
      ? "border-white/30"
      : "border-(--gold-500)/80 shadow-[0_0_15px_rgba(225,185,92,0.2)]";

  const strutClass = isHeatmap
    ? "bg-blue-500/60"
    : "bg-white/20";

  const strutOpacity = (isWireframe || isHeatmap) ? 'opacity-100' : 'opacity-0';

  return (
    <div className="relative preserve-3d">
      {RINGS.map((z) => (
        <div 
          key={z}
          className={`absolute inset-0 -top-20 -left-20 h-40 w-40 rounded-full border-2 transition-colors duration-700 ${ringBorderClass}`}
          style={{ transform: `translateZ(${z}px)` }}
        />
      ))}
      
      {STRUTS.map((deg) => (
        <div
          key={deg}
          className={`absolute h-4 w-px transition-opacity duration-500 ${strutOpacity} ${strutClass}`}
          style={{
            top: '-80px', left: '0',
            transform: `rotate(${deg}deg) translate(80px) rotateX(90deg)`
          }}
        />
      ))}

      <div className="absolute -top-28 left-0 preserve-3d" style={{ transform: "rotateX(-15deg)" }}>
        <div className="relative animate-pulse">
           <div 
             className={`absolute -left-3 -top-3 w-6 h-6 rotate-45 border transition-colors duration-700
               ${isHeatmap ? 'bg-blue-500/30 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-white/5 border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'}
             `} 
           />
           <div 
             className={`absolute -left-3 -top-3 w-6 h-6 rotate-45 border transition-colors duration-700
               ${isHeatmap ? 'bg-blue-500/30 border-blue-400' : 'bg-white/5 border-white'}
             `} 
             style={{ transform: "rotateY(90deg)" }} 
           />
        </div>
      </div>
    </div>
  );
}