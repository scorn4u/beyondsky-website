"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  AIRLOCK — a scroll-locked, scrub-driven video hero                        */
/*                                                                            */
/*  While the hero owns the screen the page cannot move: the body is pinned   */
/*  with position:fixed. Wheel, touch and key input is captured and spent on  */
/*  video.currentTime instead, forward and backward. When the video reaches   */
/*  its end and the reader keeps pushing forward the page is handed back and  */
/*  scrolls normally; scrolling back up to the top takes the lock again at    */
/*  full progress.                                                            */
/* -------------------------------------------------------------------------- */

const PALETTES = {
  aviation: {
    backdrop: "#050a18",
    text: "#ffffff",
    muted: "rgba(240,244,248,0.78)",
    bar: "linear-gradient(90deg, rgba(37,99,235,0.6), rgba(56,189,248,0.95))",
  },
  vacuum: {
    backdrop: "#05070d",
    text: "#f2f4f8",
    muted: "rgba(240,244,248,0.72)",
    bar: "linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.95))",
  },
  ember: {
    backdrop: "#0d0705",
    text: "#fdf1e7",
    muted: "rgba(253,241,231,0.72)",
    bar: "linear-gradient(90deg, rgba(255,176,102,0.45), rgba(255,214,168,0.95))",
  },
  ice: {
    backdrop: "#04090f",
    text: "#eaf4ff",
    muted: "rgba(234,244,255,0.72)",
    bar: "linear-gradient(90deg, rgba(120,190,255,0.45), rgba(214,236,255,0.95))",
  },
};

const DEFAULT_VIDEO = "/assets/hero_airlock.mp4";
const DEFAULT_POSTER = "/assets/hero_poster.jpg";
const SANS = "var(--font-main), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/** Keyboard fallback, so a reader without a wheel is never stuck. */
const KEY_STEPS = {
  ArrowDown: 140,
  ArrowUp: -140,
  PageDown: 700,
  PageUp: -700,
  " ": 700,
  End: Number.MAX_SAFE_INTEGER,
  Home: Number.MIN_SAFE_INTEGER,
};

const MOBILE_SCRUB = 480;
const MOBILE_HOLD = 160;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export const GO_HOME_EVENT = "beyondsky:go-home";
export const GO_TO_SECTION_EVENT = "beyondsky:go-to-section";

export default function AirlockHero({
  id = "hero",
  videoSrc = DEFAULT_VIDEO,
  posterSrc = DEFAULT_POSTER,
  title = "Beyond Sky",
  tagline = "Stories From the Skies",
  taglineHighlight = "the Skies",
  signature = false,
  scrubDistance = 3200,
  holdDistance = 1100,
  theme = "aviation",
  className,
  style,
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const titleRef = useRef(null);
  const taglineRef = useRef(null);
  const barRef = useRef(null);
  const scrimRef = useRef(null);
  const releaseRef = useRef(() => {});
  const advanceRef = useRef(() => {});
  const [ready, setReady] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const palette = PALETTES[theme] || PALETTES.aviation;

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    // Guarantee that every reload/mount starts at the top hero section
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    const checkMobile = () => {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isNarrow = window.innerWidth <= 768;
      setIsMobileDevice(isTouch || isNarrow);
      return isTouch || isNarrow;
    };

    const isMobile = checkMobile();

    const reduceMotion =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

    let duration = 0;
    let rafId = 0;
    let autoAdvanceRaf = 0;
    let target = 0;
    let shown = 0;
    let moved = false;
    let seeking = false;
    let queued = null;
    let seekSafetyTimer = null;
    let locked = false;
    let lockedY = 0;
    let released = false;
    let lastY = 0;

    // Mobile-calibrated distances
    const effectiveScrubDist = isMobile ? MOBILE_SCRUB : scrubDistance;
    const effectiveHoldDist = isMobile ? MOBILE_HOLD : holdDistance;
    const totalDistance = effectiveScrubDist + effectiveHoldDist;
    const scrubShare = effectiveScrubDist / totalDistance;

    /* --- Seeking with safety timer --- */
    function seekTo(t) {
      if (Math.abs(video.currentTime - t) < 0.02) return;
      if (seeking) {
        queued = t;
        return;
      }
      seeking = true;
      try {
        video.currentTime = t;
      } catch {
        seeking = false;
      }

      clearTimeout(seekSafetyTimer);
      seekSafetyTimer = setTimeout(() => {
        seeking = false;
        if (queued !== null) {
          const nextT = queued;
          queued = null;
          seekTo(nextT);
        }
      }, 90);
    }

    const onSeeked = () => {
      clearTimeout(seekSafetyTimer);
      seeking = false;
      if (queued !== null) {
        const t = queued;
        queued = null;
        seekTo(t);
      }
    };

    /* --- Painting --- */
    function paint(p) {
      const videoP = clamp(p / scrubShare, 0, 1);

      if (duration > 0) {
        const maxTime = Math.max(duration - 0.15, 0);
        seekTo(videoP * maxTime);
      }

      // Smooth pacing: title fades out in first 35%, tagline reveals at 70%+
      const titleAlpha = 1 - clamp(videoP / 0.35, 0, 1);
      const taglineAlpha = clamp((videoP - 0.70) / 0.28, 0, 1);

      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${1 + videoP * 0.06})`;
      }
      if (scrimRef.current) {
        scrimRef.current.style.opacity = String(Math.max(titleAlpha, taglineAlpha));
      }
      if (titleRef.current) {
        const t = titleAlpha;
        titleRef.current.style.opacity = String(t);
        titleRef.current.style.transform = `translateY(${(1 - t) * -24}px) scale(${0.96 + t * 0.04})`;
        titleRef.current.style.filter = `blur(${(1 - t) * 10}px)`;
        titleRef.current.style.pointerEvents = t < 0.1 ? "none" : "auto";
      }
      if (taglineRef.current) {
        const t = taglineAlpha;
        taglineRef.current.style.opacity = String(t);
        taglineRef.current.style.transform = `translateY(${(1 - t) * 20}px) scale(${0.97 + t * 0.03})`;
        taglineRef.current.style.filter = `blur(${(1 - t) * 8}px)`;
        taglineRef.current.style.pointerEvents = t > 0.8 ? "auto" : "none";
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${p})`;
      }
    }

    /* --- The Lock --- */
    function engageLock() {
      if (locked) return;
      locked = true;
      released = false;
      lockedY = window.scrollY || window.pageYOffset || 0;

      const b = document.body.style;
      b.position = "fixed";
      b.top = `-${lockedY}px`;
      b.left = "0";
      b.right = "0";
      b.width = "100%";
      b.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    function releaseLock() {
      if (!locked) return;
      locked = false;
      const y = lockedY;

      const b = document.body.style;
      b.position = "";
      b.top = "";
      b.left = "";
      b.right = "";
      b.width = "";
      b.overflow = "";
      document.documentElement.style.overflow = "";
      window.scrollTo(0, y);

      released = true;
      lastY = y;
    }

    // Scroll to portfolio smoothly
    function navigateToContent() {
      const targetEl =
        document.getElementById("portfolio") ||
        document.getElementById("work") ||
        document.querySelector("main > *:nth-child(2)");
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
      }
    }

    releaseRef.current = () => {
      target = shown = 1;
      moved = true;
      paint(1);
      releaseLock();
      setTimeout(navigateToContent, 50);
    };

    // Smooth tap-to-explore animation
    advanceRef.current = () => {
      moved = true;
      cancelAnimationFrame(autoAdvanceRaf);
      const startP = shown;
      const startTime = performance.now();
      const animDuration = isMobile ? 1200 : 1600;

      const stepAuto = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / animDuration, 1);
        // Quad ease-in-out
        const ease =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        target = shown = startP + (1 - startP) * ease;
        paint(shown);

        if (progress < 1) {
          autoAdvanceRaf = requestAnimationFrame(stepAuto);
        } else {
          target = shown = 1;
          paint(1);
          setTimeout(() => {
            releaseLock();
            navigateToContent();
          }, 350);
        }
      };

      autoAdvanceRaf = requestAnimationFrame(stepAuto);
    };

    let videoPrimed = false;
    const primeVideo = () => {
      if (videoPrimed || !video) return;
      videoPrimed = true;
      try {
        const p = video.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            video.pause();
          }).catch(() => {});
        }
      } catch {}
    };

    function consumeNormalized(delta) {
      if (!locked) return false;
      if (target >= 1 && shown > 0.98 && delta > 0) {
        releaseLock();
        setTimeout(navigateToContent, 50);
        return false;
      }
      target = clamp(target + delta, 0, 1);
      if (target > 0.001) moved = true;

      // Auto-glide to content when reaching end of intro
      if (target >= 0.96) {
        target = 1;
        setTimeout(() => {
          if (locked) {
            releaseLock();
            setTimeout(navigateToContent, 50);
          }
        }, 400);
      }
      return true;
    }

    /* --- Input Handlers --- */
    const onWheel = (e) => {
      const isSmall = window.innerWidth <= 768;
      const total = isSmall ? (MOBILE_SCRUB + MOBILE_HOLD) : (scrubDistance + holdDistance);
      if (consumeNormalized(e.deltaY / total)) {
        if (e.cancelable) e.preventDefault();
      }
    };

    // Universal Touch & Pointer Gesture Physics with Velocity & Momentum
    let touchStartY = 0;
    let touchStartX = 0;
    let lastTouchY = 0;
    let lastTouchTime = 0;
    let touchVelocity = 0;
    let isTouching = false;
    let gestureStartTime = 0;

    const handlePointerDown = (clientY, clientX) => {
      cancelAnimationFrame(autoAdvanceRaf);
      primeVideo();
      touchStartY = clientY;
      touchStartX = clientX || 0;
      lastTouchY = clientY;
      lastTouchTime = performance.now();
      gestureStartTime = performance.now();
      touchVelocity = 0;
      isTouching = true;
    };

    const handlePointerMove = (clientY, e) => {
      if (!isTouching) return;
      const now = performance.now();
      const dt = Math.max(now - lastTouchTime, 8);
      const deltaY = lastTouchY - clientY;

      touchVelocity = deltaY / dt; // px per millisecond
      lastTouchY = clientY;
      lastTouchTime = now;

      const isSmall = window.innerWidth <= 768;
      const touchDist = isSmall ? 350 : totalDistance;
      const touchSensitivity = isSmall ? 2.4 : 1.3;

      const normalizedDelta = (deltaY * touchSensitivity) / touchDist;

      if (locked) {
        if (consumeNormalized(normalizedDelta)) {
          if (e && e.cancelable) e.preventDefault();
        }
      }
    };

    const handlePointerUp = (clientY) => {
      if (!isTouching) return;
      isTouching = false;
      const gestureDuration = performance.now() - gestureStartTime;
      const totalMove = Math.abs(touchStartY - (clientY !== undefined ? clientY : lastTouchY));

      // Tap detection: quick tap with minimal movement (< 20px within 400ms)
      if (totalMove < 20 && gestureDuration < 400 && shown < 0.5) {
        primeVideo();
        advanceRef.current();
        return;
      }

      // Natural finger flick momentum
      if (locked && Math.abs(touchVelocity) > 0.15) {
        const isSmall = window.innerWidth <= 768;
        const boost = isSmall ? 0.45 : 0.25;
        const direction = touchVelocity > 0 ? 1 : -1;
        const flickPower = Math.min(Math.abs(touchVelocity), 2.5) * boost * direction;

        target = clamp(target + flickPower, 0, 1);
        moved = true;

        // If flicked upward with intention near end of intro, glide to 100% and release
        if (direction > 0 && target >= 0.70) {
          target = 1;
          setTimeout(() => {
            if (locked && shown > 0.90) {
              releaseLock();
              setTimeout(navigateToContent, 50);
            }
          }, 450);
        }
      }
    };

    // Touch events for mobile Safari / Chrome
    const isInteractiveTarget = (e) =>
      !!(e && e.target && e.target.closest && e.target.closest("a, button, [role='button'], input, textarea, select"));

    const onTouchStart = (e) => {
      if (isInteractiveTarget(e)) return;
      if (e.touches && e.touches[0]) {
        handlePointerDown(e.touches[0].clientY, e.touches[0].clientX);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientY, e);
      }
    };

    const onTouchEnd = (e) => {
      const endY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : lastTouchY;
      handlePointerUp(endY);
    };

    // Pointer events for modern touch, mouse drag & stylus
    const onPointerDown = (e) => {
      if (isInteractiveTarget(e)) return;
      handlePointerDown(e.clientY, e.clientX);
    };

    const onPointerMove = (e) => {
      handlePointerMove(e.clientY, e);
    };

    const onPointerUp = (e) => {
      handlePointerUp(e.clientY);
    };

    const onKeyDown = (e) => {
      const step = KEY_STEPS[e.key];
      if (step === undefined) return;
      if (consumeNormalized(step / totalDistance)) {
        if (e.cancelable) e.preventDefault();
      }
    };

    const onScroll = () => {
      if (locked || !released) return;
      const y = window.scrollY;
      const climbing = y < lastY;
      lastY = y;
      // Re-lock only when user intentionally scrolls all the way back to the very top
      if (climbing && y <= 6) {
        target = shown = 1;
        paint(1);
        engageLock();
      }
    };

    /* --- Video Readiness --- */
    const onEnded = () => {
      if (duration > 0) {
        try {
          video.currentTime = Math.max(duration - 0.15, 0);
        } catch {}
      }
    };

    const onVideoReady = () => {
      duration = video.duration || 0;
      try {
        video.pause();
      } catch {}
      setReady(true);
      if (reduceMotion) {
        target = shown = 1;
        moved = true;
        paint(1);
      }
    };

    video.addEventListener("loadeddata", onVideoReady);
    video.addEventListener("loadedmetadata", onVideoReady);
    video.addEventListener("canplay", onVideoReady);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ended", onEnded);

    if (video.readyState >= 1) {
      onVideoReady();
    }

    const onPageShow = (e) => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      target = 0;
      shown = 0;
      moved = false;
      paint(0);
      if (!reduceMotion) engageLock();
    };
    window.addEventListener("pageshow", onPageShow);

    // Fired by the header logo / "home" link
    const onGoHome = () => {
      cancelAnimationFrame(autoAdvanceRaf);
      if (reduceMotion) {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        return;
      }
      if (!locked) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      target = 0; // the frame loop eases `shown` back to 0, rewinding the video
      moved = false;
      released = false;
      engageLock();
    };
    window.addEventListener(GO_HOME_EVENT, onGoHome);

    // Fired by header section links: finish the intro and jump to that section
    const onGoToSection = (e) => {
      const el = document.getElementById(e.detail);
      if (!el) return;
      cancelAnimationFrame(autoAdvanceRaf);
      target = shown = 1;
      moved = true;
      paint(1);
      releaseLock();
      setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 50);
    };
    window.addEventListener(GO_TO_SECTION_EVENT, onGoToSection);

    if (!reduceMotion) {
      target = 0;
      shown = 0;
      moved = false;
      released = false;
      paint(0);
      engageLock();

      const usePointer = typeof window !== "undefined" && "PointerEvent" in window;

      window.addEventListener("wheel", onWheel, { passive: false });

      if (usePointer) {
        window.addEventListener("pointerdown", onPointerDown, { passive: true });
        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp, { passive: true });
        window.addEventListener("pointercancel", onPointerUp, { passive: true });
      } else {
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        window.addEventListener("touchcancel", onTouchEnd, { passive: true });
      }

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", checkMobile);

      const frame = () => {
        shown += (target - shown) * 0.18;
        paint(shown);
        rafId = requestAnimationFrame(frame);
      };
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      clearTimeout(seekSafetyTimer);
      cancelAnimationFrame(autoAdvanceRaf);
      cancelAnimationFrame(rafId);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener(GO_HOME_EVENT, onGoHome);
      window.removeEventListener(GO_TO_SECTION_EVENT, onGoToSection);
      video.removeEventListener("loadeddata", onVideoReady);
      video.removeEventListener("loadedmetadata", onVideoReady);
      video.removeEventListener("canplay", onVideoReady);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ended", onEnded);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkMobile);
      releaseLock();
    };
  }, [scrubDistance, holdDistance]);

  return (
    <div
      id={id}
      ref={sectionRef}
      className={cn("airlock-hero-section relative h-[100dvh] w-full overflow-hidden select-none", className)}
      style={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        background: palette.backdrop,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...style,
      }}
    >
      {/* Fallback poster background image so the ISS hatch is immediately visible on mobile */}
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `url(${posterSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 1,
          transformOrigin: "center center",
          willChange: "transform",
          zIndex: 1,
        }}
      />

      {/* Top and bottom atmospheric falloff */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(5,10,24,0.68) 0%, rgba(5,10,24,0) 28%, rgba(5,10,24,0.2) 68%, rgba(5,10,24,0.88) 100%)",
          zIndex: 2,
        }}
      />

      {/* Centre scrim */}
      <div
        ref={scrimRef}
        className="pointer-events-none absolute inset-0"
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 65% 48% at 50% 50%, rgba(5,10,24,0.78), rgba(5,10,24,0) 75%)",
          zIndex: 3,
        }}
      />

      {/* Title Over Opening Frames: "Aviation Content, Redefined" */}
      <div
        ref={titleRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-[6%] text-center"
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6%",
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <h1
          className="inline-block leading-none"
          style={{
            fontFamily: SANS,
            fontSize: "clamp(34px, 7.5vw, 104px)",
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            color: palette.text,
            textWrap: "balance",
            textShadow: "0 4px 35px rgba(0,0,0,0.8)",
            willChange: "transform, filter, opacity",
          }}
        >
          Aviation Content,{" "}
          <span style={{ color: "var(--aviation-yellow)" }}>Redefined</span>
        </h1>
      </div>

      {/* Tagline Reveal Over Last Section (taglineHighlight gets the hand-drawn circle) */}
      {tagline ? (
        <div
          ref={taglineRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-[6%] text-center opacity-0"
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6%",
            textAlign: "center",
            opacity: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "inline-block", marginBottom: "0.85rem" }}>
            <span
              style={{
                fontFamily: "var(--font-tech)",
                fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)",
                letterSpacing: "0.18em",
                color: "var(--aviation-yellow)",
                fontWeight: 700,
                background: "rgba(14, 27, 56, 0.7)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "0.3rem 0.85rem",
                borderRadius: "50px",
                backdropFilter: "blur(6px)",
              }}
            >
              BEYOND SKY PRESENTS
            </span>
          </div>
          <p
            className="font-bold tracking-[-0.01em]"
            style={{
              fontFamily: SANS,
              fontSize: "clamp(26px, 5.5vw, 68px)",
              fontWeight: 800,
              lineHeight: 1.15,
              color: palette.text,
              textShadow: "0 4px 30px rgba(0,0,0,0.8), 0 0 40px rgba(245,158,11,0.35)",
              maxWidth: "850px",
            }}
          >
            {typeof tagline === "string" && taglineHighlight && tagline.includes(taglineHighlight) ? (
              <>
                {tagline.split(taglineHighlight)[0]}
                <span
                  className="highlight-circle"
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    padding: "0 0.15em",
                  }}
                >
                  {taglineHighlight}
                </span>
                {tagline.split(taglineHighlight).slice(1).join(taglineHighlight)}
              </>
            ) : (
              tagline
            )}
          </p>
          <span
            style={{
              marginTop: "1.2rem",
              fontSize: "clamp(0.85rem, 2vw, 1rem)",
              color: "var(--text-secondary)",
              maxWidth: "560px",
              lineHeight: 1.6,
              textShadow: "0 2px 10px rgba(0,0,0,0.9)",
              padding: "0 0.5rem",
            }}
          >
            Curious aviation history, aerospace duopolies, and aircraft engineering documentaries.
          </span>
        </div>
      ) : null}

      {/* Scrub Progress Line */}
      <div
        className="absolute inset-x-0 bottom-0 h-1"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "3px",
          background: "rgba(255,255,255,0.12)",
          zIndex: 20,
        }}
      >
        <div
          ref={barRef}
          className="h-full w-full origin-left"
          style={{
            height: "100%",
            width: "100%",
            transformOrigin: "left",
            background: palette.bar,
            transform: "scaleX(0)",
            boxShadow: "0 0 10px rgba(56, 189, 248, 0.6)",
          }}
        />
      </div>

      {signature ? (
        <span
          className="absolute bottom-[clamp(10px,2vw,18px)] right-[clamp(12px,2.5vw,24px)] z-[20] font-medium"
          style={{
            position: "absolute",
            bottom: "clamp(10px, 2vw, 18px)",
            right: "clamp(12px, 2.5vw, 24px)",
            zIndex: 20,
            fontFamily: SANS,
            fontSize: "clamp(11px, 1.4vw, 13px)",
            color: palette.muted,
          }}
        >
          by{" "}
          <a
            href={signature.url}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline transition-colors hover:opacity-100"
            style={{ color: "inherit" }}
          >
            {signature.name}
          </a>
        </span>
      ) : null}
    </div>
  );
}
