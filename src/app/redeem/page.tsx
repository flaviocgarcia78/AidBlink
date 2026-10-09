import { Suspense } from "react";
import RedeemClient from "./RedeemClient";

export default function RedeemPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading partner terminal…</p>}>
      <RedeemClient />
    </Suspense>
  );
}
