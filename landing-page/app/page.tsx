"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Steps from "@/components/Steps";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import SmoothScrollLayout from "@/components/SmoothScrollLayout";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <SmoothScrollLayout>
        <Hero />
        <Features />
        <Steps />
        <CTA />
        <Footer />
      </SmoothScrollLayout>
    </main>
  );
}
