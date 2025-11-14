import React, { useState } from "react";
import MacOSDock from "@/components/ui/mac-os-dock";

export function DockBar() {
  // Point to files in /public/icons (served from /icons/* at runtime)
  const apps = [
    { id: "finder",   name: "Finder",   icon: "/icons/finder-2021-09-10.png" },
    { id: "mail",     name: "Mail",     icon: "/icons/mail-2021-05-25.png" },
    { id: "calendar", name: "Calendar", icon: "/icons/calendar-2021-04-29.png" },
    { id: "terminal", name: "Terminal", icon: "/icons/terminal-2021-06-03.png" },
  ];

  const [openApps, setOpenApps] = useState<string[]>(["finder"]);

  const handleAppClick = (appId: string) => {
    // Example: toggle open indicator
    setOpenApps(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );

    // Optional routing/scroll:
    // if (appId === "terminal") document.querySelector("#mesh")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      aria-label="Dock"
      className="relative z-30 mx-auto my-10 flex justify-center"
    >
      <MacOSDock
        apps={apps}
        onAppClick={handleAppClick}
        openApps={openApps}
        className="shadow-2xl"
      />
    </section>
  );
}

export default DockBar;
