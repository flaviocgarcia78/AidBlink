import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

/** Organization dashboard — requires the demo organization session. */
export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "org") {
    redirect("/login?next=/admin&denied=1&role=org");
  }
  return <AdminClient />;
}
