(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!reducedMotion.matches) document.documentElement.classList.add("js-ready");

  const hero = document.querySelector(".hero");
  let heroVisible = true;
  const updateHeroMotion = () => hero?.classList.toggle("hero-motion-paused", !heroVisible || document.hidden);
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      updateHeroMotion();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener("visibilitychange", updateHeroMotion);

  const deck = document.querySelector("#projectDeck");
  const cards = [...document.querySelectorAll(".project-card")];
  const menu = document.querySelector("#siteNav");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const dialog = document.querySelector("#contactDialog");
  let returnFocus = null;

  const closeMenu = () => {
    if (!menu || !menuToggle) return;
    menu.classList.remove("nav-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  };

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    menu?.classList.toggle("nav-open", !isOpen);
  });
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  const showDialog = (trigger) => {
    if (!dialog) return;
    returnFocus = trigger;
    closeMenu();
    dialog.hidden = false;
    document.querySelectorAll(".site-header, main, .site-footer").forEach((element) => { element.inert = true; });
    document.body.classList.add("dialog-open");
    dialog.querySelector(".dialog-close")?.focus();
  };
  const hideDialog = () => {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.querySelectorAll(".site-header, main, .site-footer").forEach((element) => { element.inert = false; });
    document.body.classList.remove("dialog-open");
    returnFocus?.focus();
  };
  document.querySelectorAll("[data-contact-open]").forEach((button) => button.addEventListener("click", () => showDialog(button)));
  document.querySelectorAll("[data-contact-close]").forEach((button) => button.addEventListener("click", hideDialog));

  dialog?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled])')]
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const previewQueue = [];
  const previewCleanup = new WeakMap();
  const visibleCards = new Set();
  let loadingPreviews = 0;
  const maxConcurrentLoads = 3;

  const setStatus = (card, text) => {
    const label = card.querySelector("[data-preview-status]");
    if (label) label.textContent = text;
  };
  const sizePreview = (card) => {
    const media = card.querySelector(".project-media");
    const frame = media?.querySelector("iframe");
    if (!media || !frame || !media.clientWidth) return;
    // Render a desktop website inside each card, rather than a tiny phone viewport.
    const scale = media.clientWidth / 1100;
    frame.style.width = "1100px";
    frame.style.height = `${Math.ceil(media.clientHeight / scale)}px`;
    frame.style.transform = `scale(${scale})`;
  };

  const pumpPreviewQueue = () => {
    while (loadingPreviews < maxConcurrentLoads && previewQueue.length) {
      const card = previewQueue.shift();
      const frame = card.querySelector("iframe[data-preview-src]");
      if (!card.isConnected || frame?.dataset.previewState !== "queued") continue;
      loadingPreviews++;
      frame.dataset.previewState = "loading";
      setStatus(card, "LOADING PREVIEW");
      sizePreview(card);
      let settled = false;
      let timer;
      const cleanup = () => {
        if (settled) return false;
        settled = true;
        window.clearTimeout(timer);
        frame.removeEventListener("load", onLoad);
        frame.removeEventListener("error", onError);
        previewCleanup.delete(frame);
        loadingPreviews--;
        return true;
      };
      const finish = (success) => {
        if (!cleanup()) return;
        frame.dataset.previewState = success ? "loaded" : "failed";
        frame.classList.toggle("preview-active", success);
        card.classList.toggle("has-live-preview", success);
        setStatus(card, success ? "LIVE PREVIEW" : "OPEN WEBSITE ↗");
        const play = card.querySelector("[data-preview-play]");
        if (play) play.hidden = success;
        pumpPreviewQueue();
      };
      const onLoad = () => finish(true);
      const onError = () => finish(false);
      previewCleanup.set(frame, cleanup);
      frame.addEventListener("load", onLoad);
      frame.addEventListener("error", onError);
      timer = window.setTimeout(() => finish(false), 20000);
      frame.src = frame.dataset.previewSrc;
    }
  };
  const startPreview = (card) => {
    const frame = card.querySelector("iframe[data-preview-src]");
    if (!frame || ["queued", "loading", "loaded"].includes(frame.dataset.previewState)) return;
    frame.dataset.previewState = "queued";
    previewQueue.push(card);
    pumpPreviewQueue();
  };
  const stopPreview = (card) => {
    const frame = card.querySelector("iframe[data-preview-src]");
    if (!frame || !frame.dataset.previewState || frame.dataset.previewState === "idle") return;
    previewCleanup.get(frame)?.();
    for (let index = previewQueue.length - 1; index >= 0; index--) {
      if (previewQueue[index] === card) previewQueue.splice(index, 1);
    }
    frame.dataset.previewState = "idle";
    frame.classList.remove("preview-active");
    card.classList.remove("has-live-preview");
    frame.removeAttribute("src");
    setStatus(card, "WEBSITE PREVIEW");
    const play = card.querySelector("[data-preview-play]");
    if (play) play.hidden = false;
    pumpPreviewQueue();
  };

  const previewObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleCards.add(entry.target);
          if (!reducedMotion.matches && !document.hidden) startPreview(entry.target);
        } else {
          visibleCards.delete(entry.target);
          stopPreview(entry.target);
        }
      });
    }, { rootMargin: "120px 0px", threshold: 0.05 })
    : null;
  const previewResizeObserver = "ResizeObserver" in window
    ? new ResizeObserver((entries) => entries.forEach((entry) => sizePreview(entry.target.closest(".project-card"))))
    : null;
  cards.forEach((card) => {
    card.querySelector("[data-preview-play]")?.addEventListener("click", () => startPreview(card));
    sizePreview(card);
    previewResizeObserver?.observe(card.querySelector(".project-media"));
    if (previewObserver) previewObserver.observe(card);
    else {
      visibleCards.add(card);
      if (!reducedMotion.matches) startPreview(card);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cards.forEach(stopPreview);
    else if (!reducedMotion.matches) visibleCards.forEach(startPreview);
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) cards.forEach(stopPreview);
    else if (!document.hidden) visibleCards.forEach(startPreview);
  });

  const scrollDeck = (direction) => {
    if (!deck) return;
    const distance = Math.min(deck.clientWidth * 0.78, 520);
    deck.scrollBy({ left: direction * distance, behavior: reducedMotion.matches ? "auto" : "smooth" });
  };
  document.querySelector("[data-deck-prev]")?.addEventListener("click", () => scrollDeck(-1));
  document.querySelector("[data-deck-next]")?.addEventListener("click", () => scrollDeck(1));

  const updateDeckControls = () => {
    if (!deck || !cards.length) return;
    const scrollable = window.matchMedia("(max-width: 820px)").matches && deck.scrollWidth > deck.clientWidth + 2;
    const prev = document.querySelector("[data-deck-prev]");
    const next = document.querySelector("[data-deck-next]");
    if (prev) { prev.hidden = !scrollable; prev.disabled = deck.scrollLeft <= 2; }
    if (next) { next.hidden = !scrollable; next.disabled = deck.scrollLeft >= deck.scrollWidth - deck.clientWidth - 2; }
    const count = document.querySelector(".deck-count");
    if (count) {
      const bounds = deck.getBoundingClientRect();
      let closest = 0;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const delta = Math.abs(card.getBoundingClientRect().left - bounds.left);
        if (delta < distance) { distance = delta; closest = index; }
      });
      count.textContent = scrollable ? `${String(closest + 1).padStart(2, "0")} / 07` : "07 PROJECTS";
    }
  };
  deck?.addEventListener("scroll", updateDeckControls, { passive: true });
  window.addEventListener("resize", updateDeckControls, { passive: true });
  updateDeckControls();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideDialog();
      closeMenu();
    }
  });

  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach((link) => {
        const active = link.hash === `#${current.target.id}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0,0.1,0.35] });
    sections.forEach((section) => navObserver.observe(section));
  }

  const revealItems = document.querySelectorAll(".reveal");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }
})();
