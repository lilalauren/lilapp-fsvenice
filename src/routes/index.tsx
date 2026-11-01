import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { readDisplayNameSync } from "@/lib/use-display-name";

export const Route = createFileRoute("/")({
  // Default landing = Full Schedule (everyone can see the whole team's day).
  loader: () => {
    throw redirect({ to: "/schedule/full" });
  },
  component: () => null,
});

export function useEnsureName() {
  const nav = useNavigate();
  useEffect(() => {
    if (!readDisplayNameSync()) nav({ to: "/pick-name" });
  }, [nav]);
}
