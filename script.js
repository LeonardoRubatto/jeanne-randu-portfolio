(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 900px)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const range = (value, start, end) => clamp((value - start) / (end - start));

  // Mobile pin-phase progress: 0 the moment .panel-sticky's hold engages,
  // 1 as it's about to release into the next panel. driverRect is the
  // outer scroll driver's own rect (.project-panel — a descendant's rect
  // stops changing once its pin engages, which would freeze this). Panels
  // now carry a normal-flow .panel-copy block BEFORE the pinned frame
  // (index.html), so its own height has to come off both the numerator
  // and denominator here — otherwise the text's height (which varies with
  // its content and the device's text size) would eat into what's meant
  // to be pure pin-hold progress, and every hand-tuned crossfade/arrival
  // window below would fire later than intended, or on some phones not
  // reach 1 (release) at all before the driver runs out of height.
  function pinProgress(driverRect, textHeight, viewportHeight) {
    const total = Math.max(1, driverRect.height - textHeight - viewportHeight);
    return clamp((-driverRect.top - textHeight) / total);
  }

  const prologue = document.querySelector(".prologue");
  const prologueImage = document.querySelector(".prologue-image-primary img");
  const prologueLayer = document.querySelector(".prologue-image-layer");
  const projectsSection = document.querySelector(".projects-scroll");
  const projectPanels = Array.from(document.querySelectorAll(".project-panel"));
  const photoCards = Array.from(document.querySelectorAll(".photo-card"));
  const photoStack = document.querySelector(".photo-stack");
  const verandaPanel = document.querySelector(".project-panel--veranda");
  let scrollFrame = 0;
  // Set by initLightbox() below; called by initDepthGallery() to open the
  // same lightbox on a mobile archive-card tap (see there for why).
  let openLightboxWith = null;

  // Widened further (0.49-0.84, was 0.49-0.77) so each photo needs
  // noticeably more scrolling before the next one arrives. Cave's own
  // reveal window below is pushed out to start at the same 0.84 to match.
  const PHOTO_ARRIVAL_START = 0.49;
  const PHOTO_ARRIVAL_END = 0.84;

  function placePhotoCard(card, progress) {
    const x = Number(card.dataset.x || -50);
    const y = Number(card.dataset.y || -50);
    const rotation = Number(card.dataset.rotate || 0);
    const lift = (1 - progress) * 48;
    const scale = 0.94 + progress * 0.06;
    card.style.opacity = String(progress);
    card.style.transform = `translate(${x}%, ${y}%) translateY(${lift}px) rotate(${rotation * progress}deg) scale(${scale})`;
  }

  // Hand-tuned for today's 4 primary panels — interleaved on purpose with
  // the véranda photo-stack's own arrival windows below (panel 3's window
  // only starts at 0.77, after the photo stack has had room to fan out).
  // A panel count other than 4 falls back to evenly-spaced windows in
  // revealWindowsFor() rather than leaving later panels' clip-path
  // undefined — but that fallback is a safety net, not a substitute for
  // hand-tuning a new primary panel's choreography (see CONTENT.md).
  const REVEAL_WINDOWS_DEFAULT = [
    [0.16, 0.31],
    [0.37, 0.52],
    [0.84, 0.91],
  ];

  function revealWindowsFor(count) {
    if (count - 1 === REVEAL_WINDOWS_DEFAULT.length) return REVEAL_WINDOWS_DEFAULT;
    const windows = [];
    for (let index = 1; index < count; index += 1) {
      const span = 1 / count;
      windows.push([index * span - span * 0.4, index * span + span * 0.1]);
    }
    return windows;
  }

  // "Stage 2" content: cabane/nike/cave each carry a second set of media
  // (data-stage="2") that crossfades in over the first (data-stage="1")
  // partway through the panel's own scroll, then stays — same idea as
  // doubling the section. Desktop drives this off the shared pinned-
  // scroll progress (a window within that panel's own dominant range);
  // mobile (panels aren't pinned) drives it off the panel's own position
  // in the viewport, same technique as the véranda photo-stack below.
  const stagePanels = Array.from(document.querySelectorAll("[data-stage-panel]"));

  function applyStageProgress(panel, local) {
    const fadeOut = 1 - range(local, 0, 0.5);
    const fadeIn = range(local, 0.5, 1);
    // "auto", not "" — [data-stage="2"]'s own CSS default is
    // pointer-events: none (so it doesn't intercept clicks/hover while
    // invisible pre-crossfade); clearing the inline override back to ""
    // just falls back to that permanent none, leaving it unhoverable and
    // unclickable forever even once fully faded in. Stage 1 has no such
    // CSS default (auto already), so "" would've been fine there too,
    // but being explicit on both sides keeps the two branches symmetric.
    panel.querySelectorAll('[data-stage="1"]').forEach((el) => {
      el.style.opacity = String(fadeOut);
      el.style.pointerEvents = fadeOut < 0.05 ? "none" : "auto";
    });
    panel.querySelectorAll('[data-stage="2"]').forEach((el) => {
      el.style.opacity = String(fadeIn);
      el.style.pointerEvents = fadeIn < 0.05 ? "none" : "auto";
    });
  }

  // Hand-tuned within the overall pinned-scroll progress: each window
  // sits inside that panel's own dominant range (after its own reveal
  // has finished, before the next panel's reveal takes over), so the
  // crossfade never fights the panel-to-panel transition.
  const STAGE_WINDOWS_DESKTOP = {
    cabane: [0.05, 0.14],
    // Nike's own reveal finishes at 0.31 and véranda's starts covering it
    // at 0.37 (see REVEAL_WINDOWS_DEFAULT), so this only has a 0.06
    // window to work with — pushed further into it (was 0.32-0.4, started
    // almost immediately after nike settled) so the first poster gets
    // real time on screen before the crossfade begins.
    nike: [0.345, 0.365],
    cave: [0.93, 0.99],
  };

  function updateStagesDesktop(progress) {
    stagePanels.forEach((panel) => {
      const slug = panel.dataset.stagePanel;
      const w = STAGE_WINDOWS_DESKTOP[slug];
      if (!w) return;
      applyStageProgress(panel, range(progress, w[0], w[1]));
    });
  }

  function updateScrollScenes() {
    scrollFrame = 0;

    if (prologue && prologueImage && prologueLayer && !reducedMotion.matches) {
      const rect = prologue.getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(1, rect.height));
      prologueImage.style.transform = `translateY(${progress * 4}%) scale(${1.04 + progress * 0.14})`;
      prologueLayer.style.transform = `translateY(${-progress * 8}%)`;
    }

    if (!projectsSection || reducedMotion.matches || !desktop.matches) return;

    const rect = projectsSection.getBoundingClientRect();
    const travel = Math.max(1, projectsSection.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel);
    const revealWindows = revealWindowsFor(projectPanels.length);

    projectPanels.forEach((panel, index) => {
      if (index === 0) return;
      const [start, end] = revealWindows[index - 1];
      const reveal = range(progress, start, end);
      panel.style.clipPath = `inset(0 ${(1 - reveal) * 100}% 0 0)`;
    });

    // Each photo gets its own non-overlapping window: half of it is the
    // fade/lift transition, the other half is a settled hold where the
    // card sits still at full opacity — long enough to actually hover it
    // — before the next one starts. Previously these windows overlapped
    // by more than half, so two cards were mid-transition at once and
    // neither ever settled.
    const photoPeriod = (PHOTO_ARRIVAL_END - PHOTO_ARRIVAL_START) / Math.max(1, photoCards.length);
    photoCards.forEach((card, index) => {
      const start = PHOTO_ARRIVAL_START + index * photoPeriod;
      const arrival = range(progress, start, start + photoPeriod * 0.5);
      placePhotoCard(card, arrival);
    });

    updateStagesDesktop(progress);
  }

  function requestScrollUpdate() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollScenes);
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  desktop.addEventListener?.("change", requestScrollUpdate);
  reducedMotion.addEventListener?.("change", requestScrollUpdate);

  // Hand-tuned for today's 4 index-list entries, same reasoning as
  // REVEAL_WINDOWS_DEFAULT above — kept exact for 4, evenly spaced
  // otherwise so a jump target never comes back undefined.
  const JUMP_STOPS_DEFAULT = [0.02, 0.32, 0.6, 0.92];

  function jumpStopsFor(count) {
    if (count === JUMP_STOPS_DEFAULT.length) return JUMP_STOPS_DEFAULT;
    if (count <= 1) return [0.02];
    const first = JUMP_STOPS_DEFAULT[0];
    const last = JUMP_STOPS_DEFAULT[JUMP_STOPS_DEFAULT.length - 1];
    return Array.from({ length: count }, (_, index) => first + (last - first) * (index / (count - 1)));
  }

  document.querySelectorAll("[data-project-jump]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!projectsSection || !desktop.matches || reducedMotion.matches) return;
      event.preventDefault();
      const index = Number(link.dataset.projectJump || 0);
      const stops = jumpStopsFor(projectPanels.length);
      const travel = projectsSection.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: projectsSection.offsetTop + travel * stops[index],
        behavior: "smooth",
      });
    });
  });

  // Mobile véranda: same idea as desktop's scroll-linked photo reveal
  // above, driven off the panel's own progress through the viewport —
  // .project-panel--veranda is a tall scroll "driver" (styles.css), with
  // .panel-sticky inside it pinned via position: sticky, so the section
  // visually holds still while this scroll math plays the photos out; the
  // rect read here MUST be the outer driver, not .photo-stack itself —
  // .photo-stack is inside the pinned frame, so once pinning engages its
  // own rect stops changing (it's visually frozen), which would freeze
  // this progress calculation too.
  const verandaCopy = verandaPanel?.querySelector(".panel-copy");

  if (photoStack && verandaPanel) {
    if (reducedMotion.matches) {
      photoCards.forEach((card) => placePhotoCard(card, 1));
    } else {
      let mobileStackFrame = 0;

      function updateMobilePhotoStack() {
        mobileStackFrame = 0;
        if (desktop.matches) return;
        const rect = verandaPanel.getBoundingClientRect();
        const textHeight = verandaCopy?.offsetHeight || 0;
        const progress = pinProgress(rect, textHeight, window.innerHeight);
        const period = 1 / Math.max(1, photoCards.length);
        photoCards.forEach((card, index) => {
          const start = index * period;
          const arrival = range(progress, start, start + period * 0.6);
          placePhotoCard(card, arrival);
        });
      }

      function requestMobilePhotoUpdate() {
        if (mobileStackFrame) return;
        mobileStackFrame = window.requestAnimationFrame(updateMobilePhotoStack);
      }

      window.addEventListener("scroll", requestMobilePhotoUpdate, { passive: true });
      window.addEventListener("resize", requestMobilePhotoUpdate, { passive: true });
      desktop.addEventListener?.("change", requestMobilePhotoUpdate);
      requestMobilePhotoUpdate();
    }
  }

  // Mobile stage crossfade: same panels as STAGE_WINDOWS_DESKTOP above.
  // Each panel is a tall scroll driver with a position: sticky frame
  // pinned inside it (see .panel-sticky in styles.css) — raw here is
  // "how far through that pinned dwell", 0 at the moment it engages, 1
  // as it's about to release into the next panel, same formula as the
  // véranda mobile progress above (must read the driver's own rect, not
  // a descendant — a descendant's rect stops changing once pinned).
  if (stagePanels.length) {
    if (reducedMotion.matches) {
      stagePanels.forEach((panel) => applyStageProgress(panel, 0));
    } else {
      let mobileStageFrame = 0;

      // Nike gets a later-starting window than the default — same reason
      // as STAGE_WINDOWS_DESKTOP above, more time on the first poster
      // before it crossfades.
      const STAGE_WINDOW_MOBILE_DEFAULT = [0.55, 0.85];
      const STAGE_WINDOWS_MOBILE = { nike: [0.68, 0.85] };

      function updateMobileStages() {
        mobileStageFrame = 0;
        if (desktop.matches) return;
        stagePanels.forEach((panel) => {
          const rect = panel.getBoundingClientRect();
          const textHeight = panel.querySelector(".panel-copy")?.offsetHeight || 0;
          const raw = pinProgress(rect, textHeight, window.innerHeight);
          const w = STAGE_WINDOWS_MOBILE[panel.dataset.stagePanel] || STAGE_WINDOW_MOBILE_DEFAULT;
          applyStageProgress(panel, range(raw, w[0], w[1]));
        });
      }

      function requestMobileStageUpdate() {
        if (mobileStageFrame) return;
        mobileStageFrame = window.requestAnimationFrame(updateMobileStages);
      }

      window.addEventListener("scroll", requestMobileStageUpdate, { passive: true });
      window.addEventListener("resize", requestMobileStageUpdate, { passive: true });
      desktop.addEventListener?.("change", requestMobileStageUpdate);
      requestMobileStageUpdate();
    }
  }

  // Mobile: a small fade/rise-in as each big-project section first
  // scrolls into view — panels here are plain stacked flow (no pinning),
  // so without this they just appear instantly with no transition at all.
  if (!reducedMotion.matches) {
    const panelObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    function syncPanelReveal() {
      projectPanels.forEach((panel) => {
        if (desktop.matches) {
          panel.classList.add("is-revealed");
          panelObserver.unobserve(panel);
        } else {
          panelObserver.observe(panel);
        }
      });
    }

    syncPanelReveal();
    desktop.addEventListener?.("change", syncPanelReveal);
  } else {
    projectPanels.forEach((panel) => panel.classList.add("is-revealed"));
  }

  function initReverseMosaic(canvas) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    let pointerX = -10000;
    let pointerY = -10000;
    let drawFrame = 0;
    let ready = false;

    function scheduleDraw() {
      if (drawFrame) return;
      drawFrame = window.requestAnimationFrame(draw);
    }

    function draw() {
      drawFrame = 0;
      if (!ready) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);

      const imageRatio = image.width / image.height;
      const canvasRatio = width / height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.width;
      let sourceHeight = image.height;

      if (imageRatio > canvasRatio) {
        sourceWidth = image.height * canvasRatio;
        sourceX = (image.width - sourceWidth) / 2;
      } else {
        sourceHeight = image.width / canvasRatio;
        sourceY = (image.height - sourceHeight) / 2;
      }

      if (reducedMotion.matches || coarsePointer.matches) {
        context.globalAlpha = 0.62;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
        context.globalAlpha = 1;
        return;
      }

      const tile = Math.max(18, Math.round(width / 36));
      const radius = width * 0.15;
      const localPointerX = pointerX * dpr;
      const localPointerY = pointerY * dpr;

      for (let y = 0; y < height; y += tile) {
        for (let x = 0; x < width; x += tile) {
          const distance = Math.hypot(x + tile / 2 - localPointerX, y + tile / 2 - localPointerY);
          const influence = clamp(1 - distance / radius);
          const sx = sourceX + (x / width) * sourceWidth;
          const sy = sourceY + (y / height) * sourceHeight;
          const sw = (tile / width) * sourceWidth;
          const sh = (tile / height) * sourceHeight;

          // The reference effect (design system: image-treatment/
          // canvas-grid-mouse-effect) draws every tile at its full,
          // unchanging destination size — the DESTINATION never shrinks,
          // so nothing behind the canvas is ever revealed. What changes
          // near the cursor is the SOURCE crop: it shrinks toward its own
          // center and gets stretched back up to fill the tile, so the
          // image warps/zooms in on itself instead of the tile shrinking
          // away to a gap.
          const cropFraction = Math.max(0.015, 1 - influence);
          const cropW = sw * cropFraction;
          const cropH = sh * cropFraction;
          const cropX = sx + (sw - cropW) / 2;
          const cropY = sy + (sh - cropH) / 2;

          context.drawImage(image, cropX, cropY, cropW, cropH, x, y, tile, tile);

          // A white dot grows in on top as the crop warps, matching the
          // reference's halftone-dot look right at the cursor.
          const dotRadius = tile * 0.16 * influence;
          if (dotRadius > 0.6) {
            context.beginPath();
            context.arc(x + tile / 2, y + tile / 2, dotRadius, 0, Math.PI * 2);
            context.fillStyle = "#fff";
            context.fill();
          }
        }
      }
    }

    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      scheduleDraw();
    });

    canvas.addEventListener("pointerleave", () => {
      pointerX = -10000;
      pointerY = -10000;
      scheduleDraw();
    });

    window.addEventListener("resize", scheduleDraw, { passive: true });
    reducedMotion.addEventListener?.("change", scheduleDraw);
    coarsePointer.addEventListener?.("change", scheduleDraw);

    image.addEventListener("load", () => {
      ready = true;
      scheduleDraw();
    });
    const sourceElement = document.getElementById(canvas.dataset.mosaicSource);
    if (!sourceElement) return;
    image.src = sourceElement.currentSrc || sourceElement.src;
  }

  document.querySelectorAll("canvas[data-mosaic-source]").forEach(initReverseMosaic);

  function initDepthGallery(gallery) {
    const cards = Array.from(gallery.querySelectorAll(".depth-card"));
    const archive = gallery.closest(".archive");
    const number = gallery.querySelector("[data-gallery-number]");
    const title = gallery.querySelector("[data-gallery-title]");
    const type = gallery.querySelector("[data-gallery-type]");
    let activeIndex = 0;

    function normalizedPosition(index) {
      const raw = (index - activeIndex + cards.length) % cards.length;
      if (raw === 0) return 0;
      if (raw <= 2) return raw;
      return raw - cards.length;
    }

    function select(index) {
      activeIndex = (index + cards.length) % cards.length;
      cards.forEach((card, cardIndex) => {
        const isActive = cardIndex === activeIndex;
        card.dataset.position = String(normalizedPosition(cardIndex));
        card.setAttribute("aria-pressed", String(isActive));
      });

      const activeCard = cards[activeIndex];
      number.textContent = `${activeCard.dataset.number} / ${String(cards.length).padStart(2, "0")}`;
      title.textContent = activeCard.dataset.title;
      type.textContent = activeCard.dataset.type;
      if (archive) archive.dataset.mood = String(activeIndex);
    }

    // Focus mode: a first click on any card is the existing carousel
    // select() below, unchanged. A second click, specifically on the card
    // that's already centered, leaves it exactly where it is and instead
    // blurs the cards around it, scattering any relatedImages for that
    // project (empty today for every project — see csv/archive.csv — so
    // this currently just blurs the surroundings with nothing to scatter;
    // it lights up automatically once a project has related images).
    let focusActive = false;
    let relatedContainer = null;

    function clearRelatedImages() {
      if (relatedContainer) {
        relatedContainer.remove();
        relatedContainer = null;
      }
    }

    function renderRelatedImages(project) {
      clearRelatedImages();
      const images = project?.relatedImages || [];
      if (!images.length) return;
      const container = document.createElement("div");
      container.className = "depth-related";
      // The active card is only ~35vw wide, centered, in a full-width
      // gallery — there's real room either side of it on desktop. Angle 0
      // starts pointing right (not up), so two images land left/right of
      // the image instead of directly above/below it. Positions are
      // computed in real pixels off the gallery's own measured box (not
      // fixed percentages) and clamped to it, so the images never run
      // off the edge — .depth-gallery clips overflow, so anything placed
      // outside its bounds was getting cut off rather than just spilling
      // past the section.
      const IMG_W = 172;
      const IMG_H = 224;
      const MARGIN = 12;
      const galleryRect = gallery.getBoundingClientRect();
      const centerX = galleryRect.width / 2;
      const centerY = galleryRect.height * 0.46;
      const radiusX = Math.min(galleryRect.width * 0.42, centerX - IMG_W / 2 - MARGIN);
      const radiusY = Math.min(galleryRect.height * 0.2, centerY - IMG_H / 2 - MARGIN);
      const minX = IMG_W / 2 + MARGIN;
      const maxX = galleryRect.width - IMG_W / 2 - MARGIN;
      const minY = IMG_H / 2 + MARGIN;
      const maxY = galleryRect.height - IMG_H / 2 - MARGIN;

      images.forEach((src, index) => {
        const angle = (index / images.length) * Math.PI * 2;
        const x = clamp(centerX + Math.cos(angle) * radiusX, minX, maxX);
        const y = clamp(centerY + Math.sin(angle) * radiusY, minY, maxY);
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Autre vue du projet ${project.title || ""}`.trim();
        img.loading = "lazy";
        img.className = "is-closeupable";
        img.tabIndex = 0;
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", `Agrandir : ${img.alt}`);
        img.style.left = `${x}px`;
        img.style.top = `${y}px`;
        img.style.animationDelay = `${index * -1.3}s`;
        img.style.transitionDelay = `${index * 60}ms`;
        // Same close-up lightbox every other photo on the site uses.
        img.addEventListener("click", (event) => {
          event.stopPropagation();
          openLightboxWith?.(img);
        });
        img.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          openLightboxWith?.(img);
        });
        container.appendChild(img);
      });
      gallery.appendChild(container);
      relatedContainer = container;
      window.requestAnimationFrame(() => container.classList.add("is-visible"));
    }

    function exitFocus() {
      if (!focusActive) return;
      focusActive = false;
      gallery.classList.remove("is-focused");
      clearRelatedImages();
    }

    function enterFocus() {
      if (focusActive) return;
      focusActive = true;
      gallery.classList.add("is-focused");
      const data = window.SITE_ARCHIVE || [];
      const activeCard = cards[activeIndex];
      const project = data.find((item) => item.slug === activeCard?.dataset.slug) || data[activeIndex];
      renderRelatedImages(project);
    }

    cards.forEach((card, index) => {
      card.addEventListener("click", () => {
        // Mobile: no coverflow, no select()/focus-mode — the layout is a
        // vertical zigzag list (see styles.css) and a single tap just
        // opens the same close-up lightbox the primary project photos
        // use. Desktop keeps the existing click-to-center / second-click-
        // focus-mode behavior exactly as it was.
        if (!desktop.matches) {
          select(index);
          openLightboxWith?.(card);
          return;
        }
        if (index === activeIndex) {
          if (focusActive) exitFocus();
          else enterFocus();
          return;
        }
        if (focusActive) exitFocus();
        select(index);
      });
    });

    gallery.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (focusActive) exitFocus();
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (focusActive) exitFocus();
      select(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
    });

    if (!reducedMotion.matches && !coarsePointer.matches) {
      gallery.addEventListener("pointermove", (event) => {
        const rect = gallery.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        cards.forEach((card) => {
          const position = Math.abs(Number(card.dataset.position));
          const depth = position === 0 ? 9 : position === 1 ? 17 : 25;
          card.style.setProperty("--float-x", `${x * depth}px`);
          card.style.setProperty("--float-y", `${y * depth}px`);
        });
      });

      gallery.addEventListener("pointerleave", () => {
        cards.forEach((card) => {
          card.style.setProperty("--float-x", "0px");
          card.style.setProperty("--float-y", "0px");
        });
      });
    }

    // Slow ambient drift for the satellite cards only — the centered card
    // (position 0) never moves on its own; select() is the only thing
    // that ever changes which project is centered, unchanged from before.
    // Each satellite gently drifts back and forth on its own sine-wave
    // phase, added on top of the pointermove parallax above (same
    // --float-x/--float-y custom properties, see the .depth-card
    // `translate` rule in styles.css) rather than replacing it.
    let idleFrame = 0;

    function idleDrift(timestamp) {
      idleFrame = window.requestAnimationFrame(idleDrift);
      if (reducedMotion.matches || !desktop.matches || focusActive) return;
      cards.forEach((card, index) => {
        if (card.dataset.position === "0") return;
        const phase = index * 1.7;
        const driftX = Math.sin(timestamp / 3400 + phase) * 7;
        const driftY = Math.cos(timestamp / 4300 + phase) * 5;
        card.style.setProperty("--idle-x", `${driftX}px`);
        card.style.setProperty("--idle-y", `${driftY}px`);
      });
    }

    if (!reducedMotion.matches) idleFrame = window.requestAnimationFrame(idleDrift);

    select(0);
  }

  document.querySelectorAll("[data-depth-gallery]").forEach(initDepthGallery);

  // Click-to-close-up: every project photo except backgrounds (the cabane
  // backdrop, the prologue hero) and the archive carousel (which has its
  // own second-click focus mode in initDepthGallery above) opens centered
  // and larger, with the rest of the page dimmed/blurred behind it.
  function initLightbox() {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    const imageEl = document.getElementById("lightbox-image");
    const numberEl = document.getElementById("lightbox-number");
    const titleEl = document.getElementById("lightbox-title");
    const closeButton = lightbox.querySelector(".lightbox-close");
    const prevButton = lightbox.querySelector(".lightbox-nav--prev");
    const nextButton = lightbox.querySelector(".lightbox-nav--next");
    let triggerEl = null;
    // The photo currently open, plus its siblings (same project) when
    // there are any — lets prev/next browse sideways through that
    // project's other photos without leaving the lightbox. A single photo
    // (group.length === 1) just hides the arrows.
    let group = [];
    let groupIndex = 0;

    const triggers = Array.from(
      document.querySelectorAll(
        [
          ".project-panel--cabane .project-media",
          ".project-panel--veranda .project-media",
          ".project-panel--cave .project-media",
          ".nike-poster",
        ].join(", "),
      ),
    );

    function descriptorFromEl(el) {
      const img = el.tagName === "IMG" ? el : el.querySelector("img");
      if (!img) return null;
      const number = el.querySelector?.(".media-caption span")?.textContent || "";
      const label = el.querySelector?.(".media-caption strong")?.textContent || img.alt || "";
      return { src: img.currentSrc || img.src, alt: img.alt || "", number, label };
    }

    // Prologue/backdrop images and the archive's own coverflow cards
    // aren't lightbox triggers (see the comment above this function), so
    // el.closest() here only ever matches one of the two group kinds
    // below, or neither (a single-photo group).
    function groupFor(el) {
      const panel = el.closest?.(".project-panel");
      if (panel) {
        const members = Array.from(panel.querySelectorAll(".project-media, .nike-poster"))
          .map(descriptorFromEl)
          .filter(Boolean);
        if (members.length > 1) return members;
      }

      // Archive related images: siblings are the focused project's own
      // relatedImages (desktop-only — mobile never renders/focuses this
      // group, see initDepthGallery's click handler).
      if (desktop.matches && el.closest?.(".depth-related")) {
        const gallery = el.closest(".depth-gallery");
        const activeCard = gallery?.querySelector('.depth-card[aria-pressed="true"]');
        const data = window.SITE_ARCHIVE || [];
        const project = data.find((item) => item.slug === activeCard?.dataset.slug);
        const images = project?.relatedImages || [];
        if (images.length > 1) {
          return images.map((src, index) => ({
            // Resolved to an absolute URL (new URL(...).href), matching
            // what descriptorFromEl reads off a live <img> via
            // currentSrc/src below — relatedImages comes straight from
            // csv/archive.csv as a relative "./assets/..." string, which
            // wouldn't string-match the browser-resolved src open() uses
            // to find the clicked photo's starting index in this group.
            src: new URL(src, document.baseURI).href,
            alt: `Autre vue du projet ${project.title || ""}`.trim(),
            number: String(index + 1).padStart(2, "0"),
            label: project.title || "",
          }));
        }
      }

      return null;
    }

    function renderCurrent() {
      const item = group[groupIndex];
      if (!item) return;
      imageEl.src = item.src;
      imageEl.alt = item.alt || "";
      numberEl.textContent = item.number || "";
      numberEl.hidden = !item.number;
      titleEl.textContent = item.label || "";
      titleEl.hidden = !item.label;
      const hasGroup = group.length > 1;
      prevButton.hidden = !hasGroup;
      nextButton.hidden = !hasGroup;
    }

    function step(delta) {
      if (group.length < 2) return;
      groupIndex = (groupIndex + delta + group.length) % group.length;
      renderCurrent();
    }

    function open(el) {
      const own = descriptorFromEl(el);
      if (!own) return;
      triggerEl = el;
      const siblings = groupFor(el);
      if (siblings) {
        group = siblings;
        const matchIndex = siblings.findIndex((item) => item.src === own.src);
        groupIndex = matchIndex >= 0 ? matchIndex : 0;
      } else {
        group = [own];
        groupIndex = 0;
      }
      renderCurrent();
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-lock");
      document.addEventListener("keydown", onKeydown);
      closeButton.focus();
    }

    function close() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-lock");
      document.removeEventListener("keydown", onKeydown);
      triggerEl?.focus();
      triggerEl = null;
      group = [];
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key === "ArrowLeft") {
        step(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        step(1);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(lightbox.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.hidden,
      );
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
    }

    triggers.forEach((el) => {
      el.classList.add("is-closeupable");
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      const label = el.querySelector("strong")?.textContent || el.getAttribute("alt") || "l’image";
      el.setAttribute("aria-label", `Agrandir : ${label}`);
      el.addEventListener("click", () => open(el));
      el.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open(el);
      });
    });

    closeButton.addEventListener("click", close);
    prevButton.addEventListener("click", () => step(-1));
    nextButton.addEventListener("click", () => step(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });

    openLightboxWith = open;
  }

  initLightbox();

  const proximityWord = document.querySelector("[data-proximity-word]");
  if (proximityWord && !reducedMotion.matches && !coarsePointer.matches) {
    const letters = Array.from(proximityWord.children);
    const about = proximityWord.closest(".about");

    about.addEventListener("pointermove", (event) => {
      letters.forEach((letter) => {
        const rect = letter.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
        const influence = clamp(1 - distance / 260);
        const weight = Math.round(470 + influence * 400);
        letter.style.fontVariationSettings = `"wght" ${weight}`;
        letter.style.transform = `translateY(${-influence * 4}px)`;
      });
    });

    about.addEventListener("pointerleave", () => {
      letters.forEach((letter) => {
        letter.style.fontVariationSettings = '"wght" 470';
        letter.style.transform = "translateY(0)";
      });
    });
  }

  if (reducedMotion.matches) {
    photoCards.forEach((card) => placePhotoCard(card, 1));
  }

  requestScrollUpdate();
})();
