/* ==========================================================
   motion.js — scroll motion for the St. Ambrose × Mount Mercy page.
   Same family as teeej.ai's curtain.js and invictus-tc.com's
   motion.js (which is itself modelled on curtain.js):

   1. Curtain stack. The hero holds while its photo slowly zooms
      (1 → 1.16) and the headline drifts up and away; then chapter 1
      rises over it like a theatre curtain. Every chapter opens on a
      white→dark flip, so each one rides up over the chapter before
      it, which darkens underneath. Reverses on scroll-up. Pure CSS
      sticky does the holding; GSAP only scrubs the zoom and shade.
   2. Fade-in. Headings, copy and list lines rise 22px into place
      and replay every time they come back into view.
   3. Side-in. The paired St. Ambrose / Mount Mercy columns slide
      in from their own edge (wide screens; they stack below 901px).
   4. Band titles rise word by word out of a mask.
   5. The recommendation callout wipes open left to right.
   6. Scrubbed reveals: the Base wheel turns and settles into place,
      and the three degree cards rise one after another.

   Under reduced motion none of this runs and nothing is hidden:
   every class that starts content at opacity 0 is added here.
   ========================================================== */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const root = document.documentElement;
  const SCRUB = 0.4; // seconds the scrubbed timelines take to catch up (Teeej's value)
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const hero = document.querySelector(".hero");
  const chapters = $$(".chapter");
  const wide = window.matchMedia("(min-width: 901px)");

  // ---------- shared observer: toggle .is-visible so reveals replay ----------
  const observe = (els, rootMargin) => {
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-visible", e.isIntersecting)),
      { rootMargin, threshold: 0.05 }
    );
    els.forEach((el) => io.observe(el));
  };

  // ---------- 4. band titles: split into masked words ----------
  const titles = $$(".band__title");
  titles.forEach((t) => {
    const words = t.textContent.trim().split(/\s+/);
    t.setAttribute("aria-label", t.textContent.trim());
    t.innerHTML = words
      .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");
    t.classList.add("words");
  });
  observe(titles, "0px 0px -8% 0px");

  // ---------- 3. side-in (wide screens only) ----------
  const sides = $$(".side");
  if (wide.matches) {
    const midX = window.innerWidth / 2;
    sides.forEach((col) => {
      const r = col.getBoundingClientRect();
      col.classList.add(r.left + r.width / 2 < midX ? "side-in-left" : "side-in-right");
    });
    observe(sides, "0px 0px -12% 0px");
  }

  // ---------- 5. callout wipe ----------
  const wipes = $$(".callout");
  wipes.forEach((el) => el.classList.add("wipe"));
  observe(wipes, "0px 0px -12% 0px");

  // ---------- 2. fade-in ----------
  const FADE = ".intro__copy, .duo__col, .h2, .h3, .lines p, .para, .steps li, .bullets li, .drivers li, .band__sub";
  const SKIP = [wide.matches ? ".side" : null, ".callout", ".degrees"].filter(Boolean).join(", ");
  const fades = $$(FADE).filter((el) => !el.closest(SKIP));
  fades.forEach((el) => el.classList.add("fade-in"));
  observe(fades, "0px 0px -10% 0px");

  // ---------- 1. curtain stack ----------
  // Only worth doing when the hero is a full screen (not a landscape phone).
  const canStack = () => window.innerHeight >= 480;

  // Each chapter holds on its LAST screenful: top = viewport − height
  // (negative for a chapter taller than the screen). Measured against the
  // small viewport so a phone's address bar doesn't make it jump.
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const vh = () => probe.offsetHeight || window.innerHeight;

  const setSticks = () => {
    const h = vh();
    chapters.forEach((ch) => ch.style.setProperty("--stick", `${Math.round(h - ch.offsetHeight)}px`));
  };

  if (canStack()) {
    root.classList.add("has-stack");
    chapters.forEach((ch, i) => (ch.style.zIndex = String(i + 1)));
    setSticks();
  }

  // Hide the scroll cue once the visitor starts moving.
  const onScroll = () => root.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Scroll positions are computed from layout (heights), never from
  // getBoundingClientRect: a stuck chapter reports where it is pinned, not
  // where it sits in the flow, which would throw every trigger off.
  const holdEl = document.querySelector(".hero-hold");
  const chapterTop = (idx) => {
    let y = hero.offsetHeight + (holdEl ? holdEl.offsetHeight : 0);
    for (let i = 0; i < idx; i++) y += chapters[i].offsetHeight;
    return y;
  };
  const flowTop = (el) => {
    const ch = el.closest(".chapter");
    let y = 0;
    let n = el;
    while (n && n !== ch) {
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return chapterTop(chapters.indexOf(ch)) + y;
  };

  // ---------- GSAP: scrubbed hero, shade, wheel, cards ----------
  const start = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const stacking = root.classList.contains("has-stack");

    // Hero: zoom + headline lift across the hold and the curtain's rise.
    if (stacking) {
      const tl = gsap.timeline({
        scrollTrigger: {
          start: 0,
          end: () => chapterTop(0),
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo(".hero__bg img", { scale: 1 }, { scale: 1.16, ease: "none", duration: 1 }, 0);
      tl.to(".hero__content", { opacity: 0, y: -42, ease: "none", duration: 0.45 }, 0);
      tl.to(".hero__logo", { opacity: 0, ease: "none", duration: 0.35 }, 0.1);
    }

    // Shade: whatever is being covered darkens as the next chapter rises.
    if (stacking) {
      const covered = [hero, ...chapters];
      chapters.forEach((ch, i) => {
        const under = covered[i];
        const target = under === hero ? ".hero__shade" : under;
        const prop = under === hero ? { opacity: 0.2 } : { "--shade": 0 };
        const to = under === hero ? { opacity: 0.6 } : { "--shade": 0.3 };
        // White copy only starts to dim once the cover is past halfway, so
        // nothing still being read goes grey. The photo dims the whole way.
        const lead = under === hero ? 1 : 0.5;
        gsap.fromTo(target, prop, {
          ...to,
          ease: "none",
          scrollTrigger: {
            start: () => chapterTop(i) - vh() * lead,
            end: () => chapterTop(i),
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
        });
      });
    }

    // The Base wheel turns a quarter-step and settles as it comes up.
    const wheel = document.querySelector(".wheel__img");
    if (wheel) {
      gsap.fromTo(
        wheel,
        { rotation: -32, scale: 0.82, opacity: 0.15 },
        {
          rotation: 0,
          scale: 1,
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: {
            start: () => flowTop(wheel) - vh(),
            end: () => flowTop(wheel) - vh() * 0.25,
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
        }
      );
    }

    // Degree cards rise one after another (Teeej's card reveal).
    const degrees = document.querySelector(".degrees");
    if (degrees) {
      const cards = $$(".degree", degrees);
      const tl = gsap.timeline({
        scrollTrigger: {
          start: () => flowTop(degrees) - vh() * 0.95,
          end: () => flowTop(degrees) - vh() * 0.5,
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      });
      const step = 1 / cards.length;
      cards.forEach((card, i) => {
        tl.fromTo(card, { y: 110 }, { y: 0, ease: "power2.out", duration: step }, i * step * 0.8);
        tl.fromTo(card, { opacity: 0 }, { opacity: 1, ease: "none", duration: step * 0.5 }, i * step * 0.8);
      });
    }

    ScrollTrigger.addEventListener("refreshInit", () => {
      if (root.classList.contains("has-stack")) setSticks();
    });
    ScrollTrigger.refresh();
  };

  // Re-measure when layout settles (fonts, lazy images) or the width changes.
  let lastW = window.innerWidth;
  const remeasure = () => {
    if (root.classList.contains("has-stack")) setSticks();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastW) return; // address-bar resizes on phones
    lastW = window.innerWidth;
    remeasure();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  window.addEventListener("load", remeasure);

  if (window.gsap) start();
  else window.addEventListener("load", start, { once: true });
})();
