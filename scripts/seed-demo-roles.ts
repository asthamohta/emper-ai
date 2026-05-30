/**
 * Seed two demo roles for the end-to-end match flow:
 *   - Modal Labs · Founding ML Infrastructure Engineer  (strong fit for Maya)
 *   - Perplexity · Applied AI Research Engineer           (likely walk-away —
 *     Maya wants shipping, the role is research-heavy)
 *
 * Adapted from izhaar-agents/src/mock_data/roles.py. Each role gets its own
 * company (synthetic company users — never logged in).
 *
 * Run: npx tsx scripts/seed-demo-roles.ts
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });

import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { companies, jobs, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

const PASSWORD = "demo-only-not-real";

type RoleSeed = {
  email: string;
  companyName: string;
  role: typeof jobs.$inferInsert;
};

const ROLES: RoleSeed[] = [
  {
    email: "hiring@modal-demo.izhaar.local",
    companyName: "Modal Labs",
    role: {
      // companyId injected at insert time
      companyId: "",
      title: "Founding ML Infrastructure Engineer",
      description:
        "Own a slice of Modal's GPU runtime end-to-end: container orchestration, " +
        "the serverless function lifecycle, inference latency, and the SDK that " +
        "millions of devs (will) use to spin up GPUs. You'll work directly with " +
        "the founders and own a P0 system from week one.",
      hardRequirements: [
        "4+ years systems / infrastructure engineering",
        "Production experience with one of: container runtimes, distributed systems, GPU scheduling",
        "Strong Python and at least one of Go / Rust / C++",
        "NYC (HQ) or SF (in-office 3+ days/wk)",
      ],
      softRequirements: [
        "Has shipped open-source infra projects",
        "Writes clearly (engineering blog contributions welcome)",
        "Comfortable owning systems that other engineers depend on",
      ],
      compRange: { min: 200000, max: 280000, currency: "USD" },
      location: "NYC HQ (3+ days in-office) or SF",
      remote: false,
      active: true,
    },
  },
  {
    email: "hiring@perplexity-demo.izhaar.local",
    companyName: "Perplexity",
    role: {
      companyId: "",
      title: "Applied AI Research Engineer, Retrieval & Search Quality",
      description:
        "Improve answer quality through better retrieval, re-ranking, and grounding. " +
        "Design experiments, train and evaluate retrieval models, ship improvements " +
        "that move search-quality metrics in production. Half research mindset, half " +
        "production engineer.",
      hardRequirements: [
        "3+ years ML engineering with PyTorch in production",
        "Has shipped models that serve real users (not only research code)",
        "Strong on retrieval / search / embeddings / RAG",
        "SF Bay Area or willing to relocate (3 days in-office)",
      ],
      softRequirements: [
        "Co-authored ML papers at top venues (NeurIPS / ICLR / ACL / SIGIR) preferred",
        "Cares about both offline metrics AND end-user answer quality",
        "Comfortable reading and reproducing recent search/retrieval papers",
      ],
      compRange: { min: 230000, max: 330000, currency: "USD" },
      location: "SF Bay Area (hybrid, 3 days in-office)",
      remote: false,
      active: true,
    },
  },
];

async function upsertCompanyAndUser(
  email: string,
  companyName: string
): Promise<{ userId: string; companyId: string }> {
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash: await hashPassword(PASSWORD),
        role: "company",
        onboardingComplete: true,
      })
      .returning();
    console.log(`  user created: ${email} (${user.id})`);
  } else {
    console.log(`  user exists: ${email} (${user.id})`);
  }

  let company = await db.query.companies.findFirst({
    where: eq(companies.userId, user.id),
  });
  if (!company) {
    [company] = await db
      .insert(companies)
      .values({ userId: user.id, name: companyName })
      .returning();
    console.log(`  company created: ${companyName} (${company.id})`);
  } else {
    console.log(`  company exists: ${companyName} (${company.id})`);
  }
  return { userId: user.id, companyId: company.id };
}

async function upsertJob(companyId: string, seed: typeof jobs.$inferInsert) {
  const existing = await db.query.jobs.findFirst({
    where: (j, { and: a, eq: e }) =>
      a(e(j.companyId, companyId), e(j.title, seed.title)),
  });
  if (existing) {
    console.log(`  job exists: ${seed.title} (${existing.id})`);
    return existing.id;
  }
  const [row] = await db
    .insert(jobs)
    .values({ ...seed, companyId })
    .returning({ id: jobs.id });
  console.log(`  job created: ${seed.title} (${row.id})`);
  return row.id;
}

async function main() {
  console.log("Seeding demo roles...");
  const created: Array<{ jobId: string; title: string; company: string }> = [];
  for (const r of ROLES) {
    const { companyId } = await upsertCompanyAndUser(r.email, r.companyName);
    const jobId = await upsertJob(companyId, r.role);
    created.push({ jobId, title: r.role.title, company: r.companyName });
  }
  console.log("\nDONE. Roles seeded:");
  for (const c of created) {
    console.log(`  ${c.jobId} · ${c.company} · ${c.title}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
