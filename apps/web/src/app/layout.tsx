import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import { Notifications } from "@/components/Notifications";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "CV Workspace — Calm Editorial",
  description:
    "Structured personal CV workspace for creating, editing, and optimizing resumes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface font-body-md text-on-surface antialiased selection:bg-secondary-container">
        <I18nProvider>
          <Sidebar />
          <Notifications />
          <div className="pl-[220px]">
            <Header />
            <main className="relative pt-14 w-full min-h-screen bg-surface-container-low">
              {children}
            </main>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
