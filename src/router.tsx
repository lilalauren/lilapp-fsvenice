import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchInterval: 60_000,
        refetchOnMount: "always",
        refetchOnReconnect: "always",
        refetchOnWindowFocus: "always",
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Tabs render instantly: preload on render and reuse the shared trip data.
    defaultPreload: "render",
    defaultPreloadStaleTime: Infinity,
  });

  return router;
};
