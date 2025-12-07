import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { 
  Wand2, 
  SlidersHorizontal, 
  Box, 
  Globe, 
  ArrowUpRight
} from "lucide-react";

// --- Types ---
type Feature = {
  title: string;
  desc: string;
  icon: React.ElementType;
  colSpan: string;
  id: string;
};

const FEATURES: Feature[] = [
  {
    id: "ai",
    title: "AI Mesh Generation",
    desc: "Interactive geometry that responds to your input. Move your cursor to deform the mesh below.",
    icon: Wand2,
    colSpan: "md:col-span-2",
  },
  {
    id: "parametric",
    title: "Parametric Control",
    desc: "Drag the slider to see how parameters drive form in real-time.",
    icon: SlidersHorizontal,
    colSpan: "md:col-span-1",
  },
  {
    id: "export",
    title: "3D Exports",
    desc: "Production-ready logic. Hover to inspect the geometry.",
    icon: Box,
    colSpan: "md:col-span-1",
  },
  {
    id: "browser",
    title: "Cloud Engine",
    desc: "Access powerful libraries (BOSL2, MCAD) instantly in the browser.",
    icon: Globe,
    colSpan: "md:col-span-2",
  },
];

export function InteractiveFeatureGrid() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-[#13000c]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-semibold shiny-text mb-4"
          >
            Capabilities designed to be played with.
          </motion.h2>
          <p className="text-white/60 text-lg">
            Interact with the cards below to see our engine in action.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          {FEATURES.map((feature) => (
            <BentoCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Card Wrapper with 3D Tilt ---
function BentoCard({ feature }: { feature: Feature }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onMouseMove={onMouseMove}
      className={`
        relative group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm
        ${feature.colSpan} flex flex-col
      `}
    >
      {/* Interactive Background Layer */}
      <div className="absolute inset-0 z-0">
        {feature.id === "ai" && <ElasticMeshVisual />}
        {feature.id === "parametric" && <ParametricSliderVisual />}
        {feature.id === "export" && <CubeVisual mouseX={mouseX} mouseY={mouseY} />}
        {feature.id === "browser" && <GlobeVisual />}
      </div>

      {/* Content Layer (on top) */}
      <div className="relative z-10 flex flex-col h-full p-8 pointer-events-none">
        <div className="mb-auto flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-md">
            <feature.icon className="h-5 w-5 text-[var(--gold-400)]" />
          </div>
          <ArrowUpRight className="h-5 w-5 text-white/20 group-hover:text-white/60 transition-colors" />
        </div>
        
        <div className="mt-auto backdrop-blur-[2px] rounded-2xl p-2 -ml-2">
          <h3 className="text-xl font-medium text-white mb-2">{feature.title}</h3>
          <p className="text-sm text-white/60 leading-relaxed max-w-[90%]">
            {feature.desc}
          </p>
        </div>
      </div>

      {/* Hover Spotlight */}
      <SpotlightOverlay mouseX={mouseX} mouseY={mouseY} />
    </motion.div>
  );
}

// --- Visual: Elastic Mesh (Dots that repel mouse) ---
function ElasticMeshVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<Array<{x: number, y: number, baseX: number, baseY: number}>>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const gap = 30;
    const cols = Math.floor(width / gap);
    const rows = Math.floor(height / gap);
    const newDots = [];
    
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gap + gap / 2;
        const y = j * gap + gap / 2;
        newDots.push({ x, y, baseX: x, baseY: y });
      }
    }
    setDots(newDots);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setDots(prev => prev.map(dot => {
      const dx = mouseX - dot.baseX;
      const dy = mouseY - dot.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 150;
      
      if (dist < maxDist) {
        const force = (maxDist - dist) / maxDist;
        const angle = Math.atan2(dy, dx);
        return {
          ...dot,
          x: dot.baseX - Math.cos(angle) * force * 40, // Repel force
          y: dot.baseY - Math.sin(angle) * force * 40
        };
      }
      return { ...dot, x: dot.baseX, y: dot.baseY };
    }));
  };

  return (
    <div 
      ref={containerRef} 
      onMouseMove={handleMouseMove}
      className="absolute inset-0 cursor-crosshair pointer-events-auto"
    >
      <svg className="w-full h-full opacity-40">
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={1.5}
            fill="var(--gold-500)"
            className="transition-transform duration-75 ease-out"
          />
        ))}
      </svg>
    </div>
  );
}

// --- Visual: Parametric Slider (Interactive shape) ---
function ParametricSliderVisual() {
  const [value, setValue] = useState(50);
  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => setValue(Number(e.target.value));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
      {/* The parametric shape */}
      <motion.div 
        className="relative mb-8 border border-[var(--gold-500)] bg-[var(--gold-500)]/10"
        style={{
          width: 80 + value, // Width driven by slider
          height: 80,
          borderRadius: 40 - (value * 0.3), // Radius driven by slider
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--gold-500)] font-mono">
          {value}mm
        </div>
      </motion.div>

      {/* The controls */}
      <div className="w-48 px-4 py-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3">
        <span className="text-[10px] text-white/50 font-mono">WIDTH</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value} 
          onChange={handleDrag}
          className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold-500)]"
        />
      </div>
    </div>
  );
}

// --- Visual: 3D Cube (Reacts to mouse spring) ---
function CubeVisual({ mouseX, mouseY }: { mouseX: any, mouseY: any }) {
  const rotateX = useTransform(mouseY, [0, 320], [25, -25]);
  const rotateY = useTransform(mouseX, [0, 320], [-25, 25]);

  return (
    <div className="absolute inset-0 flex items-center justify-center perspective-[800px]">
      <motion.div
        style={{ rotateX, rotateY, rotateZ: 10 }}
        className="w-24 h-24 relative preserve-3d"
      >
        <div className="absolute inset-0 border border-[var(--gold-500)] bg-[var(--gold-500)]/5 translate-z-[48px]" />
        <div className="absolute inset-0 border border-[var(--gold-500)] bg-[var(--gold-500)]/5 -translate-z-[48px]" />
        <div className="absolute inset-0 border border-[var(--gold-500)] bg-[var(--gold-500)]/5 rotate-y-90 translate-z-[48px]" />
        <div className="absolute inset-0 border border-[var(--gold-500)] bg-[var(--gold-500)]/5 rotate-y-90 -translate-z-[48px]" />
        <div className="absolute inset-0 border border-[var(--gold-500)] bg-[var(--gold-500)]/5 rotate-x-90 translate-z-[48px]" />
        <div className="absolute inset-0 border border-[var(--gold-500)] bg-[var(--gold-500)]/5 rotate-x-90 -translate-z-[48px]" />
      </motion.div>
      <style>{`.preserve-3d { transform-style: preserve-3d; } .rotate-y-90 { transform: rotateY(90deg) translateZ(48px); } .rotate-x-90 { transform: rotateX(90deg) translateZ(48px); } .translate-z { transform: translateZ(48px); } .-translate-z { transform: translateZ(-48px); }`}</style>
    </div>
  );
}

// --- Visual: Globe / Map ---
function GlobeVisual() {
  return (
    <div className="absolute inset-0 opacity-30">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(198,155,178,0.5)_360deg)] animate-[spin_8s_linear_infinite]" />
      <div className="absolute inset-4 rounded-full border border-dashed border-white/20" />
      <div className="absolute inset-16 rounded-full border border-white/10" />
    </div>
  );
}

function SpotlightOverlay({ mouseX, mouseY }: { mouseX: any, mouseY: any }) {
  return (
    <motion.div
      className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition duration-300 z-30"
      style={{
        background: useTransform(
          [mouseX, mouseY],
          ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.06), transparent 40%)`
        ),
      }}
    />
  );
}