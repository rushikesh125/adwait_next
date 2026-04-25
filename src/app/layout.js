"use client";

import ReduxProvider from "@/components/ReduxProvider";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export default function Layout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={` antialiased`} suppressHydrationWarning>
        <ReduxProvider>{children}</ReduxProvider>

        <Toaster />
      </body>
    </html>
  );
}
