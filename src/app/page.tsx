import { auth } from "@/lib/auth";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhyItWorks } from "@/components/landing/WhyItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTABand } from "@/components/landing/CTABand";
import { Footer } from "@/components/landing/Footer";
import { SmartEntryGate } from "@/components/landing/SmartEntryGate";
import { LandingThemeReset } from "@/components/landing/LandingThemeReset";

export default async function HomePage() {
  const session = await auth();
  const isAuthed = !!session?.user?.id;

  return (
    <SmartEntryGate isAuthed={isAuthed}>
      <LandingThemeReset />
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <WhyItWorks />
      <Testimonials />
      <CTABand />
      <Footer />
    </SmartEntryGate>
  );
}
