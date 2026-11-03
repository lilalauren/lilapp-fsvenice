import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "../components/lilapp/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
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

function ErrorComponent({ error: rawError, reset }: { error: unknown; reset: () => void }) {
  const error = rawError instanceof Error ? rawError : new Error(String(rawError));
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Something went wrong."}
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
      { title: "LILApp | Four Seasons PPI EMEA Venice 2026" },
      {
        name: "description",
        content:
          "LILA PHOTO crew schedule for Four Seasons PPI EMEA, Danieli Venezia, November 5–8, 2026",
      },
      { name: "author", content: "LILA PHOTO" },
      { name: "apple-mobile-web-app-title", content: "LILApp" },
      { name: "theme-color", content: "#e5e9e1" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "LILApp | Four Seasons PPI EMEA Venice 2026" },
      {
        property: "og:description",
        content: "LILA PHOTO crew schedule — created by LILA PHOTO",
      },
      { property: "og:type", content: "website" },
      // Link previews (iMessage, WhatsApp) need the full address of the image.
      { property: "og:image", content: "https://lilappfsvenice.netlify.app/lilapp-preview.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://lilappfsvenice.netlify.app/lilapp-preview.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      // New file names so browsers drop the old swan they remembered.
      { rel: "icon", href: "/favicon-v2.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png?v=2" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon-v2.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AirtableFreshnessRefresher />
      <AppShell>
        <Outlet />
      </AppShell>
    </QueryClientProvider>
  );
}

const LIVE_AIRTABLE_QUERY_KEYS = new Set(["trip"]);

function AirtableFreshnessRefresher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refetchLiveAirtableQueries = () => {
      queryClient.refetchQueries({
        type: "active",
        predicate: (query) => LIVE_AIRTABLE_QUERY_KEYS.has(String(query.queryKey[0] ?? "")),
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refetchLiveAirtableQueries();
    };

    window.addEventListener("pageshow", refetchLiveAirtableQueries);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refetchLiveAirtableQueries);

    return () => {
      window.removeEventListener("pageshow", refetchLiveAirtableQueries);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refetchLiveAirtableQueries);
    };
  }, [queryClient]);

  return null;
}
