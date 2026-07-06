// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    prerender: {
      enabled: true,
      routes: ["/"],
    },
  },
  vite: {
    build: {
      // Raise warning threshold — 600kB is reasonable for a Firebase + UI app
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // manualChunks only applies to the client (browser) build.
          // SSR externalises React/Firebase/TanStack, so we must guard with a function
          // that returns undefined for SSR entries (which Rollup will skip gracefully).
          manualChunks(id, { getModuleInfo }) {
            // Skip for SSR — modules are external there
            const info = getModuleInfo(id);
            if (!info) return undefined;

            if (id.includes("node_modules")) {
              if (id.includes("react-dom") || id.includes("react/")) return "vendor-react";
              if (
                id.includes("firebase/app") ||
                id.includes("firebase/auth") ||
                id.includes("firebase/firestore") ||
                id.includes("firebase/analytics") ||
                id.includes("@firebase")
              ) return "vendor-firebase";
              if (id.includes("@google/generative-ai")) return "vendor-gemini";
              if (
                id.includes("@tanstack/react-router") ||
                id.includes("@tanstack/react-query") ||
                id.includes("@tanstack/react-start") ||
                id.includes("@tanstack/router-core")
              ) return "vendor-tanstack";
              if (
                id.includes("lucide-react") ||
                id.includes("sonner") ||
                id.includes("/clsx/") ||
                id.includes("tailwind-merge") ||
                id.includes("class-variance-authority")
              ) return "vendor-ui";
            }
            return undefined;
          },
        },
      },
    },
  },
});
