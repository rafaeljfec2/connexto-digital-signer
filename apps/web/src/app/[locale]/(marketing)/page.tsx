'use client';

import { HeroSection } from '@/features/marketing/components/hero-section';
import { TrustBar } from '@/features/marketing/components/trust-bar';
import { PainSection } from '@/features/marketing/components/pain-section';
import { HowItWorks } from '@/features/marketing/components/how-it-works';
import { FeaturesGrid } from '@/features/marketing/components/features-grid';
import { Differentials } from '@/features/marketing/components/differentials';
import { SocialProof } from '@/features/marketing/components/social-proof';
import { FinalCta } from '@/features/marketing/components/final-cta';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <PainSection />
      <HowItWorks />
      <FeaturesGrid />
      <Differentials />
      <SocialProof />
      <FinalCta />
    </>
  );
}
