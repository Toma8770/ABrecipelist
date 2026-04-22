import { Pool } from "pg";

const globalForDb = globalThis;

function getPool() {
  if (globalForDb.__recipeDbPool) {
    return globalForDb.__recipeDbPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  globalForDb.__recipeDbPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  return globalForDb.__recipeDbPool;
}

export async function query(text, params = []) {
  const pool = getPool();
  return pool.query(text, params);
}
