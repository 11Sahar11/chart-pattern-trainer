import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { ServiceWorker } from "@/components/service-worker";
import appCss from "../styles.css?url";

const APP_NAME = "Chart Pattern Trainer";
const DESCRIPTION =
  "Free stock chart reading practice. The chart stops before the move — call it higher, lower or no edge, then see what happened and which indicators helped.";
// Absolute URLs for share cards. Set VITE_SITE_URL in Vercel once you have a domain.
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const OG_IMAGE = `${SITE_URL}/og.png`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${APP_NAME} — practice reading stock charts` },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#eef2ec", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0e1613", media: "(prefers-color-scheme: dark)" },
      // Share cards (Reddit, X, iMessage, Discord)
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: `${APP_NAME} — can you call the next move?` },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      ...(SITE_URL ? [{ property: "og:url", content: SITE_URL }] : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${APP_NAME} — can you call the next move?` },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ServiceWorker />
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
