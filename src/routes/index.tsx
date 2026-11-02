import { createFileRoute } from "@tanstack/react-router";
import { Trainer } from "@/components/trainer";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Trainer />;
}
