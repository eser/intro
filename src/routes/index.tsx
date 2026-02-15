import { createFileRoute } from "@tanstack/react-router";
import { DemoCanvas } from "@/components/demo-canvas";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <DemoCanvas />;
}
