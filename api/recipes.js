import { query } from "./_db.js";

const CREATE_TABLE_SQL = `
create table if not exists recipes (
  id bigserial primary key,
  title text not null,
  cuisine text not null,
  tags text[] not null default '{}',
  prep_time text not null default '',
  difficulty text not null default 'Easy',
  servings text not null default '',
  image text not null default '',
  description text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  author text not null default 'system',
  created_at timestamptz not null default now()
);
`;

async function ensureTable() {
  await query(CREATE_TABLE_SQL);
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === "GET") {
      const result = await query(
        "select * from recipes order by created_at desc limit 500",
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const {
        title = "",
        cuisine = "",
        tags = [],
        prepTime = "",
        difficulty = "Easy",
        servings = "",
        image = "",
        description = "",
        ingredients = [],
        steps = [],
        author = "system",
      } = body;

      if (!title || !cuisine) {
        return res.status(400).json({ error: "title and cuisine are required" });
      }

      const inserted = await query(
        `
        insert into recipes
          (title, cuisine, tags, prep_time, difficulty, servings, image, description, ingredients, steps, author)
        values
          ($1, $2, $3::text[], $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11)
        returning *
        `,
        [
          title,
          cuisine,
          tags,
          prepTime,
          difficulty,
          servings,
          image,
          description,
          JSON.stringify(ingredients),
          JSON.stringify(steps),
          author,
        ],
      );

      return res.status(201).json(inserted.rows[0]);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: "Database request failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

