import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { IngredientItem, Recipe, RecipeInput, ThemeMode } from "./types";

type StudioMode = "discover" | "compose";
type Role = "admin" | "member";
type UnitSystem = "metric" | "imperial" | "original";

interface Account {
  username: string;
  password: string;
  role: Role;
  ssid: string;
  createdAt: number;
}

const USERS_KEY = "atelier-users";
const SESSION_KEY = "atelier-session";
const CUISINES_KEY = "atelier-cuisines";
const TAGS_KEY = "atelier-tags";
const AUTH_VERSION_KEY = "atelier-auth-version";
const AUTH_VERSION = "v4";

const ADMIN_USERNAME = "AB";
const ADMIN_PASSWORD = "Roseville3040$";
const motionEase = [0.22, 1, 0.36, 1] as const;

const INGREDIENT_UNITS = [
  "g",
  "kg",
  "oz",
  "lb",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "fl oz",
  "piece",
  "clove",
  "pinch",
  "slice",
] as const;

const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 240,
  "fl oz": 29.5735,
};

const defaultRecipeInput = (): RecipeInput => ({
  title: "",
  cuisine: "",
  tags: [],
  prepTime: "",
  difficulty: "Easy",
  servings: "",
  image: "",
  description: "",
  ingredients: [],
  steps: [],
});

const normalizeLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.replace(/\r/g, ""))
    .filter((line) => line.trim().length > 0);

const uniqueByCase = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const generateSSID = (username: string) =>
  `SSID-${username.toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const createAdminAccount = (): Account => ({
  username: ADMIN_USERNAME,
  password: ADMIN_PASSWORD,
  role: "admin",
  ssid: generateSSID(ADMIN_USERNAME),
  createdAt: Date.now(),
});

const parseAmount = (value: string) => {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : null;
};

const parseServings = (value: string) => {
  const servings = Number.parseFloat(value);
  return Number.isFinite(servings) && servings > 0 ? servings : null;
};

const roundAmount = (value: number) => {
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const convertIngredient = (ingredient: IngredientItem, target: UnitSystem): IngredientItem => {
  if (target === "original") return ingredient;

  const normalizedUnit = ingredient.unit.toLowerCase();
  const amount = parseAmount(ingredient.amount);
  if (amount === null) return ingredient;

  if (normalizedUnit in MASS_TO_GRAMS) {
    const grams = amount * MASS_TO_GRAMS[normalizedUnit];
    if (target === "metric") {
      if (grams >= 1000) return { ...ingredient, amount: roundAmount(grams / 1000), unit: "kg" };
      return { ...ingredient, amount: roundAmount(grams), unit: "g" };
    }
    const ounces = grams / MASS_TO_GRAMS.oz;
    if (ounces >= 16) return { ...ingredient, amount: roundAmount(ounces / 16), unit: "lb" };
    return { ...ingredient, amount: roundAmount(ounces), unit: "oz" };
  }

  if (normalizedUnit in VOLUME_TO_ML) {
    const ml = amount * VOLUME_TO_ML[normalizedUnit];
    if (target === "metric") {
      if (ml >= 1000) return { ...ingredient, amount: roundAmount(ml / 1000), unit: "l" };
      return { ...ingredient, amount: roundAmount(ml), unit: "ml" };
    }
    const cups = ml / VOLUME_TO_ML.cup;
    if (cups >= 0.25) return { ...ingredient, amount: roundAmount(cups), unit: "cup" };
    return { ...ingredient, amount: roundAmount(ml / VOLUME_TO_ML.tsp), unit: "tsp" };
  }

  return ingredient;
};

const scaleIngredient = (ingredient: IngredientItem, factor: number): IngredientItem => {
  const amount = parseAmount(ingredient.amount);
  if (amount === null) return ingredient;
  return { ...ingredient, amount: roundAmount(amount * factor) };
};

const normalizeRecipe = (raw: Recipe): Recipe => {
  const normalizedIngredients: IngredientItem[] = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((entry) => {
        if (typeof entry === "string") return { name: entry, amount: "", unit: "" };
        return {
          name: String(entry?.name ?? "").trim(),
          amount: String(entry?.amount ?? "").trim(),
          unit: String(entry?.unit ?? "").trim(),
        };
      })
    : [];

  return {
    ...raw,
    prepTime: String(raw.prepTime ?? ""),
    servings: String(raw.servings ?? ""),
    ingredients: normalizedIngredients,
    steps: Array.isArray(raw.steps) ? raw.steps : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
};

function UploadDropzone({
  image,
  onChange,
}: {
  image: string;
  onChange: (value: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") onChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.label
      className={`dropzone ${isDragging ? "dragging" : ""}`}
      whileHover={{ scale: 1.005 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) readFile(file);
      }}
    >
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readFile(file);
        }}
      />
      <div className="dropzone-copy">
        <p>{image ? "Swap cover image" : "Drag and drop image"}</p>
        <span>or click to upload</span>
      </div>
      <AnimatePresence mode="wait">
        {image ? (
          <motion.img
            key={image}
            src={image}
            alt="Recipe preview"
            className="dropzone-preview"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: motionEase }}
          />
        ) : (
          <motion.div
            key="placeholder"
            className="dropzone-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.label>
  );
}

function RecipeModal({
  open,
  editing,
  initialValues,
  cuisines,
  tags,
  unitSystem,
  desiredServings,
  onClose,
  onSubmit,
  onDelete,
  readOnly,
}: {
  open: boolean;
  editing?: Recipe;
  initialValues: RecipeInput;
  cuisines: string[];
  tags: string[];
  unitSystem: UnitSystem;
  desiredServings: number | null;
  onClose: () => void;
  onSubmit: (recipe: RecipeInput) => void;
  onDelete: (id: string) => void;
  readOnly: boolean;
}) {
  const [values, setValues] = useState<RecipeInput>(initialValues);
  const [pendingTag, setPendingTag] = useState("");
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientAmount, setIngredientAmount] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState<(typeof INGREDIENT_UNITS)[number]>("g");
  const [stepsText, setStepsText] = useState(initialValues.steps.join("\n"));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    setValues(initialValues);
    setPendingTag("");
    setIngredientName("");
    setIngredientAmount("");
    setIngredientUnit("g");
    setStepsText(initialValues.steps.join("\n"));
  }, [open, editing?.id]);

  const cuisineOptions = uniqueByCase([...cuisines, values.cuisine].filter(Boolean));
  const tagOptions = uniqueByCase([...tags, ...values.tags].filter(Boolean));
  const baseServings = parseServings(values.servings);
  const servingScale =
    readOnly && desiredServings !== null && baseServings !== null ? desiredServings / baseServings : 1;
  const displayIngredients = readOnly
    ? values.ingredients.map((ingredient) => convertIngredient(scaleIngredient(ingredient, servingScale), unitSystem))
    : values.ingredients;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;
    if (!values.cuisine) return;
    onSubmit({
      ...values,
      ingredients: values.ingredients.filter((item) => item.name.trim().length > 0),
      steps: normalizeLines(stepsText),
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-root fullscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form
            className="recipe-modal fullscreen"
            onSubmit={handleSubmit}
            initial={reduced ? false : { opacity: 0, scale: 0.995 }}
            animate={reduced ? {} : { opacity: 1, scale: 1 }}
            exit={reduced ? {} : { opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.25, ease: motionEase }}
          >
            <header className="modal-topbar">
              <div>
                <p className="kicker">Recipe Studio</p>
                <h2>{editing ? "Edit recipe" : "Create recipe"}</h2>
              </div>
              <button type="button" className="ghost" onClick={onClose}>
                Exit editor
              </button>
            </header>

            <div className="modal-grid fullscreen">
              <section className="field-block">
                <div className="field">
                  <label>Recipe title</label>
                  <input
                    required
                    value={values.title}
                    onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div className="field two-col">
                  <div>
                    <label>Cuisine</label>
                    <select
                      required
                      value={values.cuisine}
                      onChange={(event) => setValues((prev) => ({ ...prev, cuisine: event.target.value }))}
                      disabled={readOnly}
                    >
                      <option value="">Select cuisine</option>
                      {cuisineOptions.map((cuisine) => (
                        <option key={cuisine} value={cuisine}>
                          {cuisine}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Difficulty</label>
                    <select
                      value={values.difficulty}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, difficulty: event.target.value as Recipe["difficulty"] }))
                      }
                      disabled={readOnly}
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Advanced</option>
                    </select>
                  </div>
                </div>
                <div className="field three-col">
                  <div>
                    <label>Prep time (mins)</label>
                    <input
                      type="text"
                      value={values.prepTime}
                      onChange={(event) => setValues((prev) => ({ ...prev, prepTime: event.target.value }))}
                      placeholder="e.g. 30-40"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label>Servings</label>
                    <input
                      type="text"
                      value={values.servings}
                      onChange={(event) => setValues((prev) => ({ ...prev, servings: event.target.value }))}
                      placeholder="e.g. 2"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label>Tag dropdown</label>
                    <div className="inline-field">
                      <select value={pendingTag} onChange={(event) => setPendingTag(event.target.value)}>
                        <option value="">Select tag</option>
                        {tagOptions.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ghost"
                        disabled={readOnly}
                        onClick={() => {
                          if (readOnly) return;
                          if (!pendingTag) return;
                          setValues((prev) => ({ ...prev, tags: uniqueByCase([...prev.tags, pendingTag]) }));
                          setPendingTag("");
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
                <div className="tag-row editable">
                  {values.tags.length ? (
                    values.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="chip-plain"
                        disabled={readOnly}
                        onClick={() =>
                          setValues((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))
                        }
                      >
                        {tag} x
                      </button>
                    ))
                  ) : (
                    <span className="helper">No tags selected.</span>
                  )}
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    value={values.description}
                    onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                {readOnly ? (
                  <div className="readonly-image-wrap">
                    {values.image ? <img src={values.image} alt="Recipe" className="dropzone-preview" /> : <div className="dropzone-placeholder" />}
                  </div>
                ) : (
                  <UploadDropzone image={values.image} onChange={(image) => setValues((prev) => ({ ...prev, image }))} />
                )}
              </section>

              <section className="field-block">
                <div className="field">
                  <label>Ingredients</label>
                  <div className="ingredient-entry">
                    <input
                      placeholder="Ingredient"
                      value={ingredientName}
                      onChange={(event) => setIngredientName(event.target.value)}
                      disabled={readOnly}
                    />
                    <input
                      placeholder="Amount"
                      value={ingredientAmount}
                      onChange={(event) => setIngredientAmount(event.target.value)}
                      disabled={readOnly}
                    />
                    <select
                      value={ingredientUnit}
                      onChange={(event) => setIngredientUnit(event.target.value as (typeof INGREDIENT_UNITS)[number])}
                      disabled={readOnly}
                    >
                      {INGREDIENT_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ghost"
                      disabled={readOnly}
                      onClick={() => {
                        if (readOnly) return;
                        const name = ingredientName.trim();
                        if (!name) return;
                        setValues((prev) => ({
                          ...prev,
                          ingredients: [
                            ...prev.ingredients,
                            { name, amount: ingredientAmount.trim(), unit: ingredientUnit },
                          ],
                        }));
                        setIngredientName("");
                        setIngredientAmount("");
                        setIngredientUnit("g");
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="ingredient-list">
                  {displayIngredients.length ? (
                    displayIngredients.map((ingredient, index) => (
                      <div key={`${ingredient.name}-${index}`} className="ingredient-row">
                        <span>{ingredient.name}</span>
                        <span>{ingredient.amount || "-"}</span>
                        <span>{ingredient.unit || "-"}</span>
                        <button
                          type="button"
                          className="ghost"
                          disabled={readOnly}
                          onClick={() =>
                            setValues((prev) => ({
                              ...prev,
                              ingredients: prev.ingredients.filter((_, idx) => idx !== index),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="helper">Add ingredients with name, amount, and unit.</p>
                  )}
                </div>
                <div className="field">
                  <label>Steps (new line)</label>
                  <textarea rows={14} value={stepsText} onChange={(event) => setStepsText(event.target.value)} disabled={readOnly} />
                </div>
              </section>
            </div>

            <footer className="modal-footer">
              <span className="helper">
                {readOnly ? "Viewing mode: sign in as admin to edit." : "Ingredient conversion happens automatically on the home page."}
              </span>
              <div className="topbar-actions">
                {editing && !readOnly ? (
                  <button type="button" className="danger" onClick={() => onDelete(editing.id)}>
                    Delete
                  </button>
                ) : null}
                {readOnly ? (
                  <button type="button" className="primary" onClick={onClose}>
                    Close
                  </button>
                ) : (
                  <button type="submit" className="primary" disabled={!cuisineOptions.length}>
                    {editing ? "Save recipe" : "Create recipe"}
                  </button>
                )}
              </div>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuthModal({
  open,
  onClose,
  onRegister,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onRegister: (username: string, password: string) => string | null;
  onLogin: (username: string, password: string) => string | null;
}) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setUsername("");
      setPassword("");
      setError(null);
      setTab("login");
    }
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const runner = tab === "register" ? onRegister : onLogin;
    const msg = runner(username, password);
    if (msg) {
      setError(msg);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-root" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal-backdrop" onClick={onClose} />
          <motion.form
            className="auth-modal"
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            onSubmit={submit}
          >
            <header>
              <p className="kicker">Account</p>
              <button type="button" className="ghost" onClick={onClose}>
                Close
              </button>
            </header>
            <h2>{tab === "register" ? "Create member account" : "Welcome back"}</h2>
            <div className="segmented">
              <button type="button" className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>
                Login
              </button>
              <button type="button" className={tab === "register" ? "active" : ""} onClick={() => setTab("register")} disabled>
                Register
              </button>
            </div>
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(event) => setUsername(event.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="primary" type="submit">
              {tab === "register" ? "Create account" : "Login"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonCard() {
  return <div className="recipe-card skeleton" aria-hidden />;
}

function RecipeCard({
  recipe,
  unitSystem,
  desiredServings,
  onEdit,
  canEdit,
}: {
  recipe: Recipe;
  unitSystem: UnitSystem;
  desiredServings: number | null;
  onEdit: (recipe: Recipe) => void;
  canEdit: boolean;
}) {
  const recipeServings = parseServings(recipe.servings);
  const servingScale =
    desiredServings !== null && recipeServings !== null ? desiredServings / recipeServings : 1;
  const previewIngredients = recipe.ingredients
    .slice(0, 3)
    .map((ingredient) => convertIngredient(scaleIngredient(ingredient, servingScale), unitSystem));
  const displayServings =
    desiredServings !== null && recipeServings !== null ? String(desiredServings) : recipe.servings || "-";

  return (
    <motion.article
      layout
      className="recipe-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: motionEase }}
      whileHover={{ y: -8, rotateX: 0.45, rotateY: -0.3 }}
      whileTap={{ scale: 0.99 }}
      style={{ transformStyle: "preserve-3d" }}
      onClick={() => onEdit(recipe)}
    >
      <div className="card-image-wrap">
        <img src={recipe.image} alt={recipe.title} />
      </div>
      <div className="card-body">
        <p className="card-cuisine">
          {recipe.cuisine} cuisine 
        </p>
        <h3>{recipe.title}</h3>
        <p className="card-description">{recipe.description}</p>
        <div className="meta-row">
          <span>{recipe.prepTime || "-"} min</span>
          <span>{recipe.difficulty}</span>
          <span>{displayServings} servings</span>
        </div>
        <div className="tag-row">
          {recipe.tags.map((tag) => (
            <span key={`${recipe.id}-${tag}`}>{tag}</span>
          ))}
        </div>
        <div className="ingredient-preview">
          {previewIngredients.length ? (
            previewIngredients.map((ingredient, index) => (
              <p key={`${ingredient.name}-${index}`}>
                {ingredient.name}: {ingredient.amount || "-"} {ingredient.unit || ""}
              </p>
            ))
          ) : (
            <p>No ingredients listed.</p>
          )}
        </div>
        <div className="hover-preview">
          <p>{recipe.steps[0] ?? "No step preview available."}</p>
          <p>{recipe.steps[1] ?? ""}</p>
        </div>
      </div>
      {canEdit ? (
        <motion.button
          className="card-edit"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(recipe);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Edit
        </motion.button>
      ) : null}
    </motion.article>
  );
}

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userCuisines, setUserCuisines] = useState<string[]>([]);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [activeCuisine, setActiveCuisine] = useState("All");
  const [activeTag, setActiveTag] = useState("All");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("original");
  const [desiredServingsInput, setDesiredServingsInput] = useState("");
  const [mode, setMode] = useState<StudioMode>("discover");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [users, setUsers] = useState<Account[]>([]);
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [newCuisine, setNewCuisine] = useState("");
  const [newTag, setNewTag] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (localStorage.getItem(AUTH_VERSION_KEY) !== AUTH_VERSION) {
      localStorage.setItem(USERS_KEY, JSON.stringify([createAdminAccount()]));
      localStorage.removeItem(SESSION_KEY);
      localStorage.setItem(AUTH_VERSION_KEY, AUTH_VERSION);
    }

    const parsedUsers = (JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as Account[]).map((account) => {
      const normalizedRole: Role =
        account.username.toLowerCase() === ADMIN_USERNAME.toLowerCase() ? "admin" : "member";
      return {
        ...account,
        ssid: account.ssid || generateSSID(account.username),
        role: normalizedRole,
      };
    });
    const normalizedUsers =
      parsedUsers.find((account) => account.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) !== undefined
        ? parsedUsers
        : [...parsedUsers, createAdminAccount()];

    setUsers(normalizedUsers);
    const rawSession = localStorage.getItem(SESSION_KEY);
    if (rawSession) {
      setCurrentUser(normalizedUsers.find((user) => user.username === rawSession) ?? null);
    }

    const storedCuisines = JSON.parse(localStorage.getItem(CUISINES_KEY) ?? "[]") as string[];
    setUserCuisines(storedCuisines.length ? storedCuisines : ["General"]);
    setUserTags(JSON.parse(localStorage.getItem(TAGS_KEY) ?? "[]") as string[]);
    setHydrated(true);

    const loadRecipes = async () => {
      try {
        const response = await fetch("/api/recipes");
        if (!response.ok) throw new Error(`Failed with status ${response.status}`);
        const records = (await response.json()) as Recipe[];
        setRecipes(Array.isArray(records) ? records.map(normalizeRecipe) : []);
      } catch (_error) {
        setAdminMessage("Could not load recipes from database.");
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    void loadRecipes();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (currentUser) localStorage.setItem(SESSION_KEY, currentUser.username);
    else localStorage.removeItem(SESSION_KEY);
  }, [currentUser, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CUISINES_KEY, JSON.stringify(userCuisines));
  }, [userCuisines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(TAGS_KEY, JSON.stringify(userTags));
  }, [userTags, hydrated]);

  const cuisines = useMemo(
    () => ["All", ...uniqueByCase([...userCuisines, ...recipes.map((recipe) => recipe.cuisine)])],
    [recipes, userCuisines],
  );
  const tags = useMemo(
    () => ["All", ...uniqueByCase([...userTags, ...recipes.flatMap((recipe) => recipe.tags)])],
    [recipes, userTags],
  );

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchText = [recipe.title, recipe.description, recipe.cuisine, recipe.author]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchCuisine = activeCuisine === "All" || recipe.cuisine === activeCuisine;
      const matchTag = activeTag === "All" || recipe.tags.includes(activeTag);
      return matchText && matchCuisine && matchTag;
    });
  }, [recipes, query, activeCuisine, activeTag]);

  const desiredServings = useMemo(() => {
    const parsed = Number.parseFloat(desiredServingsInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [desiredServingsInput]);

  const register = (usernameRaw: string, password: string): string | null => {
    const username = usernameRaw.trim();
    if (username.length < 2) return "Username must be at least 2 characters.";
    if (password.length < 4) return "Password must be at least 4 characters.";
    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return "Username already exists.";

    const account: Account = {
      username,
      password,
      role: "member",
      ssid: generateSSID(username),
      createdAt: Date.now(),
    };
    setUsers((prev) => [...prev, account]);
    setCurrentUser(account);
    return null;
  };

  const login = (usernameRaw: string, password: string): string | null => {
    const username = usernameRaw.trim();
    const account =
      users.find((user) => user.username.toLowerCase() === username.toLowerCase() && user.password === password) ?? null;
    if (!account) return "Invalid username or password.";
    setCurrentUser(account);
    return null;
  };

  const handleCreate = () => {
    if (!currentUser) {
      setAuthOpen(true);
      return;
    }
    if (currentUser.role !== "admin") return;
    setEditingRecipe(undefined);
    setModalOpen(true);
  };

  const saveRecipe = async (input: RecipeInput) => {
    if (!currentUser || currentUser.role !== "admin") return;
    const payload = {
      ...input,
      author: currentUser.username,
      image:
        input.image ||
        "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1300&q=80",
    };

    try {
      if (editingRecipe) {
        const response = await fetch(`/api/recipes?id=${encodeURIComponent(editingRecipe.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Failed with status ${response.status}`);
        const updated = normalizeRecipe((await response.json()) as Recipe);
        setRecipes((prev) => prev.map((recipe) => (recipe.id === editingRecipe.id ? updated : recipe)));
      } else {
        const response = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Failed with status ${response.status}`);
        const created = normalizeRecipe((await response.json()) as Recipe);
        setRecipes((prev) => [created, ...prev]);
      }
      setModalOpen(false);
      setEditingRecipe(undefined);
      setAdminMessage("");
    } catch (_error) {
      setAdminMessage("Could not save recipe. Please retry.");
    }
  };

  const handleSubmit = (input: RecipeInput) => {
    void saveRecipe(input);
  };

  const deleteRecipe = async (id: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      const response = await fetch(`/api/recipes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Failed with status ${response.status}`);
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
      setModalOpen(false);
      setEditingRecipe(undefined);
      setAdminMessage("");
    } catch (_error) {
      setAdminMessage("Could not delete recipe. Please retry.");
    }
  };

  const handleDelete = (id: string) => {
    void deleteRecipe(id);
  };

  const addCuisine = () => {
    if (currentUser?.role !== "admin") return;
    const value = newCuisine.trim();
    if (!value) return;
    if (userCuisines.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
      setAdminMessage("Cuisine already exists.");
      return;
    }
    setUserCuisines((prev) => [...prev, value]);
    setNewCuisine("");
    setAdminMessage("Cuisine added.");
  };

  const addTag = () => {
    if (currentUser?.role !== "admin") return;
    const value = newTag.trim();
    if (!value) return;
    if (userTags.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
      setAdminMessage("Tag already exists.");
      return;
    }
    setUserTags((prev) => [...prev, value]);
    setNewTag("");
    setAdminMessage("Tag added.");
  };

  const initialValues = editingRecipe
    ? {
        title: editingRecipe.title,
        cuisine: editingRecipe.cuisine,
        tags: editingRecipe.tags,
        prepTime: editingRecipe.prepTime,
        difficulty: editingRecipe.difficulty,
        servings: editingRecipe.servings,
        image: editingRecipe.image,
        description: editingRecipe.description,
        ingredients: editingRecipe.ingredients,
        steps: editingRecipe.steps,
      }
    : defaultRecipeInput();

  return (
    <div
      className="app-shell"
      onMouseMove={(event) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        setParallax({
          x: (event.clientX - cx) / cx,
          y: (event.clientY - cy) / cy,
        });
      }}
    >
      <div className="ambient" style={{ transform: `translate3d(${parallax.x * 14}px, ${parallax.y * -10}px, 0)` }} />

      <header className="topbar">
        <div>
          <p className="brand-mark">Anuj's Kitchen</p>
          <h1>Recipe Center</h1>
        </div>
        <div className="topbar-actions">
          <div className="segmented">
            {(["discover", "compose"] as const).map((item) => (
              <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          <button className="ghost" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} type="button">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          {currentUser ? (
            <button className="ghost" onClick={() => setCurrentUser(null)} type="button">
              Logout ({currentUser.username})
            </button>
          ) : (
            <button className="ghost" onClick={() => setAuthOpen(true)} type="button">
              Login / Register
            </button>
          )}
          <button className={`primary ${currentUser?.role !== "admin" ? "locked" : ""}`} onClick={handleCreate} type="button">
            Create Recipe
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="side-panel">
          <h3>Filters</h3>
          <input className="side-search" placeholder="Search recipes..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <p className="side-label">Measurement</p>
          <div className="segmented">
            <button type="button" className={unitSystem === "original" ? "active" : ""} onClick={() => setUnitSystem("original")}>
              Original
            </button>
            <button type="button" className={unitSystem === "metric" ? "active" : ""} onClick={() => setUnitSystem("metric")}>
              Metric
            </button>
            <button type="button" className={unitSystem === "imperial" ? "active" : ""} onClick={() => setUnitSystem("imperial")}>
              Imperial
            </button>
          </div>
          <p className="side-label">Desired servings</p>
          <input
            className="side-search"
            type="number"
            min="1"
            step="0.5"
            placeholder="Use recipe default"
            value={desiredServingsInput}
            onChange={(event) => setDesiredServingsInput(event.target.value)}
          />
          <p className="side-label">Cuisine</p>
          <div className="chips">
            {cuisines.map((cuisine) => (
              <motion.button key={cuisine} className={activeCuisine === cuisine ? "active" : ""} onClick={() => setActiveCuisine(cuisine)} whileHover={{ y: -2 }} whileTap={{ y: 0 }} type="button">
                {cuisine}
              </motion.button>
            ))}
          </div>
          <p className="side-label">Tags</p>
          <div className="chips subtle">
            {tags.map((tag) => (
              <motion.button key={tag} className={activeTag === tag ? "active" : ""} onClick={() => setActiveTag(tag)} whileHover={{ y: -2 }} whileTap={{ y: 0 }} type="button">
                {tag}
              </motion.button>
            ))}
          </div>
        </aside>

        <AnimatePresence mode="wait">
          {mode === "discover" ? (
            <motion.main
              key="discover"
              className="panel board-main"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.48, ease: motionEase }}
            >
              <section className="hero">
                <div>
                  <p className="kicker">Live Collection</p>
                  <h2>Create and browse recipes.</h2>
                </div>
              </section>

              <LayoutGroup>
                <motion.section layout className="recipes-grid">
                  {loading
                    ? Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={`s-${idx}`} />)
                    : filteredRecipes.map((recipe) => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          unitSystem={unitSystem}
                          desiredServings={desiredServings}
                          onEdit={(entry) => {
                            if (!currentUser || currentUser.role !== "admin") {
                              setViewOnlyMode(true);
                              setEditingRecipe(entry);
                              setModalOpen(true);
                              return;
                            }
                            setViewOnlyMode(false);
                            setEditingRecipe(entry);
                            setModalOpen(true);
                          }}
                          canEdit={currentUser?.role === "admin"}
                        />
                      ))}
                </motion.section>
              </LayoutGroup>

              {!loading && filteredRecipes.length === 0 ? (
                <motion.section className="empty-state" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                  <p>No recipes yet.</p>
                  {currentUser?.role === "admin" ? (
                    <button className="ghost" onClick={handleCreate} type="button">
                      Create recipe
                    </button>
                  ) : null}
                </motion.section>
              ) : null}
            </motion.main>
          ) : (
            <motion.main
              key="compose"
              className="panel board-main studio"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.48, ease: motionEase }}
            >
              <section className="studio-feature">
                <div>
                  <p className="kicker">Creator Flow</p>
                  <h2>Structured ingredient entry with automatic unit conversion.</h2>
                  <button
                    type="button"
                    className={`primary ${currentUser?.role !== "admin" ? "locked" : ""}`}
                    onClick={currentUser?.role === "admin" ? handleCreate : undefined}
                  >
                    Open Recipe Studio
                  </button>
                </div>
                <div className="studio-stats">
                  <article>
                    <p>Total Recipes</p>
                    <h3>{recipes.length}</h3>
                  </article>
                  <article>
                    <p>Total Accounts</p>
                    <h3>{users.length}</h3>
                  </article>
                  <article>
                    <p>Current Role</p>
                    <h3>{currentUser ? currentUser.role : "Guest"}</h3>
                  </article>
                </div>
              </section>
            </motion.main>
          )}
        </AnimatePresence>

        <aside className="right-panel">
          <h3>Session</h3>
          {currentUser ? (
            <div className="session-card">
              <p>
                Logged in as <strong>{currentUser.username}</strong>
              </p>
              <span className="role-chip">{currentUser.role}</span>
              <p className="helper">SSID: {currentUser.ssid}</p>
            </div>
          ) : (
            <div className="session-card">
              <p>You are browsing as a guest.</p>
            </div>
          )}

          {currentUser?.role === "admin" ? (
            <div className="rules-card">
              <h4>Category Manager</h4>
              <div className="inline-field">
                <input placeholder="Add cuisine" value={newCuisine} onChange={(event) => setNewCuisine(event.target.value)} />
                <button className="ghost" type="button" onClick={addCuisine}>
                  Add
                </button>
              </div>
              <div className="inline-field">
                <input placeholder="Add tag" value={newTag} onChange={(event) => setNewTag(event.target.value)} />
                <button className="ghost" type="button" onClick={addTag}>
                  Add
                </button>
              </div>
              {adminMessage ? <p className="helper">{adminMessage}</p> : null}
            </div>
          ) : null}
        </aside>
      </section>

      <RecipeModal
        open={modalOpen}
        editing={editingRecipe}
        initialValues={initialValues}
        cuisines={uniqueByCase([...userCuisines, ...recipes.map((recipe) => recipe.cuisine)])}
        tags={uniqueByCase([...userTags, ...recipes.flatMap((recipe) => recipe.tags)])}
        unitSystem={unitSystem}
        desiredServings={desiredServings}
        onClose={() => {
          setModalOpen(false);
          setEditingRecipe(undefined);
          setViewOnlyMode(false);
        }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        readOnly={viewOnlyMode || currentUser?.role !== "admin"}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onRegister={register} onLogin={login} />
    </div>
  );
}
