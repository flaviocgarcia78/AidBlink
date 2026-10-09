import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RedeemClient from "./RedeemClient";

export const dynamic = "force-dynamic";

/** Partner terminal — requires the demo partner session. */
export default async function RedeemPage() {
  const session = await getSession();
  if (!session || session.role !== "partner") {
    redirect("/login?next=/redeem&denied=1&role=partner");
  }
  return (
    <Suspense fallback={<p className="text-slate-500">Loading partner terminal…</p>}>
      <RedeemClient />
    </Suspense>
  );
}
