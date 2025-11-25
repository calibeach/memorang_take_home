"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { ReactNode } from "react";

interface CopilotKitProviderProps {
  children: ReactNode;
}

export function CopilotKitProvider({ children }: CopilotKitProviderProps) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      publicLicenseKey={process.env.NEXT_PUBLIC_COPILOT_LICENSE_KEY}
    >
      {children}
    </CopilotKit>
  );
}
