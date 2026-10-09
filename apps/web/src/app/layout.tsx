import "./globals.css";
import "@/styles/editorial.css";
import "@/styles/theme.css";
import "@/styles/applications.css";
import "@/styles/controls.css";

import "@/components/workspace-actions.css";
import "@/styles/workspace-polish.css";
import { headers } from "next/headers";
export const dynamic = "force-dynamic";
import { ThemeProvider } from "@/components/ThemeProvider";
import { themeScript } from "@/lib/theme-script";
import type { Metadata } from "next";
import React from "react";
import { Notifications } from "@/components/Notifications";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "CV Workspace — Your personal studio",
  description:
    "Structured personal CV workspace for creating, editing, and optimizing resumes.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="bg-surface font-body-md text-on-surface antialiased selection:bg-secondary-container">
        <I18nProvider>
          <ThemeProvider>
            <Sidebar />
            <Notifications />
            <div className="workspace-shell">
              <Header />
              <main className="workspace-main">{children}</main>
            </div>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
