import { logEvent } from "firebase/analytics";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Adicione esta importação
import App from "./App";
import { analytics } from "./firebase";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Rastrear evento de visualização de página inicial
logEvent(analytics, "page_view", {
  page_title: "Montoni Soluções Tech - Home",
});
