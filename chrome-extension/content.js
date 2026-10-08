// GarageView Chrome Extension — Content Script (injected on mobile.de)

(function () {
  "use strict";

  function detectPageType(href) {
    const u = new URL(href);
    const params = u.searchParams;
    // Detail page: has id= with 6+ digit car ID
    const hasId = params.has("id") && /^\d{6,}$/.test(params.get("id"));
    const isCar =
      href.includes("/auto-inserat/") ||
      /mobile\.de\/.*\/\d{6,}/.test(href) ||
      hasId;
    // Search page: has isSearchRequest or (s=Car and vc=Car) query params
    const isSearch =
      !isCar && (
        params.get("isSearchRequest") === "true" ||
        (params.has("s") && params.has("vc"))
      );
    return { isCarPage: isCar, isSearchPage: isSearch };
  }

  // Monitor SPA navigation — mobile.de is a React app that does client-side routing.
  // Chrome only injects content scripts on full page loads, so we detect URL changes
  // and force a full reload when the page type changes (e.g. search → detail).
  function monitorNavigation() {
    let lastUrl = window.location.href;
    let lastType = detectPageType(lastUrl);
    const check = () => {
      const newUrl = window.location.href;
      if (newUrl === lastUrl) return;
      lastUrl = newUrl;
      const newType = detectPageType(newUrl);
      // If page type changed (search↔detail, or non-match→match), force full reload
      // so Chrome re-injects the content script fresh
      if (newType.isCarPage !== lastType.isCarPage || newType.isSearchPage !== lastType.isSearchPage) {
        location.reload();
      }
    };
    // Intercept pushState/replaceState used by React Router
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function () { origPush.apply(this, arguments); check(); };
    history.replaceState = function () { origReplace.apply(this, arguments); check(); };
    window.addEventListener("popstate", check);
  }

  let { isCarPage, isSearchPage } = detectPageType(window.location.href);
  let url = window.location.href;

  if (!isCarPage && !isSearchPage) {
    monitorNavigation();
    return;
  }

  // --- Shared state & helpers ---

  function bg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (res) => resolve(res));
    });
  }

  function detectTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function truncate(s, n) { return !s ? "" : s.length > n ? s.slice(0, n - 1) + "\u2026" : s; }

  // Rebuilds a .gv-btn's icon + label. iconHtml must come from our own static
  // templates only (never page or API data); labelText is set via textContent.
  function setButtonContent(btn, iconHtml, labelText) {
    btn.textContent = "";
    const iconWrap = document.createElement("span");
    iconWrap.className = "gv-icon-wrap";
    iconWrap.innerHTML = iconHtml;
    const label = document.createElement("span");
    label.className = "gv-label";
    label.textContent = labelText;
    btn.appendChild(iconWrap);
    btn.appendChild(label);
  }

  const logoUrl = chrome.runtime.getURL("icons/icon-48.png");

  // =============================================
  // SEARCH PAGE — inject full widget on each card
  // =============================================
  if (isSearchPage) {
    let searchState = {
      authenticated: false,
      collections: [],
      selectedCollectionId: null,
      selectedCollectionName: "",
      dark: false
    };

    // Per-card state keyed by carUrl
    const cardStates = {};

    function getCardState(carUrl) {
      if (!cardStates[carUrl]) {
        cardStates[carUrl] = { addedCollectionIds: new Set(), carId: null, loading: false, busyCollections: new Set() };
      }
      return cardStates[carUrl];
    }

    async function initSearch() {
      try {
        searchState.dark = detectTheme();

        const user = await bg({ action: "getMe" });
        if (user?.error || user?.status === 401) {
          searchState.authenticated = false;
          return;
        }
        searchState.authenticated = true;

        const collections = await bg({ action: "getCollections" });
        searchState.collections = Array.isArray(collections) ? collections : [];

        if (searchState.collections.length > 0) {
          const last = await bg({ action: "getLastCollectionId" });
          const remembered = last?.collectionId && searchState.collections.find((b) => b.id === last.collectionId);
          const pick = remembered || searchState.collections[0];
          searchState.selectedCollectionId = pick.id;
          searchState.selectedCollectionName = pick.name;
        }

        injectWidgets();
        observeNewListings();
      } catch {}
    }

    function getCarUrlFromArticle(article) {
      // Match detail links in any language — they all contain id= param on mobile.de
      const link = article.querySelector('a[href*="id="]');
      if (!link || !link.href.includes("mobile.de")) return null;
      try {
        const u = new URL(link.href);
        const id = u.searchParams.get("id");
        if (id) return `${u.origin}${u.pathname}?id=${id}`;
        return link.href.split("?")[0];
      } catch { return null; }
    }

    function injectWidgets() {
      if (!searchState.authenticated || searchState.collections.length === 0) return;
      document.querySelectorAll("article").forEach((article) => {
        if (article.querySelector(".gv-card-ext")) return;
        const carUrl = getCarUrlFromArticle(article);
        if (!carUrl) return;

        // Find the Park button by data-testid (language-independent)
        const parkenBtn = article.querySelector('[data-testid="listing-action-parking-park"], [data-testid="park-button-park"]');

        const wrap = document.createElement("div");
        wrap.className = `gv-card-ext ${searchState.dark ? "gv-dark" : "gv-light"}`;
        wrap.dataset.carUrl = carUrl;

        if (parkenBtn) {
          parkenBtn.after(wrap);
        } else {
          // Fallback: absolute top-right
          if (getComputedStyle(article).position === "static") {
            article.style.position = "relative";
          }
          wrap.classList.add("gv-card-ext-absolute");
          article.appendChild(wrap);
        }

        // Check car status then render
        checkAndRender(carUrl, wrap);
      });
    }

    async function checkAndRender(carUrl, wrap) {
      const cs = getCardState(carUrl);
      try {
        const check = await bg({ action: "checkCar", url: carUrl });
        if (check?.found && Array.isArray(check.collection_ids)) {
          cs.addedCollectionIds = new Set(check.collection_ids);
          cs.carId = check.car_id || null;
        }
      } catch {}
      renderCardWidget(carUrl, wrap);
    }

    function getCardButtonLabel(cs) {
      const count = cs.addedCollectionIds.size;
      if (count === 0) return truncate(searchState.selectedCollectionName, 18);
      if (count === 1) {
        const id = [...cs.addedCollectionIds][0];
        const col = searchState.collections.find((b) => b.id === id);
        return truncate(col ? col.name : searchState.selectedCollectionName, 18);
      }
      return `${count} collections`;
    }

    function getCardButtonIcon(cs) {
      const icon128 = chrome.runtime.getURL("icons/icon-128.png");
      if (cs.addedCollectionIds.size > 0) {
        return `<img class="gv-icon" src="${icon128}"/><span class="gv-badge gv-badge-tick"><svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 6 5 8.5 9.5 3.5"/></svg></span>`;
      }
      return `<img class="gv-icon" src="${icon128}"/><span class="gv-badge gv-badge-plus">+</span>`;
    }

    function renderCardWidget(carUrl, wrap) {
      const cs = getCardState(carUrl);
      wrap.innerHTML = "";

      // Main button
      const btn = document.createElement("button");
      btn.className = "gv-btn";
      btn.disabled = cs.loading;
      setButtonContent(btn, getCardButtonIcon(cs), getCardButtonLabel(cs));

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (cs.loading) return;

        if (cs.addedCollectionIds.size > 0 && cs.carId) {
          // Remove from first collection
          cs.loading = true;
          renderCardWidget(carUrl, wrap);
          const collectionId = [...cs.addedCollectionIds][0];
          try {
            await bg({ action: "removeCar", collectionId, carId: cs.carId });
            cs.addedCollectionIds.delete(collectionId);
            if (cs.addedCollectionIds.size > 0) {
              const next = [...cs.addedCollectionIds][0];
              const b = searchState.collections.find((c) => c.id === next);
              if (b) { searchState.selectedCollectionId = b.id; searchState.selectedCollectionName = b.name; }
            }
          } catch {}
          cs.loading = false;
          renderCardWidget(carUrl, wrap);
        } else {
          // Add to selected collection
          cs.loading = true;
          renderCardWidget(carUrl, wrap);
          try {
            const result = await bg({ action: "addCar", collectionId: searchState.selectedCollectionId, url: carUrl });
            cs.addedCollectionIds.add(searchState.selectedCollectionId);
            if (result?.id) cs.carId = result.id;
          } catch {}
          cs.loading = false;
          renderCardWidget(carUrl, wrap);
        }
      });

      // Dropdown chevron
      const drop = document.createElement("button");
      drop.className = "gv-drop";
      drop.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M4.427 5.427a.75.75 0 011.06-.013L8 7.781l2.513-2.367a.75.75 0 011.047 1.073l-3 2.826a.75.75 0 01-1.047 0l-3-2.826a.75.75 0 01-.086-1.06z"/></svg>`;
      drop.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCardDropdown(carUrl, wrap);
      });

      wrap.appendChild(btn);
      wrap.appendChild(drop);
    }

    function toggleCardDropdown(carUrl, wrap) {
      const existing = wrap.querySelector(".gv-dropdown");
      if (existing) { existing.remove(); wrap.classList.remove("gv-open"); return; }

      wrap.classList.add("gv-open");
      const cs = getCardState(carUrl);

      const dd = document.createElement("div");
      dd.className = `gv-dropdown ${searchState.dark ? "gv-dark" : "gv-light"}`;

      const openLinkSvg = `<svg class="gv-dd-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V9"/><path d="M9 2h5v5"/><path d="M14 2L7 9"/></svg>`;

      searchState.collections.forEach((col) => {
        const inCol = cs.addedCollectionIds.has(col.id);
        const item = document.createElement("div");
        item.className = "gv-dd-item";
        if (inCol) item.classList.add("gv-dd-in-collection");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "gv-dd-checkbox";
        cb.checked = inCol;

        cb.addEventListener("click", (e) => { e.stopPropagation(); e.stopImmediatePropagation(); });
        cb.addEventListener("change", (e) => {
          e.stopPropagation();
          toggleCardCollection(carUrl, col, cb, item, wrap);
        });

        const nameSpan = document.createElement("span");
        nameSpan.className = "gv-dd-name";
        nameSpan.textContent = col.name;

        const linkBtn = document.createElement("a");
        linkBtn.className = "gv-dd-link";
        linkBtn.href = "#";
        linkBtn.innerHTML = openLinkSvg;
        linkBtn.title = "Open in GarageView";
        linkBtn.addEventListener("click", async (e) => {
          e.stopPropagation(); e.preventDefault(); e.stopImmediatePropagation();
          const { base } = await bg({ action: "getApiBase" });
          window.open(`${base}/collections/${col.id}/grid`, "_blank");
        });

        item.addEventListener("click", (e) => {
          e.stopPropagation(); e.preventDefault(); e.stopImmediatePropagation();
          if (e.target === cb || linkBtn.contains(e.target)) return;
          cb.checked = !cb.checked;
          toggleCardCollection(carUrl, col, cb, item, wrap);
        });

        item.appendChild(cb);
        item.appendChild(nameSpan);
        item.appendChild(linkBtn);
        dd.appendChild(item);
      });

      wrap.appendChild(dd);

      const close = (e) => {
        if (!dd.contains(e.target) && !wrap.contains(e.target)) {
          dd.remove(); wrap.classList.remove("gv-open");
          document.removeEventListener("click", close);
        }
      };
      setTimeout(() => document.addEventListener("click", close), 0);
    }

    async function toggleCardCollection(carUrl, col, cb, item, wrap) {
      const cs = getCardState(carUrl);
      if (cs.busyCollections.has(col.id)) return;
      cs.busyCollections.add(col.id);
      item.classList.add("gv-dd-busy");

      try {
        if (cb.checked) {
          const result = await bg({ action: "addCar", collectionId: col.id, url: carUrl });
          cs.addedCollectionIds.add(col.id);
          if (result?.id) cs.carId = result.id;
          item.classList.add("gv-dd-in-collection");
          searchState.selectedCollectionId = col.id;
          searchState.selectedCollectionName = col.name;
        } else {
          if (cs.carId) {
            await bg({ action: "removeCar", collectionId: col.id, carId: cs.carId });
            cs.addedCollectionIds.delete(col.id);
            item.classList.remove("gv-dd-in-collection");
          } else { cb.checked = true; }
        }
      } catch { cb.checked = !cb.checked; }
      finally {
        cs.busyCollections.delete(col.id);
        item.classList.remove("gv-dd-busy");
        bg({ action: "setLastCollectionId", collectionId: searchState.selectedCollectionId });
        // Re-render ALL card buttons to reflect new default collection
        document.querySelectorAll(".gv-card-ext").forEach((w) => {
          const wUrl = w.dataset.carUrl;
          if (!wUrl) return;
          const wCs = getCardState(wUrl);
          const btnEl = w.querySelector(".gv-btn");
          if (btnEl) {
            setButtonContent(btnEl, getCardButtonIcon(wCs), getCardButtonLabel(wCs));
          }
        });
      }
    }

    let searchObserver = null;
    let injecting = false;

    function safeInjectWidgets() {
      if (injecting) return;
      injecting = true;
      // Disconnect observer while we modify the DOM to avoid triggering ourselves
      if (searchObserver) searchObserver.disconnect();
      injectWidgets();
      // Reconnect after a tick to let React settle
      setTimeout(() => {
        injecting = false;
        if (searchObserver) {
          const container = document.querySelector('[class*="result"]') || document.body;
          searchObserver.observe(container, { childList: true, subtree: true });
        }
      }, 500);
    }

    function observeNewListings() {
      searchObserver = new MutationObserver(() => {
        if (!injecting) safeInjectWidgets();
      });
      const container = document.querySelector('[class*="result"]') || document.body;
      searchObserver.observe(container, { childList: true, subtree: true });
    }

    initSearch();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") initSearch();
    });

    monitorNavigation();
    return;
  }

  // =============================================
  // DETAIL PAGE — existing logic (unchanged)
  // =============================================

  const carUrl = (() => {
    const u = new URL(url);
    const id = u.searchParams.get("id");
    if (id) {
      return `${u.origin}${u.pathname}?id=${id}`;
    }
    return url.split("?")[0];
  })();

  let state = {
    authenticated: false,
    collections: [],
    selectedCollectionId: null,
    selectedCollectionName: "",
    addedCollectionIds: new Set(),
    carId: null,
    loading: false,
    busyCollections: new Set(),
    dark: false
  };

  const gvPlusIcon = `<img class="gv-icon" src="${chrome.runtime.getURL("icons/icon-128.png")}" alt="GarageView"/><span class="gv-badge gv-badge-plus">+</span>`;

  const gvTickIcon = `<img class="gv-icon" src="${chrome.runtime.getURL("icons/icon-128.png")}" alt="GarageView"/><span class="gv-badge gv-badge-tick">
      <svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 6 5 8.5 9.5 3.5"/></svg>
    </span>`;

  const chevronIcon = `<svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M4.427 5.427a.75.75 0 011.06-.013L8 7.781l2.513-2.367a.75.75 0 011.047 1.073l-3 2.826a.75.75 0 01-1.047 0l-3-2.826a.75.75 0 01-.086-1.06z"/></svg>`;

  const openLinkIcon = `<svg class="gv-dd-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V9"/><path d="M9 2h5v5"/><path d="M14 2L7 9"/></svg>`;

  function isInCollection(collectionId) {
    return state.addedCollectionIds.has(collectionId);
  }

  function getButtonLabel() {
    const count = state.addedCollectionIds.size;
    if (count === 0) {
      return truncate(state.selectedCollectionName, 22);
    } else if (count === 1) {
      const collectionId = [...state.addedCollectionIds][0];
      const col = state.collections.find((b) => b.id === collectionId);
      return truncate(col ? col.name : state.selectedCollectionName, 22);
    } else {
      return `${count} collections`;
    }
  }

  function getButtonIcon() {
    return state.addedCollectionIds.size > 0 ? gvTickIcon : gvPlusIcon;
  }

  function updateButton() {
    const wrap = document.getElementById("gv-ext");
    if (!wrap) return;
    const btn = wrap.querySelector(".gv-btn");
    if (!btn) return;

    setButtonContent(btn, getButtonIcon(), getButtonLabel());

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    if (state.addedCollectionIds.size > 0) {
      newBtn.addEventListener("click", handleRemoveOne);
    } else {
      newBtn.addEventListener("click", handleAdd);
    }
  }

  function renderLogin() {
    const existing = document.getElementById("gv-ext");
    if (existing) existing.remove();

    const wrap = document.createElement("div");
    wrap.id = "gv-ext";
    wrap.className = `gv-ext ${state.dark ? "gv-dark" : "gv-light"}`;

    const btn = document.createElement("button");
    btn.className = "gv-btn";
    btn.innerHTML = `
      <span class="gv-icon-wrap"><img class="gv-icon" src="${chrome.runtime.getURL("icons/icon-128.png")}" alt="GarageView"/></span>
      <span class="gv-label">Login</span>
    `;
    btn.addEventListener("click", async () => {
      const { base } = await bg({ action: "getApiBase" });
      window.open(`${base}/login`, "_blank");
    });

    wrap.appendChild(btn);

    injectWidget(wrap);
  }

  // Find the best injection point on the detail page — near Park/Share buttons
  function injectWidget(wrap) {
    // Find by data-testid (language-independent)
    const parkBtn =
      document.querySelector('[data-testid="vip-park-button-park"]') ||
      document.querySelector('[data-testid="share-button"]');

    if (parkBtn) {
      const container = parkBtn.closest("div");
      if (container && container.parentElement) {
        wrap.classList.add("gv-detail-widget");
        container.after(wrap);
        return;
      }
    }

    // Fallback: fixed position top-right
    wrap.classList.add("gv-fixed");
    document.body.appendChild(wrap);
  }

  function render() {
    if (!state.authenticated || state.collections.length === 0) return;

    const existing = document.getElementById("gv-ext");
    if (existing) existing.remove();

    const wrap = document.createElement("div");
    wrap.id = "gv-ext";
    wrap.className = `gv-ext ${state.dark ? "gv-dark" : "gv-light"}`;

    const btn = document.createElement("button");
    btn.className = "gv-btn";
    btn.disabled = state.loading;

    setButtonContent(btn, getButtonIcon(), getButtonLabel());

    if (state.addedCollectionIds.size > 0) {
      btn.addEventListener("click", handleRemoveOne);
    } else {
      btn.addEventListener("click", handleAdd);
    }

    const drop = document.createElement("button");
    drop.className = "gv-drop";
    drop.innerHTML = chevronIcon;
    drop.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    wrap.appendChild(btn);
    wrap.appendChild(drop);

    injectWidget(wrap);
  }

  async function toggleCollection(col, cb, item) {
    if (state.busyCollections.has(col.id)) return;
    state.busyCollections.add(col.id);
    item.classList.add("gv-dd-busy");

    try {
      if (cb.checked) {
        const result = await bg({ action: "addCar", collectionId: col.id, url: carUrl });
        state.addedCollectionIds.add(col.id);
        if (result?.id) state.carId = result.id;
        item.classList.add("gv-dd-in-collection");
        state.selectedCollectionId = col.id;
        state.selectedCollectionName = col.name;
      } else {
        if (state.carId) {
          await bg({ action: "removeCar", collectionId: col.id, carId: state.carId });
          state.addedCollectionIds.delete(col.id);
          item.classList.remove("gv-dd-in-collection");
        } else {
          cb.checked = true;
        }
      }
    } catch {
      cb.checked = !cb.checked;
    } finally {
      state.busyCollections.delete(col.id);
      item.classList.remove("gv-dd-busy");

      if (!cb.checked && col.id === state.selectedCollectionId) {
        const firstAdded = state.collections.find((b) => state.addedCollectionIds.has(b.id));
        if (firstAdded) {
          state.selectedCollectionId = firstAdded.id;
          state.selectedCollectionName = firstAdded.name;
        }
      }

      bg({ action: "setLastCollectionId", collectionId: state.selectedCollectionId });
      updateButton();
    }
  }

  function toggleDropdown() {
    const wrap = document.getElementById("gv-ext");
    const existing = document.getElementById("gv-dropdown");
    if (existing) {
      existing.remove();
      wrap?.classList.remove("gv-open");
      return;
    }

    wrap?.classList.add("gv-open");

    const dd = document.createElement("div");
    dd.id = "gv-dropdown";
    dd.className = `gv-dropdown ${state.dark ? "gv-dark" : "gv-light"}`;

    state.collections.forEach((col) => {
      const inCol = isInCollection(col.id);
      const item = document.createElement("div");
      item.className = "gv-dd-item";
      if (inCol) item.classList.add("gv-dd-in-collection");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "gv-dd-checkbox";
      cb.checked = inCol;

      cb.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      cb.addEventListener("change", (e) => {
        e.stopPropagation();
        toggleCollection(col, cb, item);
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "gv-dd-name";
      nameSpan.textContent = col.name;

      const linkBtn = document.createElement("a");
      linkBtn.className = "gv-dd-link";
      linkBtn.innerHTML = openLinkIcon;
      linkBtn.title = "Open in GarageView";
      linkBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const { base } = await bg({ action: "getApiBase" });
        window.open(`${base}/collections/${col.id}/grid`, "_blank");
      });

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.target === cb || linkBtn.contains(e.target)) return;

        cb.checked = !cb.checked;
        toggleCollection(col, cb, item);
      });

      item.appendChild(cb);
      item.appendChild(nameSpan);
      item.appendChild(linkBtn);

      dd.appendChild(item);
    });

    wrap.appendChild(dd);

    const close = (e) => {
      if (!dd.contains(e.target)) {
        dd.remove();
        document.getElementById("gv-ext")?.classList.remove("gv-open");
        document.removeEventListener("click", close);
      }
    };
    setTimeout(() => document.addEventListener("click", close), 0);
  }

  async function handleRemoveOne() {
    if (state.loading || !state.carId || state.addedCollectionIds.size === 0) return;
    state.loading = true;
    render();

    const collectionId = [...state.addedCollectionIds][0];
    try {
      await bg({ action: "removeCar", collectionId: collectionId, carId: state.carId });
      state.addedCollectionIds.delete(collectionId);

      if (state.addedCollectionIds.size > 0) {
        const next = [...state.addedCollectionIds][0];
        const b = state.collections.find((b) => b.id === next);
        if (b) {
          state.selectedCollectionId = b.id;
          state.selectedCollectionName = b.name;
        }
      }
    } catch {}
    finally {
      state.loading = false;
      render();
    }
  }

  async function handleAdd() {
    if (state.loading || !state.selectedCollectionId) return;
    state.loading = true;
    render();

    try {
      const result = await bg({ action: "addCar", collectionId: state.selectedCollectionId, url: carUrl });
      state.addedCollectionIds.add(state.selectedCollectionId);
      if (result?.id) state.carId = result.id;
    } catch (err) {
      const wrap = document.getElementById("gv-ext");
      if (wrap) {
        const label = wrap.querySelector(".gv-label");
        if (label) {
          label.textContent = err.error === "Car already in this collection" ? "Already added" : "Error";
          setTimeout(() => { label.textContent = getButtonLabel(); }, 2000);
        }
      }
    } finally {
      state.loading = false;
      render();
    }
  }

  async function init() {
    try {
      state.dark = detectTheme();

      const user = await bg({ action: "getMe" });
      if (user?.error || user?.status === 401) {
        state.authenticated = false;
        renderLogin();
        return;
      }
      state.authenticated = true;

      const collections = await bg({ action: "getCollections" });
      state.collections = Array.isArray(collections) ? collections : [];

      if (state.collections.length > 0) {
        const last = await bg({ action: "getLastCollectionId" });
        const remembered = last?.collectionId && state.collections.find((b) => b.id === last.collectionId);
        const pick = remembered || state.collections[0];
        state.selectedCollectionId = pick.id;
        state.selectedCollectionName = pick.name;
      }

      try {
        const check = await bg({ action: "checkCar", url: carUrl });
        if (check?.found && Array.isArray(check.collection_ids)) {
          state.addedCollectionIds = new Set(check.collection_ids);
          state.carId = check.car_id || null;
        }
      } catch {}

      render();
    } catch {}
  }

  init();

  // Re-inject if React re-renders and destroys our widget
  let detailInjecting = false;
  const detailObserver = new MutationObserver(() => {
    if (detailInjecting || document.getElementById("gv-ext")) return;
    if (!state.authenticated) return;
    detailInjecting = true;
    detailObserver.disconnect();
    render();
    setTimeout(() => {
      detailInjecting = false;
      detailObserver.observe(document.body, { childList: true, subtree: true });
    }, 500);
  });
  detailObserver.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      init();
    }
  });

  monitorNavigation();
})();
