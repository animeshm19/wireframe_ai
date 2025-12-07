// src/components/DockBar.tsx
import React, { useState } from "react";
import MacOSDock from "@/components/ui/mac-os-dock";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Globe, Database, Network } from "lucide-react";
import { FlickeringGrid } from "@/components/ui/shadcn-io/flickering-grid";

export function DockBar() {
  const apps = [
    { id: "loader-1", name: "System", icon: "/icons/loader.png" },
    { id: "wireframe", name: "Wireframe Forge", icon: "/icons/Wireframe.png" },
    { id: "loader-2", name: "Data", icon: "/icons/loader.png" },
    { id: "loader-3", name: "Network", icon: "/icons/loader.png" },
  ];

  const [openApps, setOpenApps] = useState<string[]>(["wireframe"]);
  // Store the rect of the clicked icon to originate the genie effect
  const [activePortal, setActivePortal] = useState<{ id: string; rect: DOMRect } | null>(null);

  const handleAppClick = (appId: string, rect?: DOMRect) => {
    setOpenApps(["wireframe"]);

    if (appId === "wireframe" && rect) {
      setActivePortal({ id: appId, rect });
    }
  };

  return (
    <>
      <section aria-label="Dock" className="relative z-30 mx-auto my-10 flex justify-center">
        <MacOSDock
          apps={apps}
          onAppClick={handleAppClick}
          openApps={openApps}
          className="shadow-2xl"
          magnifyOnlyIds={["wireframe"]}
          alwaysMagnifyIds={["wireframe"]}
          alwaysScale={1.35}
        />
      </section>

      {/* The Genie Portal Overlay */}
      <AnimatePresence>
        {activePortal && (
          <GenieOverlay 
            originRect={activePortal.rect} 
            onClose={() => setActivePortal(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

// --- The Crazy Holographic Overlay ---

function GenieOverlay({ originRect, onClose }: { originRect: DOMRect; onClose: () => void }) {
  // Calculate center of screen
  const windowCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  
  // Calculate vector from icon to center
  const deltaX = windowCenter.x - (originRect.left + originRect.width / 2);
  const deltaY = windowCenter.y - (originRect.top + originRect.height / 2);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ 
        clipPath: `circle(0px at ${originRect.left + originRect.width/2}px ${originRect.top + originRect.height/2}px)`,
        backgroundColor: "rgba(0,0,0,0)"
      }}
      animate={{ 
        clipPath: `circle(${Math.max(window.innerWidth, window.innerHeight) * 1.5}px at ${originRect.left + originRect.width/2}px ${originRect.top + originRect.height/2}px)`,
        backgroundColor: "rgba(5, 0, 3, 0.95)"
      }}
      exit={{ 
        clipPath: `circle(0px at ${originRect.left + originRect.width/2}px ${originRect.top + originRect.height/2}px)`,
        backgroundColor: "rgba(0,0,0,0)",
        transition: { duration: 0.6, ease: [0.32, 0, 0.67, 0] }
      }}
      transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <FlickeringGrid squareSize={4} gridGap={40} color="#c69bb2" maxOpacity={0.5} flickerChance={0.1} />
      </div>
      
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-50"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Main Holographic Container */}
      <motion.div 
        className="relative w-[90vw] h-[80vh] border border-white/10 rounded-3xl bg-black/40 backdrop-blur-2xl overflow-hidden shadow-[0_0_100px_rgba(198,155,178,0.2)]"
        initial={{ scale: 0.2, opacity: 0, y: 200 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.2, opacity: 0, y: 200 }}
        transition={{ delay: 0.1, duration: 0.6, type: "spring", bounce: 0.3 }}
      >
        {/* Animated Scanning Beam */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--gold-500)]/10 to-transparent pointer-events-none z-0"
          animate={{ top: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-8">
          
          {/* Floating Icons Orbit */}
          <div className="relative w-64 h-64 mb-12">
             {[Cpu, Globe, Database, Network].map((Icon, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20 + i*5, ease: "linear", delay: i * -5 }}
                >
                   <div 
                     className="w-16 h-16 rounded-2xl bg-[#13010c] border border-[var(--gold-500)]/30 flex items-center justify-center shadow-[0_0_30px_rgba(198,155,178,0.15)]"
                     style={{ transform: `translateY(-120px) rotate(-${360}deg)` }} // Counter-rotate to keep icon upright
                   >
                      <Icon className="w-8 h-8 text-[var(--gold-500)]" />
                   </div>
                </motion.div>
             ))}
             
             {/* Central Core */}
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-2 border-white/10 flex items-center justify-center animate-pulse">
                   <div className="w-24 h-24 rounded-full bg-[var(--gold-500)]/10 blur-xl absolute" />
                   <img src="/icons/Wireframe.png" className="w-16 h-16 opacity-80" alt="Core" />
                </div>
             </div>
          </div>

          <motion.h2 
            className="text-4xl md:text-6xl font-bold shiny-text mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            NEURAL FORGE ACTIVE
          </motion.h2>
          
          <motion.p 
            className="text-lg text-white/50 max-w-2xl mx-auto font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            System initialized. 12,404 parametric nodes online. <br/>
            Ready to synthesize geometry.
          </motion.p>

          <motion.div
            className="mt-12 flex gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
             <button className="px-8 py-3 bg-[var(--gold-500)] text-black font-bold rounded-full hover:scale-105 transition-transform">
                Start New Project
             </button>
             <button className="px-8 py-3 border border-white/20 text-white font-bold rounded-full hover:bg-white/5 transition-colors">
                View Blueprints
             </button>
          </motion.div>

        </div>
      </motion.div>
    </motion.div>
  );
}

export default DockBar;