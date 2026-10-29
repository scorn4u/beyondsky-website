"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GO_HOME_EVENT, GO_TO_SECTION_EVENT } from "@/components/AirlockHero";

// Simple text navigation: "home, about, sponsors, jobs, contact."
const NAV_LINKS = [
  { label: "home", href: "/", home: true },
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

  // Logo and "home" take you back to the start of the home page (intro rewound)
  const goHome = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let "open in new tab" work
    e.preventDefault();
    window.dispatchEvent(new Event(GO_HOME_EVENT));
  };

  // Section links finish the intro and scroll to the section (if it exists)
  const goToSection = (e) => {
    const id = e.currentTarget.getAttribute("href").slice(1);
    if (!document.getElementById(id)) return;
    e.preventDefault();
    window.dispatchEvent(new CustomEvent(GO_TO_SECTION_EVENT, { detail: id }));
  };

  return (
    <div className="sterling-gate-root">
      <div className={`site-header-wrapper ${isScrolled ? "header-scrolled" : ""}`}>
        <header className="header">
          <div className="container is--full header-panel">
            <nav className="nav-row" aria-label="Beyond Sky Navigation">
              {/* Brand Logo */}
              <Link href="/" className="brand-link" aria-label="Beyond Sky home" onClick={goHome}>
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
                    <a
                      href={link.href}
                      className="text-nav__link"
                      onClick={link.home ? goHome : goToSection}
                    >
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
