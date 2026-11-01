import importedRecipes from "./imported-recipes.json";
export type Food = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: number;
  unit: string;
  kind: "grains" | "green" | "protein" | "fruit" | "breakfast";
};
export const foods: Food[] = [
  [
    "arroz",
    "Arroz integral cozido",
    124,
    2.6,
    25.8,
    1,
    100,
    "4 colheres",
    "grains",
  ],
  [
    "feijao",
    "Feijão carioca cozido",
    76,
    4.8,
    13.6,
    0.5,
    100,
    "1 concha",
    "grains",
  ],
  [
    "frango",
    "Peito de frango grelhado",
    159,
    32,
    0,
    2.5,
    120,
    "1 filé",
    "protein",
  ],
  ["ovo", "Ovo cozido", 146, 13.3, 0.6, 9.5, 50, "1 unidade", "protein"],
  ["banana", "Banana-prata", 98, 1.3, 26, 0.1, 80, "1 unidade", "fruit"],
  ["maca", "Maçã com casca", 56, 0.3, 15.2, 0.1, 130, "1 unidade", "fruit"],
  [
    "aveia",
    "Aveia em flocos",
    394,
    13.9,
    66.6,
    8.5,
    30,
    "3 colheres",
    "breakfast",
  ],
  ["iogurte", "Iogurte natural", 51, 4.1, 1.9, 3, 170, "1 pote", "breakfast"],
  ["pao", "Pão integral", 253, 9.4, 49.9, 3.7, 50, "2 fatias", "breakfast"],
  [
    "queijo",
    "Queijo minas frescal",
    264,
    17.4,
    3.2,
    20.2,
    30,
    "1 fatia",
    "protein",
  ],
  ["brocolis", "Brócolis cozido", 25, 2.1, 4.4, 0.5, 100, "1 porção", "green"],
  ["cenoura", "Cenoura cozida", 30, 0.8, 6.7, 0.2, 80, "1 porção", "green"],
  ["tomate", "Tomate cru", 15, 1.1, 3.1, 0.2, 100, "1 unidade", "green"],
  ["abacate", "Abacate", 96, 1.2, 6, 8.4, 100, "1 porção", "fruit"],
  ["salmao", "Salmão grelhado", 229, 23.9, 0, 14, 120, "1 filé", "protein"],
  ["tofu", "Tofu", 64, 6.6, 2.1, 4, 100, "1 porção", "protein"],
  [
    "grao",
    "Grão-de-bico cozido",
    164,
    8.9,
    27.4,
    2.6,
    100,
    "1 concha",
    "grains",
  ],
  [
    "batata",
    "Batata-doce cozida",
    77,
    0.6,
    18.4,
    0.1,
    100,
    "1 porção",
    "grains",
  ],
  ["quinoa", "Quinoa cozida", 120, 4.4, 21.3, 1.9, 100, "1 porção", "grains"],
  [
    "leite",
    "Leite integral",
    61,
    3.2,
    4.7,
    3.3,
    200,
    "1 copo (aprox.)",
    "breakfast",
  ],
  ["morango", "Morango", 30, 0.9, 6.8, 0.3, 100, "1 porção", "fruit"],
  [
    "castanha",
    "Castanha-de-caju",
    570,
    18.5,
    29.1,
    46.3,
    20,
    "1 punhado",
    "grains",
  ],
  ["azeite", "Azeite de oliva", 884, 0, 0, 100, 10, "1 colher", "grains"],
  [
    "macarrao",
    "Macarrão cozido",
    157,
    5.8,
    30.9,
    0.9,
    100,
    "1 porção",
    "grains",
  ],
].map(
  (a) =>
    ({
      id: a[0],
      name: a[1],
      kcal: a[2],
      protein: a[3],
      carbs: a[4],
      fat: a[5],
      portion: a[6],
      unit: a[7],
      kind: a[8],
    }) as Food,
);
export type Recipe = {
  id: string;
  categories?: string[];
  imageFile?: string;
  source?: { document: string; page: number; credit: string };
  sourceNutrition?: string | null;
  yieldLabel?: string;
  notes?: string[];
  name: string;
  subtitle: string;
  category: string;
  minutes: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  vegetarian: boolean | null;
  vegan: boolean | null;
  kind: Food["kind"];
  ingredients: string[];
  steps: string[];
};
const originalRecipes: Recipe[] = [
  {
    id: "overnight",
    name: "Aveia de um novo dia",
    subtitle: "Cremosa, fresca e pronta ao acordar.",
    category: "Café da manhã",
    minutes: 10,
    kcal: 325,
    protein: 14,
    carbs: 48,
    fat: 9,
    vegetarian: true,
    vegan: false,
    kind: "breakfast",
    ingredients: [
      "30 g de aveia",
      "170 g de iogurte natural",
      "1 banana pequena",
      "1 colher de chá de chia",
    ],
    steps: [
      "Misture a aveia, o iogurte e a chia em um pote.",
      "Tampe e leve à geladeira por pelo menos 4 horas.",
      "Cubra com a banana fatiada e sirva.",
    ],
  },
  {
    id: "torrada",
    name: "Torrada de abacate",
    subtitle: "Crocância com um toque de limão.",
    category: "Café da manhã",
    minutes: 10,
    kcal: 310,
    protein: 12,
    carbs: 29,
    fat: 17,
    vegetarian: true,
    vegan: false,
    kind: "green",
    ingredients: [
      "2 fatias de pão integral",
      "60 g de abacate",
      "1 ovo",
      "Limão e pimenta a gosto",
    ],
    steps: [
      "Toste o pão. Amasse o abacate com limão.",
      "Cozinhe o ovo até atingir o ponto desejado.",
      "Monte as torradas com o abacate e o ovo.",
    ],
  },
  {
    id: "bowl",
    name: "Bowl da horta",
    subtitle: "Grãos, vegetais e muitas cores.",
    category: "Almoço",
    minutes: 25,
    kcal: 420,
    protein: 18,
    carbs: 58,
    fat: 13,
    vegetarian: true,
    vegan: true,
    kind: "green",
    ingredients: [
      "100 g de grão-de-bico cozido",
      "100 g de quinoa cozida",
      "100 g de tomate",
      "80 g de cenoura",
      "1 colher de chá de azeite",
    ],
    steps: [
      "Cozinhe a quinoa conforme a embalagem.",
      "Corte os vegetais e misture com o grão-de-bico.",
      "Sirva com a quinoa, azeite e limão.",
    ],
  },
  {
    id: "frango",
    name: "Frango com raízes",
    subtitle: "O clássico do almoço, renovado.",
    category: "Almoço",
    minutes: 30,
    kcal: 465,
    protein: 42,
    carbs: 43,
    fat: 14,
    vegetarian: false,
    vegan: false,
    kind: "protein",
    ingredients: [
      "120 g de peito de frango",
      "150 g de batata-doce",
      "100 g de brócolis",
      "1 colher de chá de azeite",
      "Alho e ervas a gosto",
    ],
    steps: [
      "Corte a batata em cubos e asse até ficar macia.",
      "Grelhe o frango até ficar completamente cozido.",
      "Cozinhe o brócolis no vapor e monte o prato.",
    ],
  },
  {
    id: "salmao",
    name: "Salmão e verdes",
    subtitle: "Um jantar leve, cheio de sabor.",
    category: "Jantar",
    minutes: 25,
    kcal: 440,
    protein: 34,
    carbs: 24,
    fat: 23,
    vegetarian: false,
    vegan: false,
    kind: "protein",
    ingredients: [
      "120 g de salmão",
      "100 g de arroz integral cozido",
      "100 g de brócolis",
      "Limão e ervas",
    ],
    steps: [
      "Tempere o peixe com limão e ervas.",
      "Asse até que esteja completamente cozido.",
      "Sirva com arroz aquecido e brócolis no vapor.",
    ],
  },
  {
    id: "tofu",
    name: "Tofu dourado",
    subtitle: "Vegetais e proteína vegetal.",
    category: "Jantar",
    minutes: 20,
    kcal: 365,
    protein: 22,
    carbs: 38,
    fat: 14,
    vegetarian: true,
    vegan: true,
    kind: "green",
    ingredients: [
      "180 g de tofu",
      "100 g de arroz integral cozido",
      "100 g de brócolis",
      "80 g de cenoura",
      "1 colher de chá de azeite",
    ],
    steps: [
      "Seque o tofu e corte em cubos.",
      "Doure o tofu no azeite e acrescente os vegetais.",
      "Sirva com o arroz integral.",
    ],
  },
  {
    id: "iogurte",
    name: "Pausa de morangos",
    subtitle: "Uma pausa simples e deliciosa.",
    category: "Lanche",
    minutes: 5,
    kcal: 185,
    protein: 9,
    carbs: 20,
    fat: 7,
    vegetarian: true,
    vegan: false,
    kind: "fruit",
    ingredients: [
      "170 g de iogurte natural",
      "100 g de morangos",
      "10 g de aveia",
    ],
    steps: [
      "Lave e corte os morangos.",
      "Sirva com o iogurte e finalize com aveia.",
    ],
  },
  {
    id: "frutas",
    name: "Frutas com castanhas",
    subtitle: "Energia para seguir o seu dia.",
    category: "Lanche",
    minutes: 5,
    kcal: 210,
    protein: 4,
    carbs: 29,
    fat: 10,
    vegetarian: true,
    vegan: true,
    kind: "fruit",
    ingredients: ["1 maçã", "1 banana pequena", "15 g de castanha-de-caju"],
    steps: [
      "Lave e corte as frutas.",
      "Divida em uma tigela e acrescente as castanhas.",
    ],
  },
];
export const recipes: Recipe[] = [
  ...(importedRecipes as Recipe[]),
  ...originalRecipes,
];
export const plans = [
  {
    id: "equilibrio",
    name: "Equilíbrio cotidiano",
    tag: "VARIEDADE À MESA",
    description:
      "Combine grãos, vegetais e fontes de proteína, sem complicar a sua rotina.",
    kind: "green",
    color: "#DBE8CC",
    recipeIds: ["overnight", "frango", "salmao", "iogurte"],
  },
  {
    id: "vegetal",
    name: "Mais plantas, mais cores",
    tag: "INSPIRAÇÃO VEGETARIANA",
    description:
      "Descubra formas de incluir mais leguminosas e vegetais nas suas refeições.",
    kind: "grains",
    color: "#E9DFC9",
    recipeIds: ["torrada", "bowl", "tofu", "frutas"],
  },
  {
    id: "proteina",
    name: "Proteína com variedade",
    tag: "COMPOSIÇÃO DO PRATO",
    description:
      "Explore receitas com fontes variadas de proteína, sempre junto de vegetais.",
    kind: "protein",
    color: "#F1DDD1",
    recipeIds: ["overnight", "frango", "tofu", "iogurte"],
  },
] as const;
