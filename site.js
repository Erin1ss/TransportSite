(() => {
  const PHONE_DISPLAY = "+7 (965) 259-59-12";
  let toastTimer = null;

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

  function enableDesktopPhoneCopy() {
    const desktop = window.matchMedia("(min-width: 721px)");
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="tel:"]');
      if (!link || !desktop.matches) return;
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
    let lastY = window.scrollY;
    let ticking = false;

    function syncHeaderOffset() {
      const fallback = 96;
      const headerHeight = brandbar ? Math.ceil(brandbar.getBoundingClientRect().height) : fallback;
      document.documentElement.style.setProperty("--mobile-brandbar-height", `${Math.max(headerHeight, fallback)}px`);
    }

    function update() {
      syncHeaderOffset();

      if (!mobile.matches) {
        mobileTopCta.classList.remove("is-visible");
        lastY = window.scrollY;
        return;
      }

      const y = window.scrollY;
      const isGoingUp = y < lastY;
      const showAfter = Math.max(Math.round(window.innerHeight * 0.35), 180);
      const headerBottom = brandbar ? brandbar.getBoundingClientRect().bottom : 0;
      let heroButtonVisible = false;

      if (heroCallButton) {
        const rect = heroCallButton.getBoundingClientRect();
        heroButtonVisible = rect.bottom > headerBottom && rect.top < window.innerHeight;
      }

      const shouldShow = isGoingUp && y > showAfter && !heroButtonVisible;
      mobileTopCta.classList.toggle("is-visible", shouldShow);
      lastY = y;
      ticking = false;
    }

    mobileTopCta.classList.remove("is-visible");
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
    enableDesktopPhoneCopy();
    setupMobileTopCta();
  });
})();
