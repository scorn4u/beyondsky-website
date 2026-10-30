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
  const [menuOpen, setMenuOpen] = useState(false); // phone hamburger menu

  // Scroll detection for header backdrop blur
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the phone menu on Escape, or if the screen grows to desktop width
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    const mq = window.matchMedia("(min-width: 641px)");
    const onWide = (e) => e.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [menuOpen]);

  // Logo and "home" take you back to the start of the home page (intro rewound)
  const goHome = (e) => {
    setMenuOpen(false);
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let "open in new tab" work
    e.preventDefault();
    // the video intro handles this itself (and cancels the event); otherwise just go to the top
    const handled = !window.dispatchEvent(new Event(GO_HOME_EVENT, { cancelable: true }));
    if (!handled) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Section links finish the intro and scroll to the section (if it exists)
  const goToSection = (e) => {
    setMenuOpen(false);
    const id = e.currentTarget.getAttribute("href").slice(1);
    if (!document.getElementById(id)) return;
    e.preventDefault();
    const handled = !window.dispatchEvent(
      new CustomEvent(GO_TO_SECTION_EVENT, { detail: id, cancelable: true })
    );
    if (!handled) document.getElementById(id).scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="sterling-gate-root">
      <div className={`site-header-wrapper ${isScrolled ? "header-scrolled" : ""}`}>
        <header className="header">
          <div className={`container is--full header-panel ${menuOpen ? "is-menu-open" : ""}`}>
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

              {/* Phones: hamburger button instead of the text links */}
              <button
                type="button"
                className="nav-burger"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>
            </nav>

            <ul className="mobile-nav" id="mobile-nav" hidden={!menuOpen}>
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="mobile-nav__link"
                    onClick={link.home ? goHome : goToSection}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </header>
      </div>
    </div>
  );
}
