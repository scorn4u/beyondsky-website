"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// Simple text navigation: "home, about, sponsors, jobs, contact."
const NAV_LINKS = [
  { label: "home", href: "#hero" },
  { label: "about", href: "#about" },
  { label: "sponsors", href: "#sponsors" },
  { label: "jobs", href: "#jobs" },
  { label: "contact", href: "#contact" },
];

export default function SterlingGateKineticNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll detection for header backdrop blur
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="sterling-gate-root">
      <div className={`site-header-wrapper ${isScrolled ? "header-scrolled" : ""}`}>
        <header className="header">
          <div className="container is--full">
            <nav className="nav-row" aria-label="Beyond Sky Navigation">
              {/* Brand Logo */}
              <Link href="#hero" className="brand-link" aria-label="Beyond Sky Home">
                <div className="brand-logo-wrap">
                  <Image
                    src="/assets/company_logo.jpg"
                    alt="Beyond Sky Logo"
                    width={48}
                    height={48}
                    className="brand-logo-img"
                    priority
                  />
                </div>
              </Link>

              {/* Text links */}
              <ul className="text-nav">
                {NAV_LINKS.map((link, i) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-nav__link">
                      {link.label}
                    </a>
                    {i < NAV_LINKS.length - 1 ? "," : "."}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
      </div>
    </div>
  );
}
