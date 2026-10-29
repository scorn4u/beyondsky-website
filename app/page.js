"use client";

import { useEffect } from "react";
import AirlockHero from "@/components/AirlockHero";
import SterlingGateKineticNav from "@/components/SterlingGateKineticNav";

export default function Home() {
  useEffect(() => {
    // Disable automatic browser scroll restoration on reload
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Clear hash if any, and scroll straight to top of hero
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const handleBeforeUnload = () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <>
      <SterlingGateKineticNav />
      <main id="main-content">
        <AirlockHero
          title="Beyond Sky"
          tagline="20 Million Views in the Last Year"
          taglineHighlight="20 Million"
          theme="aviation"
        />
      </main>
    </>
  );
}
