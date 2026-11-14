// Прячет из выдачи публикации с пометкой «Промо» / «Реклама» / «Спонсируется».
// Яндекс помечает рекламный результат иконкой с aria-label="Промо" (иногда текстом «Реклама»).
(() => {
  const AD_WORD = /^(реклама|промо|спонсор|спонсируется|спонсируемый|promo|promoted|sponsored|ad|ads)$/;
  const HIDDEN_ATTR = "data-ad-hidden";
  const CARD_TEXT_LIMIT = 4000;

  const normalize = (s) =>
    s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.:·•|—–-]+$/u, "").trim();

  const isAdLabel = (s) => AD_WORD.test(normalize(s));

  function findMarkers(root) {
    const markers = [];

    // 1. Пометка-иконка: <span aria-label="Промо" role="img"> рядом с доменом.
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

  function hide(card) {
    card.setAttribute(HIDDEN_ATTR, "1");
    card.style.setProperty("display", "none", "important");
  }

  function scan(root = document) {
    let hidden = 0;
    for (const marker of findMarkers(root)) {
      const card = cardOf(marker);
      if (!card) continue;
      hide(card);
      hidden++;
    }
    if (hidden) console.debug("[ads-hider] скрыто публикаций:", hidden);
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
