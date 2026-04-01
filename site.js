(() => {
  const PHONE_DISPLAY = "+7 (965) 259-59-12";
  const TRACKING_PARAMS = ["utm_", "gclid", "fbclid", "ysclid", "yclid", "_openstat", "_ym_debug"];
  let toastTimer = null;

  function normalizeUrl() {
    const url = new URL(window.location.href);
    let changed = false;

    for (const key of [...url.searchParams.keys()]) {
      const isTracking = TRACKING_PARAMS.some((item) => key === item || key.startsWith(item));
      if (!isTracking) continue;
      url.searchParams.delete(key);
      changed = true;
    }

    if (url.pathname.endsWith("/index.html")) {
      url.pathname = url.pathname.slice(0, -"/index.html".length) || "/";
      changed = true;
    }

    if (!changed) return;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function ensureToast() {
    let toast = document.querySelector(".copy-toast");
    if (toast) return toast;
    toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(message) {
    const toast = ensureToast();
    toast.textContent = message;
    toast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 1400);
  }

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(PHONE_DISPLAY);
      showToast("Номер скопирован");
    } catch (error) {
      showToast("Не удалось скопировать номер");
    }
  }

  function enablePhoneCopy() {
    const desktop = window.matchMedia("(min-width: 721px)");
    document.addEventListener("click", (event) => {
      const explicitTrigger = event.target.closest("[data-copy-phone]");
      if (explicitTrigger) {
        event.preventDefault();
        copyPhone();
        return;
      }

      const telLink = event.target.closest('a[href^="tel:"]');
      if (!telLink || !desktop.matches) return;
      event.preventDefault();
      copyPhone();
    });
  }

  function setupMobileTopCta() {
    const mobileTopCta = document.querySelector(".mobile-top-cta");
    if (!mobileTopCta) return;

    const mobile = window.matchMedia("(max-width: 720px)");
    const brandbar = document.querySelector(".brandbar");
    const heroCallButton = document.querySelector('.hero .button.primary[href^="tel:"]');
    let anchoredY = window.scrollY;
    let isVisible = false;
    let ticking = false;
    const directionThreshold = 10;

    function syncHeaderOffset() {
      const fallback = 96;
      const headerHeight = brandbar ? Math.ceil(brandbar.getBoundingClientRect().height) : fallback;
      document.documentElement.style.setProperty("--mobile-brandbar-height", `${Math.max(headerHeight, fallback)}px`);
    }

    function setVisible(nextVisible) {
      if (isVisible === nextVisible) return;
      isVisible = nextVisible;
      mobileTopCta.classList.toggle("is-visible", isVisible);
    }

    function update() {
      syncHeaderOffset();
      const y = window.scrollY;

      if (!mobile.matches) {
        setVisible(false);
        anchoredY = y;
        ticking = false;
        return;
      }

      const showAfter = Math.max(Math.round(window.innerHeight * 0.35), 180);
      const headerBottom = brandbar ? brandbar.getBoundingClientRect().bottom : 0;
      let heroButtonVisible = false;

      if (heroCallButton) {
        const rect = heroCallButton.getBoundingClientRect();
        heroButtonVisible = rect.bottom > headerBottom && rect.top < window.innerHeight;
      }

      const deltaFromAnchor = y - anchoredY;
      const isGoingUp = deltaFromAnchor <= -directionThreshold;
      const isGoingDown = deltaFromAnchor >= directionThreshold;

      if (isGoingUp || isGoingDown) {
        anchoredY = y;
      }

      let shouldShow = isVisible;
      if (y <= showAfter || heroButtonVisible || isGoingDown) {
        shouldShow = false;
      } else if (isGoingUp) {
        shouldShow = true;
      }

      setVisible(shouldShow);
      ticking = false;
    }

    setVisible(false);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  document.addEventListener("DOMContentLoaded", () => {
    normalizeUrl();
    enablePhoneCopy();
    setupMobileTopCta();
  });
})();
