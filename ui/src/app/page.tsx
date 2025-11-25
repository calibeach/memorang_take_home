"use client";

import { LearningProvider } from "@/contexts";
import { MainLayout, LearningContent } from "@/components";

export default function Home() {
  return (
    <LearningProvider>
      <MainLayout>
        <LearningContent />
      </MainLayout>
    </LearningProvider>
  );
}
