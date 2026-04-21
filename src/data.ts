import type { Recipe } from "./types";

export const seedRecipes: Recipe[] = [
  {
    id: "r-01",
    author: "system",
    title: "Miso Butter Black Cod",
    cuisine: "Japanese",
    tags: ["Seafood", "Umami", "Dinner"],
    prepTime: "32",
    difficulty: "Medium",
    servings: "2",
    image:
      "https://images.unsplash.com/photo-1559847844-d721426d6edc?auto=format&fit=crop&w=1300&q=80",
    description:
      "Silky cod glazed with a sweet-savory miso butter reduction, balanced with pickled cucumber ribbons.",
    ingredients: [
      { name: "black cod fillets", amount: "2", unit: "piece" },
      { name: "white miso", amount: "2", unit: "tbsp" },
      { name: "mirin", amount: "1", unit: "tbsp" },
      { name: "unsalted butter", amount: "1", unit: "tbsp" },
      { name: "brown sugar", amount: "1", unit: "tsp" },
      { name: "cucumber", amount: "1", unit: "piece" },
    ],
    steps: [
      "Whisk miso, mirin, butter, and sugar until smooth.",
      "Marinate cod for 20 minutes and broil until caramelized.",
      "Shave cucumber into ribbons and lightly pickle with rice vinegar.",
      "Plate cod over ribbons and spoon over reduced glaze.",
    ],
  },
  {
    id: "r-02",
    author: "system",
    title: "Citrus Burrata Board",
    cuisine: "Italian",
    tags: ["Vegetarian", "Starter", "Fresh"],
    prepTime: "18",
    difficulty: "Easy",
    servings: "4",
    image:
      "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1300&q=80",
    description:
      "Creamy burrata with charred citrus, basil oil, and crunchy sourdough shards for texture contrast.",
    ingredients: [
      { name: "burrata balls", amount: "2", unit: "piece" },
      { name: "orange", amount: "1", unit: "piece" },
      { name: "grapefruit", amount: "1", unit: "piece" },
      { name: "basil oil", amount: "2", unit: "tbsp" },
      { name: "sourdough slices", amount: "4", unit: "slice" },
      { name: "flaky sea salt", amount: "1", unit: "pinch" },
    ],
    steps: [
      "Torch citrus segments lightly until edges caramelize.",
      "Toast sourdough and break into shards.",
      "Layer burrata, citrus, and basil oil.",
      "Finish with salt and cracked pepper.",
    ],
  },
  {
    id: "r-03",
    author: "system",
    title: "Smoked Chili Udon",
    cuisine: "Fusion",
    tags: ["Noodles", "Comfort", "Spicy"],
    prepTime: "24",
    difficulty: "Medium",
    servings: "3",
    image:
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1300&q=80",
    description:
      "Chewy udon in smoky chili broth, layered with sesame kale and crispy shallots for depth.",
    ingredients: [
      { name: "udon noodles", amount: "300", unit: "g" },
      { name: "chili paste", amount: "2", unit: "tbsp" },
      { name: "smoked paprika", amount: "1", unit: "tsp" },
      { name: "mushroom stock", amount: "2", unit: "cup" },
      { name: "kale", amount: "1", unit: "cup" },
      { name: "shallots", amount: "2", unit: "piece" },
    ],
    steps: [
      "Sweat shallots and bloom chili paste with paprika.",
      "Add stock and simmer until aromatic.",
      "Cook udon separately and toss into broth.",
      "Top with sauteed kale and crispy shallots.",
    ],
  },
];
