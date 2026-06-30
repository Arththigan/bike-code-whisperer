import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { cn } from "@/lib/utils";

import appCss from "../styles.css?url";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { useState, useEffect } from "react";
import { Language } from "@/lib/translations";
import { Toaster } from "sonner";

let HAS_SHOWN_SPLASH = false;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#f3a93b" },
      { title: "AK ARUN WIRING · Bike DTC Code Lookup for Mechanics" },
      { name: "description", content: "Fast DTC and blink code decoder for bike mechanics. Search Yamaha, KTM, Honda, TVS, Suzuki and Royal Enfield codes with symptoms and fix steps." },
      { name: "author", content: "AK ARUN WIRING" },
      { property: "og:title", content: "AK ARUN WIRING · Bike DTC Code Lookup for Mechanics" },
      { property: "og:description", content: "Fast DTC and blink code decoder for bike mechanics. Search Yamaha, KTM, Honda, TVS, Suzuki and Royal Enfield codes with symptoms and fix steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "AK ARUN WIRING · Bike DTC Code Lookup for Mechanics" },
      { name: "twitter:description", content: "Fast DTC and blink code decoder for bike mechanics. Search Yamaha, KTM, Honda, TVS, Suzuki and Royal Enfield codes with symptoms and fix steps." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd1cda09-d9ec-4bad-8b92-7535d71e20a4/id-preview-44cca171--21c0184f-f891-473b-b9cd-fbdd896df95d.lovable.app-1778482704799.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd1cda09-d9ec-4bad-8b92-7535d71e20a4/id-preview-44cca171--21c0184f-f891-473b-b9cd-fbdd896df95d.lovable.app-1778482704799.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <HeadContent />
        {/* Prevent theme flash: read localStorage before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showSplash, setShowSplash] = useState(!HAS_SHOWN_SPLASH);

  const handleSplashDone = () => {
    setShowSplash(false);
    HAS_SHOWN_SPLASH = true;
  };

  // Scroll to top on route change
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTop = 0;
  }, [location.pathname]);

  // Auth Protection
  useEffect(() => {
    if (!isLoading) {
      const isUserPage = location.pathname === "/login";
      
      if (!user && !isUserPage) {
        navigate({ to: "/login" });
      }
    }
  }, [user, isLoading, location.pathname]);

  if (isLoading) return null;

  const isUserLogin = location.pathname === "/login";
  const hideNav = isUserLogin || showSplash;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster position="top-center" richColors />
        {showSplash && <SplashScreen onDone={handleSplashDone} />}
        <div className="flex bg-background text-foreground transition-colors duration-300"
          style={{ height: "100dvh" }}
        >
          {!hideNav && (
            <aside className="hidden sm:block h-screen sticky top-0 shrink-0">
              <Sidebar />
            </aside>
          )}
          <main
            className={cn("flex-1 min-w-0 overflow-y-auto", hideNav ? "pb-0" : "pb-20 sm:pb-0")}
            style={{ height: "100dvh" }}
          >
            {/* Mobile Top Bar — only on small screens, hidden on sm+ (desktop has sidebar) */}
            {!hideNav && (
              <header className="fixed top-0 left-0 right-0 z-40 sm:hidden"
                style={{ padding: "8px 12px 0 12px" }}
              >
                <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-lg px-4 shadow-sm">
                  <img
                    src="/logo.png"
                    alt="AK Arun Wiring Logo"
                    className="h-8 w-8 rounded-full object-cover shadow-md shadow-primary/20 border border-primary/20 shrink-0"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-[13px] font-black tracking-wider uppercase text-foreground">AK Arun Wiring</span>
                    <span className="text-[10px] font-bold tracking-widest text-primary uppercase mt-0.5">OBD-Decoder</span>
                  </div>
                </div>
              </header>
            )}
            {/* Push content below top bar on mobile */}
            <div className={cn(!hideNav && "pt-16 sm:pt-0")}>
              <Outlet />
            </div>
          </main>
          {!hideNav && <MobileNav />}
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
