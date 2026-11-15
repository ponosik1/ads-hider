// Прячет из выдачи рекламные публикации («Промо»/«Реклама») и промо-виджеты
// вроде «Установите Яндекс Браузер».
(() => {
  const AD_WORD = /^(реклама|промо|спонсор|спонсируется|спонсируемый|promo|promoted|sponsored|ad|ads)$/;
  // Промо-виджеты Яндекса размечены классами Distribution*.
  const PROMO_SELECTOR = [
    "[class*='DistributionLinkBro']",
    "[class*='DistributionButton']",
    "[class*='DistributionBanner']",
    "[aria-label*='Яндекс Браузер']",
  ].join(", ");
  const HIDDEN_ATTR = "data-ad-hidden";
  const CARD_TEXT_LIMIT = 4000;

  const normalize = (s) =>
    s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.:·•|—–-]+$/u, "").trim();

  const isAdLabel = (s) => AD_WORD.test(normalize(s));

  function findMarkers(root) {
    const markers = [];

    // 1. Пометка-иконка рекламной карточки: <span aria-label="Промо" role="img">.
    for (const el of root.querySelectorAll("[aria-label]")) {
      if (!isAdLabel(el.getAttribute("aria-label"))) continue;
      if (el.textContent.trim().length > 30) continue;
      markers.push(el);
    }

    // 2. Текстовая пометка отдельным коротким элементом («Реклама» под заголовком).
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = normalize(n.nodeValue);
      if (!text || text.length > 20 || !isAdLabel(text)) continue;
      const el = n.parentElement;
      if (!el || el.hasAttribute("aria-label")) continue;
      if (el.textContent.trim().length > 30) continue;
      markers.push(el);
    }

    return markers;
  }

  function cardOf(marker) {
    const card =
      marker.closest("li") ||
      marker.closest("article, .Organic, .serp-item, [class*='Organic']");
    if (!card || card.hasAttribute(HIDDEN_ATTR)) return null;
    if (!card.querySelector("a[href]")) return null; // не публикация, а подпись/кнопка
    if (card.textContent.length > CARD_TEXT_LIMIT) return null; // это не одна карточка
    return card;
  }

  // Кнопка-промо («Установите Яндекс Браузер») — это ссылка, а не карточка выдачи.
  function promoWidgets(root) {
    const found = [];
    for (const el of root.querySelectorAll(PROMO_SELECTOR)) {
      if (el.closest("[" + HIDDEN_ATTR + "]")) continue;
      let node = el.closest("a") || el;
      for (let i = 0; i < 3; i++) {
        const parent = node.parentElement;
        if (!parent || !/Distribution/.test(parent.getAttribute("class") || "")) break;
        node = parent;
      }
      if (!found.includes(node)) found.push(node);
    }
    return found;
  }

  function hide(el) {
    if (!el || el.hasAttribute(HIDDEN_ATTR)) return 0;
    el.setAttribute(HIDDEN_ATTR, "1");
    el.style.setProperty("display", "none", "important");
    return 1;
  }

  function scan(root = document) {
    let hidden = 0;
    for (const marker of findMarkers(root)) {
      const card = cardOf(marker);
      if (card) hidden += hide(card);
    }
    for (const widget of promoWidgets(root)) hidden += hide(widget);
    if (hidden) console.debug("[ads-hider] скрыто блоков:", hidden);
  }

  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => scan(), 250);
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(), { once: true });
  } else {
    scan();
  }
})();
