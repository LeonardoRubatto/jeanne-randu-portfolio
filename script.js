(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 900px)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const range = (value, start, end) => clamp((value - start) / (end - start));

  const prologue = document.querySelector(".prologue");
  const prologueImage = document.querySelector(".prologue-image-primary img");
  const prologueLayer = document.querySelector(".prologue-image-layer");
  const projectsSection = document.querySelector(".projects-scroll");
  const projectPanels = Array.from(document.querySelectorAll(".project-panel"));
  const photoCards = Array.from(document.querySelectorAll(".photo-card"));
  const photoStack = document.querySelector(".photo-stack");
  let scrollFrame = 0;

  // Same overall scroll-progress envelope as before (0.49-0.77) — only how
  // it's divided among the cards changes, so this doesn't touch the cave
  // panel's own reveal timing below.
  const PHOTO_ARRIVAL_START = 0.49;
  const PHOTO_ARRIVAL_END = 0.77;

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
    [0.77, 0.91],
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

  if (photoStack && (!desktop.matches || reducedMotion.matches)) {
    if (reducedMotion.matches) {
      photoCards.forEach((card) => placePhotoCard(card, 1));
    } else {
      const stackObserver = new IntersectionObserver(
        (entries, observer) => {
          if (!entries[0].isIntersecting) return;
          photoStack.classList.add("is-arrived");
          photoCards.forEach((card, index) => {
            window.setTimeout(() => placePhotoCard(card, 1), index * 70);
          });
          observer.disconnect();
        },
        { rootMargin: "0px 0px -18% 0px", threshold: 0.12 },
      );
      stackObserver.observe(photoStack);
    }
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
          // scale reaches exactly 1 (fully solid, no gap) once a tile is
          // outside the hover radius — the mosaic only dissolves right
          // around the cursor, not as a faint grid over the whole image.
          const scale = 0.1 + (1 - influence) * 0.9;
          const size = Math.max(1, (tile - 1.5 * dpr) * scale);
          const sx = sourceX + (x / width) * sourceWidth;
          const sy = sourceY + (y / height) * sourceHeight;
          const sw = (tile / width) * sourceWidth;
          const sh = (tile / height) * sourceHeight;

          context.drawImage(
            image,
            sx,
            sy,
            sw,
            sh,
            x + (tile - size) / 2,
            y + (tile - size) / 2,
            size,
            size,
          );
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
      container.setAttribute("aria-hidden", "true");
      images.forEach((src, index) => {
        const angle = (index / images.length) * Math.PI * 2 - Math.PI / 2;
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        img.style.left = `${50 + Math.cos(angle) * 34}%`;
        img.style.top = `${38 + Math.sin(angle) * 30}%`;
        img.style.transitionDelay = `${index * 60}ms`;
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
      startAutoplay();
    }

    function enterFocus() {
      if (focusActive) return;
      focusActive = true;
      stopAutoplay();
      gallery.classList.add("is-focused");
      const data = window.SITE_ARCHIVE || [];
      const activeCard = cards[activeIndex];
      const project = data.find((item) => item.slug === activeCard?.dataset.slug) || data[activeIndex];
      renderRelatedImages(project);
    }

    cards.forEach((card, index) => {
      card.addEventListener("click", () => {
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

    // Slow auto-advance for the satellite cards — the centered card just
    // ends up being whichever one is currently active, nothing here moves
    // it directly. Pauses on hover/focus so it never fights a click, an
    // arrow-key nav, or the pointermove float effect above; off entirely
    // under reduced motion or a coarse (touch) pointer.
    const AUTOPLAY_INTERVAL_MS = 5200;
    let autoplayTimer = 0;

    function stopAutoplay() {
      window.clearInterval(autoplayTimer);
      autoplayTimer = 0;
    }

    function startAutoplay() {
      if (reducedMotion.matches || coarsePointer.matches || cards.length < 2) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(() => select(activeIndex + 1), AUTOPLAY_INTERVAL_MS);
    }

    gallery.addEventListener("pointerenter", stopAutoplay);
    gallery.addEventListener("pointerleave", startAutoplay);
    gallery.addEventListener("focusin", stopAutoplay);
    gallery.addEventListener("focusout", startAutoplay);
    reducedMotion.addEventListener?.("change", startAutoplay);
    coarsePointer.addEventListener?.("change", startAutoplay);

    select(0);
    startAutoplay();
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
    let triggerEl = null;

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

    function open(el) {
      const img = el.tagName === "IMG" ? el : el.querySelector("img");
      if (!img) return;
      triggerEl = el;
      imageEl.src = img.currentSrc || img.src;
      imageEl.alt = img.alt || "";
      const number = el.querySelector(".media-caption span")?.textContent || "";
      const label = el.querySelector(".media-caption strong")?.textContent || img.alt || "";
      numberEl.textContent = number;
      numberEl.hidden = !number;
      titleEl.textContent = label;
      titleEl.hidden = !label;
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
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = lightbox.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
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
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });
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
