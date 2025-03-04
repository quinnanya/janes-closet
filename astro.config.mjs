import { defineConfig } from "astro/config";
import { astroImageTools } from "astro-imagetools";

// https://astro.build/config
export default defineConfig({
  site: "https://janescloset.quinndombrowski.com/",
  trailingSlash: "always",
  integrations: [astroImageTools],
  vite: {
    ssr: { external: ["neat-csv"] },
    optimizeDeps: { exclude: ["neat-csv"] },
  },
});
