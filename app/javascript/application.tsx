import React from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (container && !container.dataset.serverOnly) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});
