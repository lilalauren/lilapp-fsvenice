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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LILApp | Sabbatical 2026" },
      {
        name: "description",
        content: "Event Operations Platform — created by LILA PHOTO",
      },
      { name: "author", content: "LILA PHOTO" },
      { name: "apple-mobile-web-app-title", content: "LILApp" },
      { name: "theme-color", content: "#3a4a3a" },
      { property: "og:title", content: "LILApp | Sabbatical 2026" },
      {
        property: "og:description",
        content: "Event Operations Platform — created by LILA PHOTO",
      },
      { property: "og:image", content: "https://sabbatical.photapp.com/og-image.png" },
      { property: "og:url", content: "https://sabbatical.photapp.com" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://sabbatical.photapp.com/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
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
      <Outlet />
    </QueryClientProvider>
  );
}

const LIVE_AIRTABLE_QUERY_KEYS = new Set([
  "agenda",
  "excursions",
  "team",
  "roomDrops",
  "travel",
]);

function AirtableFreshnessRefresher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refetchLiveAirtableQueries = () => {
      queryClient.refetchQueries({
        type: "active",
        predicate: (query) =>
          LIVE_AIRTABLE_QUERY_KEYS.has(String(query.queryKey[0] ?? "")),
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
