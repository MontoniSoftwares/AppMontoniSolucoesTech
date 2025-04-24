import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  publicDir: "public", // Coloque recursos estáticos (como favicon) na pasta 'public'
});
