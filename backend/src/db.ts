import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database;

async function createTables(db: Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      categoryId INTEGER,
      prepTime TEXT,
      cookTime TEXT,
      servings INTEGER,
      imageUrl TEXT,
      isFavorite INTEGER DEFAULT 0,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER,
      name TEXT NOT NULL,
      quantity TEXT,
      unit TEXT,
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER,
      stepNumber INTEGER,
      instructionText TEXT NOT NULL,
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    );
  `);

  // Migration for isFavorite column
  try {
    await db.exec('ALTER TABLE recipes ADD COLUMN isFavorite INTEGER DEFAULT 0');
  } catch (e) {}
}

export async function seedDatabase(db: Database) {
  console.log('Re-seeding database...');
  
  await db.exec('DROP TABLE IF EXISTS ingredients');
  await db.exec('DROP TABLE IF EXISTS instructions');
  await db.exec('DROP TABLE IF EXISTS recipes');
  await db.exec('DROP TABLE IF EXISTS categories');
  
  await createTables(db);

  console.log('Seeding initial categories...');
  const categories = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snacks', 'Drinks'];
  for (const cat of categories) {
    await db.run('INSERT INTO categories (name) VALUES (?)', cat);
  }

  const cats = await db.all('SELECT id, name FROM categories');
  const findId = (name: string) => cats.find(c => c.name === name)?.id;

  const seedRecipes = [
    {
      title: 'Classic Fluffy Pancakes',
      description: 'Deliciously soft and airy pancakes, perfect for a weekend breakfast.',
      categoryId: findId('Breakfast'),
      prepTime: '10 mins',
      cookTime: '15 mins',
      servings: 4,
      ingredients: [
        { name: 'Flour', quantity: '1.5', unit: 'cups' },
        { name: 'Baking Powder', quantity: '3.5', unit: 'tsp' },
        { name: 'Milk', quantity: '1.25', unit: 'cups' },
        { name: 'Butter (melted)', quantity: '3', unit: 'tbsp' }
      ],
      instructions: [
        'In a large bowl, sift together the flour, baking powder, salt and sugar.',
        'Make a well in the center and pour in the milk, egg and melted butter; mix until smooth.',
        'Heat a lightly oiled griddle or frying pan over medium-high heat.',
        'Pour or scoop the batter onto the griddle, using approximately 1/4 cup for each pancake.'
      ]
    },
    {
      title: 'Gourmet Grilled Cheese',
      description: 'Elevated classic with sourdough and aged cheddar.',
      categoryId: findId('Lunch'),
      prepTime: '5 mins',
      cookTime: '10 mins',
      servings: 1,
      ingredients: [
        { name: 'Sourdough Bread', quantity: '2', unit: 'slices' },
        { name: 'Sharp Cheddar', quantity: '3', unit: 'slices' },
        { name: 'Butter', quantity: '1', unit: 'tbsp' }
      ],
      instructions: [
        'Butter one side of each bread slice.',
        'Place cheese between the non-buttered sides.',
        'Grill in a pan over medium heat until golden brown on both sides.'
      ]
    },
    {
      title: 'Garlic Butter Salmon',
      description: 'Pan-seared salmon with a rich garlic butter sauce.',
      categoryId: findId('Dinner'),
      prepTime: '5 mins',
      cookTime: '12 mins',
      servings: 2,
      ingredients: [
        { name: 'Salmon Fillets', quantity: '2', unit: '' },
        { name: 'Garlic', quantity: '3', unit: 'cloves' },
        { name: 'Lemon Juice', quantity: '1', unit: 'tbsp' }
      ],
      instructions: [
        'Season salmon with salt and pepper.',
        'Sear in a pan for 5 minutes skin-side down.',
        'Flip and add garlic and butter, basting the salmon until cooked through.'
      ]
    },
    {
      title: 'Master Scones (Sally\'s Baking Addiction)',
      description: 'A versatile master scone dough that produces flaky, moist scones with crisp edges.',
      categoryId: findId('Breakfast'),
      prepTime: '30 mins',
      cookTime: '25 mins',
      servings: 8,
      ingredients: [
        { name: 'All-purpose flour', quantity: '2', unit: 'cups' },
        { name: 'Granulated sugar', quantity: '0.5', unit: 'cup' },
        { name: 'Salt', quantity: '0.5', unit: 'tsp' },
        { name: 'Baking powder', quantity: '2.5', unit: 'tsp' },
        { name: 'Unsalted butter (frozen)', quantity: '0.5', unit: 'cup' },
        { name: 'Heavy cream', quantity: '0.5', unit: 'cup' },
        { name: 'Egg', quantity: '1', unit: 'large' },
        { name: 'Pure vanilla extract', quantity: '1.5', unit: 'tsp' }
      ],
      instructions: [
        'Whisk flour, sugar, salt, and baking powder together in a large bowl.',
        'Grate the frozen butter and add to flour mixture. Mix until it forms pea-sized crumbs.',
        'In a small bowl, whisk together heavy cream, egg, and vanilla extract.',
        'Drizzle wet ingredients over flour mixture and mix until moistened.',
        'Shape into an 8-inch disc on a floured surface and cut into 8 wedges.',
        'Brush tops with heavy cream and chill in refrigerator for 15 minutes.',
        'Preheat oven to 400°F (204°C).',
        'Bake for 18–26 minutes until edges are golden brown.'
      ]
    }
  ];

  for (const r of seedRecipes) {
    const result = await db.run(
      'INSERT INTO recipes (title, description, categoryId, prepTime, cookTime, servings) VALUES (?, ?, ?, ?, ?, ?)',
      [r.title, r.description, r.categoryId, r.prepTime, r.cookTime, r.servings]
    );
    const recipeId = result.lastID;
    for (const ing of r.ingredients) {
      await db.run('INSERT INTO ingredients (recipeId, name, quantity, unit) VALUES (?, ?, ?, ?)', [recipeId, ing.name, ing.quantity, ing.unit]);
    }
    for (let i = 0; i < r.instructions.length; i++) {
      await db.run('INSERT INTO instructions (recipeId, stepNumber, instructionText) VALUES (?, ?, ?)', [recipeId, i + 1, r.instructions[i]]);
    }
  }
  console.log('Seeding complete.');
}

export async function getDb() {
  if (db) return db;

  const dbPath = path.join(__dirname, '../cookbook.db');
  console.log('Connecting to database at:', dbPath);

  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('Successfully connected to SQLite database.');

    await createTables(db);
    console.log('Database tables verified/created.');

    const count = await db.get('SELECT COUNT(*) as count FROM categories');
    if (count.count === 0) {
      await seedDatabase(db);
    }

    return db;
  } catch (err) {
    console.error('CRITICAL DATABASE ERROR:', err);
    throw err;
  }
}
