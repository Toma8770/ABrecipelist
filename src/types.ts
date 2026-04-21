export type ThemeMode = "light" | "dark";

export interface IngredientItem {
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  author: string;
  title: string;
  cuisine: string;
  tags: string[];
  prepTime: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  servings: string;
  image: string;
  description: string;
  ingredients: IngredientItem[];
  steps: string[];
}

export interface RecipeInput {
  title: string;
  cuisine: string;
  tags: string[];
  prepTime: string;
  difficulty: Recipe["difficulty"];
  servings: string;
  image: string;
  description: string;
  ingredients: IngredientItem[];
  steps: string[];
}
