import { Pool } from "pg";

// Run this script once to set up the database: npx ts-node src/db/migrate.ts
// Or use: npm run db:push

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("pgvector extension enabled");

    // Create vector column for candidate_chunks
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='candidate_chunks' AND column_name='embedding_vec'
        ) THEN
          ALTER TABLE candidate_chunks ADD COLUMN embedding_vec vector(1536);
        END IF;
      END $$;
    `);

    // Create vector column for job_chunks
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='job_chunks' AND column_name='embedding_vec'
        ) THEN
          ALTER TABLE job_chunks ADD COLUMN embedding_vec vector(1536);
        END IF;
      END $$;
    `);

    // Create HNSW index for fast ANN search
    await client.query(`
      CREATE INDEX IF NOT EXISTS candidate_chunks_vec_idx
        ON candidate_chunks USING hnsw (embedding_vec vector_cosine_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS job_chunks_vec_idx
        ON job_chunks USING hnsw (embedding_vec vector_cosine_ops);
    `);

    console.log("Vector columns and indexes created");
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(console.error);
