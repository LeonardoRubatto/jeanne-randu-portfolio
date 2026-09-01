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

  function placePhotoCard(card, progress) {
    const x = Number(card.dataset.x || -50);
    const y = Number(card.dataset.y || -50);
    const rotation = Number(card.dataset.rotate || 0);
    const lift = (1 - progress) * 48;
    const scale = 0.94 + progress * 0.06;
    card.style.opacity = String(progress);
    card.style.transform = `translate(${x}%, ${y}%) translateY(${lift}px) rotate(${rotation * progress}deg) scale(${scale})`;
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
    const reveals = [1, range(progress, 0.16, 0.31), range(progress, 0.37, 0.52), range(progress, 0.77, 0.91)];

    projectPanels.forEach((panel, index) => {
      if (index === 0) return;
      panel.style.clipPath = `inset(0 ${(1 - reveals[index]) * 100}% 0 0)`;
    });

    photoCards.forEach((card, index) => {
      const arrival = range(progress, 0.49 + index * 0.045, 0.59 + index * 0.045);
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

  document.querySelectorAll("[data-project-jump]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!projectsSection || !desktop.matches || reducedMotion.matches) return;
      event.preventDefault();
      const index = Number(link.dataset.projectJump || 0);
      const stops = [0.02, 0.32, 0.6, 0.92];
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
      const radius = width * 0.26;
      const localPointerX = pointerX * dpr;
      const localPointerY = pointerY * dpr;

      for (let y = 0; y < height; y += tile) {
        for (let x = 0; x < width; x += tile) {
          const distance = Math.hypot(x + tile / 2 - localPointerX, y + tile / 2 - localPointerY);
          const influence = clamp(1 - distance / radius);
          const scale = 0.08 + (1 - influence) * 0.88;
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

    cards.forEach((card, index) => card.addEventListener("click", () => select(index)));

    gallery.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
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

    select(0);
  }

  document.querySelectorAll("[data-depth-gallery]").forEach(initDepthGallery);

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
