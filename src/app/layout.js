"use client";

import ReduxProvider from "@/components/ReduxProvider";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { registerServiceWorker } from "@/firebase/notificationsService";

export default function Layout({ children }) {
  useEffect(() => {
  registerServiceWorker();
}, []);
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={` antialiased`} suppressHydrationWarning>
        <ReduxProvider>{children}</ReduxProvider>

        <Toaster />
      </body>
    </html>
  );
}
