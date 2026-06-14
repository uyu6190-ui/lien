import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

if (!window.storage) {
  window.storage = {
    async get(key) {
      return { value: window.localStorage.getItem(key) };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
    },
    async delete(key) {
      window.localStorage.removeItem(key);
    },
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
