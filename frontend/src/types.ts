export type Category = {
  id: number;
  name: string;
  icon?: string;
}

export type Ingredient = {
  id?: number;
  name: string;
  quantity: string;
  unit: string;
}

export type Instruction = {
  id?: number;
  stepNumber: number;
  instructionText: string;
}

export type Recipe = {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  prepTime: string;
  cookTime: string;
  servings: number;
  imageUrl?: string;
  isFavorite?: boolean | number;
  ingredients?: Ingredient[];
  instructions?: Instruction[];
}
