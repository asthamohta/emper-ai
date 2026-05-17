import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import Navbar from "@/components/Navbar";

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "company") redirect("/login");

  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.userId),
  });

  return (
    <div>
      <Navbar role="company" name={company?.name} />
      <main className="pt-14">{children}</main>
    </div>
  );
}
