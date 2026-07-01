(() => {
  const PHONE_DISPLAY = "8 962 559 59 12";
  const PHONE_TEL = "+79625595912";
  const TRACKING_PARAMS = ["utm_", "gclid", "fbclid", "ysclid", "yclid", "_openstat", "_ym_debug"];
  const SERVICE_PAGES = [
    { title: "Главная", url: "/" },
    { title: "Контакты", url: "/contacts.html" },
    { title: "Стоимость", url: "/prices.html" },
    { title: "FAQ", url: "/faq.html" },
    { title: "Отзывы", url: "/testimonials.html" },
    { title: "Из больницы домой", url: "/iz-bolnicy-domoy.html" },
    { title: "КТ, МРТ и процедуры", url: "/kt-mrt-procedury.html" },
    { title: "Межгород по Татарстану", url: "/mezhgorod-po-tatarstanu.html" },
    { title: "Подъём и спуск без лифта", url: "/podem-spusk-bez-lifta.html" },
    { title: "Пожилые и маломобильные пассажиры", url: "/pozhilye-i-malomobilnye.html" },
  ];
  const PRICING_FACTORS = [
    "Маршрут: город, Татарстан или межгород",
    "Этаж, лифт, лестница и расстояние до транспорта",
    "Необходимость подъёма или спуска без лифта",
    "Ожидание у клиники, КТ, МРТ, процедуры или консультации",
    "Плановая, срочная, ночная или фиксированная по времени подача",
    "Особенности пассажира: коляска, послеоперационное состояние, ограниченная мобильность",
  ];
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

  function registerWebMcpTools() {
    const modelContext = navigator.modelContext;
    if (!modelContext) return;

    const tools = [
      {
        name: "get_contact_info",
        description: "Return public contact details for ЕдемЛежа.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          phone: PHONE_DISPLAY,
          tel: `tel:${PHONE_TEL}`,
          contactPage: `${window.location.origin}/contacts.html`,
          serviceArea: ["Казань", "Республика Татарстан"],
          emergencyNotice: "Для экстренной медицинской помощи звоните 103 или 112.",
        }),
      },
      {
        name: "list_service_pages",
        description: "Return the main public service pages on edemleza.ru.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          pages: SERVICE_PAGES.map((page) => ({
            title: page.title,
            url: new URL(page.url, window.location.origin).href,
          })),
        }),
      },
      {
        name: "get_pricing_factors",
        description: "Return public factors that affect route-specific transport estimates.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          factors: PRICING_FACTORS,
          pricingPage: `${window.location.origin}/prices.html`,
          note: "Точный расчёт зависит от маршрута и условий переноса.",
        }),
      },
    ];

    const controller = new AbortController();
    window.addEventListener("pagehide", () => controller.abort(), { once: true });

    try {
      if (typeof modelContext.registerTool === "function") {
        tools.forEach((tool) => modelContext.registerTool(tool, { signal: controller.signal }));
      }

      if (typeof modelContext.provideContext === "function") {
        modelContext.provideContext({ tools }, { signal: controller.signal });
      }
    } catch (error) {
      // WebMCP is experimental; failures should not affect normal site behavior.
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    normalizeUrl();
    enablePhoneCopy();
    setupMobileTopCta();
    registerWebMcpTools();
  });
})();
