import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/top-nav";
import { ThemeProvider } from "@/components/theme-provider";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "EFS | מרכז מעקב משלוחים",
  description: "תמונה עדכנית אחת של כל הזמנות הרכש והמשלוחים שבדרך.",
};

// Applies the saved theme to <html> before the browser paints anything, so
// there's no flash of the wrong theme while React hydrates. Defaults to
// light — dark mode is only ever entered by an explicit toggle, never
// auto-detected from system preference, so a fresh session/demo always
// starts on the familiar light design.
const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("efs-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <TooltipProvider>
            <TopNav />
            <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">{children}</main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
