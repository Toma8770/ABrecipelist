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

function toRecipeResponse(row) {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    cuisine: String(row.cuisine ?? ""),
    tags: Array.isArray(row.tags) ? row.tags : [],
    prepTime: String(row.prep_time ?? ""),
    difficulty: String(row.difficulty ?? "Easy"),
    servings: String(row.servings ?? ""),
    image: String(row.image ?? ""),
    description: String(row.description ?? ""),
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
    author: String(row.author ?? "system"),
  };
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === "GET") {
      const result = await query(
        "select * from recipes order by created_at desc limit 500",
      );
      return res.status(200).json(result.rows.map(toRecipeResponse));
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

      return res.status(201).json(toRecipeResponse(inserted.rows[0]));
    }

    if (req.method === "PUT") {
      const id = String(req.query?.id ?? req.body?.id ?? "").trim();
      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

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

      const updated = await query(
        `
        update recipes
        set
          title = $1,
          cuisine = $2,
          tags = $3::text[],
          prep_time = $4,
          difficulty = $5,
          servings = $6,
          image = $7,
          description = $8,
          ingredients = $9::jsonb,
          steps = $10::jsonb,
          author = $11
        where id = $12::bigint
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
          id,
        ],
      );

      if (!updated.rowCount) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      return res.status(200).json(toRecipeResponse(updated.rows[0]));
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id ?? "").trim();
      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

      const deleted = await query(
        "delete from recipes where id = $1::bigint returning id",
        [id],
      );
      if (!deleted.rowCount) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: "Database request failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
