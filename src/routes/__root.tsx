import type { ReactNode } from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "intro" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
`,
          }}
        />
      </head>
      <body>
        {props.children}
        <Scripts />
      </body>
    </html>
  );
}
