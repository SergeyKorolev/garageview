// GarageView Chrome Extension — Popup Script

const app = document.getElementById("app");

function bg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => resolve(res));
  });
}

async function init() {
  app.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const user = await bg({ action: "getMe" });
    if (user?.error || user?.status === 401) {
      renderLogin();
      return;
    }

    const collections = await bg({ action: "getCollections" });
    const last = await bg({ action: "getLastCollectionId" });
    const { base } = await bg({ action: "getApiBase" });

    renderApp(user, Array.isArray(collections) ? collections : [], last?.collectionId, base);
  } catch {
    renderLogin();
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="header">
      <img class="logo logo-dark" src="icons/logo-dark.png" alt="GarageView">
      <img class="logo logo-light" src="icons/logo-light.png" alt="GarageView">
    </div>
    <div class="login-prompt">
      <h2>Sign in to GarageView</h2>
      <p>Log in on garageview.ai first, then come back here.</p>
      <a href="#" id="login-link">Open garageview.ai</a>
    </div>
  `;

  document.getElementById("login-link").addEventListener("click", async (e) => {
    e.preventDefault();
    const { base } = await bg({ action: "getApiBase" });
    chrome.tabs.create({ url: base });
  });
}

function renderApp(user, collections, lastCollectionId, base) {
  const header = `
    <div class="header">
      <img class="logo logo-dark" src="icons/logo-dark.png" alt="GarageView">
      <img class="logo logo-light" src="icons/logo-light.png" alt="GarageView">
      <span class="user-name">${escapeHtml(user.name || user.email)}</span>
    </div>
  `;

  let collectionList = "";
  if (collections.length === 0) {
    collectionList = '<div class="empty">No collections yet.</div>';
  } else {
    collectionList = '<div class="collection-list">';
    collections.forEach((b) => {
      const isDefault = b.id === lastCollectionId;
      collectionList += `
        <a class="collection-item" href="${base}/collections/${b.id}/grid" target="_blank" data-id="${b.id}">
          <span class="collection-name">${escapeHtml(b.name)}</span>
          ${isDefault ? '<span class="collection-default">DEFAULT</span>' : ""}
          <span class="collection-count">${b.cars_count || 0} cars</span>
        </a>
      `;
    });
    collectionList += "</div>";
  }

  app.innerHTML = header + collectionList;

  // Set default collection on right-click
  document.querySelectorAll(".collection-item").forEach((el) => {
    el.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      const id = parseInt(el.dataset.id);
      await bg({ action: "setLastCollectionId", collectionId: id });
      init();
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

init();
