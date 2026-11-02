import { createFileRoute } from "@tanstack/react-router";
import { Trainer } from "@/components/trainer";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Call the next move</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          The chart stops before the move. Add the indicators you trust, call it, then see what happened and which
          tools helped.
        </p>
      </div>
      <Trainer />
    </div>
  );
}
