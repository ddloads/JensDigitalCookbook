import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import { getDb, seedDatabase } from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve built frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// API routes are defined below. SPA fallback is added after all routes.

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// API Endpoints

// Get all recipes (with optional filtering)
app.get('/api/recipes', async (req, res, next) => {
  try {
    const db = await getDb();
    const categoryId = req.query.categoryId;
    let query = 'SELECT * FROM recipes';
    let params: any[] = [];

    if (categoryId) {
      query += ' WHERE categoryId = ?';
      params.push(categoryId);
    }

    const recipes = await db.all(query, params);
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

// Get a single recipe with ingredients and instructions
app.get('/api/recipes/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const recipeId = req.params.id;

    const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [recipeId]);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const ingredients = await db.all('SELECT * FROM ingredients WHERE recipeId = ?', [recipeId]);
    const instructions = await db.all('SELECT * FROM instructions WHERE recipeId = ? ORDER BY stepNumber ASC', [recipeId]);

    res.json({ ...recipe, ingredients, instructions });
  } catch (err) {
    next(err);
  }
});

// Create a new recipe
app.post('/api/recipes', upload.single('image'), async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, description, categoryId, prepTime, cookTime, servings, ingredients, instructions } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await db.run(
      'INSERT INTO recipes (title, description, categoryId, prepTime, cookTime, servings, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, categoryId, prepTime, cookTime, servings, imageUrl]
    );

    const recipeId = result.lastID;

    const parsedIngredients = typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients;
    for (const ing of parsedIngredients) {
      await db.run(
        'INSERT INTO ingredients (recipeId, name, quantity, unit) VALUES (?, ?, ?, ?)',
        [recipeId, ing.name, ing.quantity, ing.unit]
      );
    }

    const parsedInstructions = typeof instructions === 'string' ? JSON.parse(instructions) : instructions;
    for (const inst of parsedInstructions) {
      await db.run(
        'INSERT INTO instructions (recipeId, stepNumber, instructionText) VALUES (?, ?, ?)',
        [recipeId, inst.stepNumber, inst.instructionText]
      );
    }

    res.status(201).json({ id: recipeId, title, imageUrl });
  } catch (err) {
    next(err);
  }
});

// Update a recipe
app.put('/api/recipes/:id', upload.single('image'), async (req, res, next) => {
  try {
    const db = await getDb();
    const recipeId = req.params.id;
    const { title, description, categoryId, prepTime, cookTime, servings, ingredients, instructions } = req.body;
    
    // Check if recipe exists
    const existing = await db.get('SELECT imageUrl FROM recipes WHERE id = ?', [recipeId]);
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    let imageUrl = existing.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    await db.run(
      'UPDATE recipes SET title = ?, description = ?, categoryId = ?, prepTime = ?, cookTime = ?, servings = ?, imageUrl = ? WHERE id = ?',
      [title, description, categoryId, prepTime, cookTime, servings, imageUrl, recipeId]
    );

    // Refresh ingredients and instructions (simplest to delete and re-insert)
    await db.run('DELETE FROM ingredients WHERE recipeId = ?', [recipeId]);
    await db.run('DELETE FROM instructions WHERE recipeId = ?', [recipeId]);

    const parsedIngredients = typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients;
    for (const ing of parsedIngredients) {
      await db.run(
        'INSERT INTO ingredients (recipeId, name, quantity, unit) VALUES (?, ?, ?, ?)',
        [recipeId, ing.name, ing.quantity, ing.unit]
      );
    }

    const parsedInstructions = typeof instructions === 'string' ? JSON.parse(instructions) : instructions;
    for (const inst of parsedInstructions) {
      await db.run(
        'INSERT INTO instructions (recipeId, stepNumber, instructionText) VALUES (?, ?, ?)',
        [recipeId, inst.stepNumber, inst.instructionText]
      );
    }

    res.json({ id: recipeId, title, imageUrl });
  } catch (err) {
    next(err);
  }
});

// Delete a recipe
app.delete('/api/recipes/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Toggle favorite status
app.patch('/api/recipes/:id/favorite', async (req, res, next) => {
  try {
    const db = await getDb();
    const recipeId = req.params.id;
    const { isFavorite } = req.body;
    
    await db.run('UPDATE recipes SET isFavorite = ? WHERE id = ?', [isFavorite ? 1 : 0, recipeId]);
    res.json({ id: recipeId, isFavorite });
  } catch (err) {
    next(err);
  }
});

// Get all categories
app.get('/api/categories', async (req, res, next) => {
  try {
    const db = await getDb();
    const categories = await db.all('SELECT * FROM categories');
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// Create a new category
app.post('/api/categories', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    
    const result = await db.run('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.lastID, name });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    next(err);
  }
});

// Update a category
app.put('/api/categories/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    
    await db.run('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ id: req.params.id, name });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    next(err);
  }
});

// Delete a category
app.delete('/api/categories/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    await db.run('UPDATE recipes SET categoryId = NULL WHERE categoryId = ?', [req.params.id]);
    await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Seed the database
app.post('/api/seed', async (req, res, next) => {
  try {
    const db = await getDb();
    await seedDatabase(db);
    res.json({ message: 'Database re-seeded successfully' });
  } catch (err) {
    next(err);
  }
});

// SPA fallback — must be after all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
