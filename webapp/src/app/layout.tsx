import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Receptenboek",
  description: "Recepten browsen, personaliseren en toevoegen aan je Albert Heijn mandje.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Receptenboek" },
};

export const viewport: Viewport = {
  themeColor: "#f9f9f7",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Set the theme before paint to avoid a flash.
const themeScript = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="header">
          <div className="container header-row">
            <span className="brand">🍳 Receptenboek</span>
            <Nav />
            <ThemeToggle />
          </div>
        </header>
        <main className="container">{children}</main>
        <SpeedInsights />
      </body>
    </html>
  );
}
