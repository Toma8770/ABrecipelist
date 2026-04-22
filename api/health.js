import { query } from "./_db.js";

export default async function handler(_req, res) {
  try {
    const result = await query("select now() as now");
    res.status(200).json({
      ok: true,
      dbTime: result.rows[0]?.now ?? null,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Database connection failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

