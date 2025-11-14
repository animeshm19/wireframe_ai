// src/components/DockBar.tsx
import React, { useState } from "react";
import MacOSDock from "@/components/ui/mac-os-dock";

export function DockBar() {
  // Use unique ids
  const apps = [
    { id: "loader-1",   name: "Loader",    icon: "/icons/loader.png" },
    { id: "wireframe",  name: "Wireframe", icon: "/icons/Wireframe.png" },
    { id: "loader-2",   name: "Loader",    icon: "/icons/loader.png" },
    { id: "loader-3",   name: "Loader",    icon: "/icons/loader.png" },
  ];

  // Show the indicator only under "wireframe"
  const [openApps, setOpenApps] = useState<string[]>(["wireframe"]);

  const handleAppClick = (appId: string) => {
    // optional: keep the indicator on wireframe only
    setOpenApps(["wireframe"]);

    if (appId === "wireframe") {
      document.querySelector("#mesh")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section aria-label="Dock" className="relative z-30 mx-auto my-10 flex justify-center">
      <MacOSDock
        apps={apps}
        onAppClick={handleAppClick}
        openApps={openApps}                 // e.g., ["wireframe"] to keep the dot on
        className="shadow-2xl"
        magnifyOnlyIds={["wireframe"]}      // only Wireframe responds to hover wave
        alwaysMagnifyIds={["wireframe"]}    // Wireframe is zoomed even when idle
        alwaysScale={1.35}                  // tweak idle zoom (1.2–1.5 usually looks best)
      />
    </section>
  );
}

export default DockBar;
