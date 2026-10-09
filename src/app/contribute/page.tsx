"use client";

import dynamic from "next/dynamic";

// The contribution page touches the browser wallet API, so it is rendered
// client-side only.
const ContributeClient = dynamic(() => import("./ContributeClient"), {
  ssr: false,
});

export default function ContributePage() {
  return <ContributeClient />;
}
