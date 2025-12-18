// client/src/main.tsx
//
// FBST_CHANGELOG
// - 2025-12-14
//   - BrowserRouter must live ONLY here.
//   - Ensure global CSS is imported (Tailwind + app styling).

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

import App from "./App";
import { ThemeProvider } from "./components/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
