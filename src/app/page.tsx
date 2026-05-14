import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhyItWorks } from "@/components/landing/WhyItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTABand } from "@/components/landing/CTABand";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <WhyItWorks />
      <Testimonials />
      <CTABand />
      <Footer />
    </>
  );
}
