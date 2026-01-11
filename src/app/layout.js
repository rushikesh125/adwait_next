'use client';
import Header from "@/components/Header";
import "./globals.css";




export default function Layout({ children }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  );
}
