import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { candidates } from "@/db/schema";
import { eq } from "drizzle-orm";
import Navbar from "@/components/Navbar";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "candidate") redirect("/login");

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });

  return (
    <div>
      <Navbar role="candidate" name={candidate?.name} />
      <main className="pt-14">{children}</main>
    </div>
  );
}
