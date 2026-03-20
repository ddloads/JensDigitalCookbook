import { useState, useEffect } from 'react'
import { Plus, Search, Filter, BookOpen, Clock, Users, Trash2, ChevronRight, Edit2, X, Check, Settings as SettingsIcon, Star } from 'lucide-react'
import './App.css'
import type { Category, Recipe } from './types'

const PRESET_THEMES = {
  classic: { primary: '#f97316', background: '#fffaf5', card: '#ffffff', text: '#1f2937', muted: '#6b7280', border: '#e5e7eb' },
  sage: { primary: '#10b981', background: '#f0fdf4', card: '#ffffff', text: '#1f2937', muted: '#6b7280', border: '#e5e7eb' },
  midnight: { primary: '#818cf8', background: '#0f172a', card: '#1e293b', text: '#f8fafc', muted: '#94a3b8', border: '#334155' },
  berry: { primary: '#ec4899', background: '#fff1f2', card: '#ffffff', text: '#1f2937', muted: '#6b7280', border: '#e5e7eb' },
}

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null)
  
  const [showSettings, setShowSettings] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('cookbook-theme') || 'classic')
  const [customColors, setCustomColors] = useState({
    primary: localStorage.getItem('custom-primary') || '#f97316',
    background: localStorage.getItem('custom-background') || '#fffaf5'
  })

  const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'

  useEffect(() => {
    fetchCategories()
    fetchRecipes()
    applyTheme()
  }, [selectedCategory])

  useEffect(() => {
    applyTheme()
  }, [currentTheme, customColors])

  const applyTheme = () => {
    const root = document.documentElement;
    if (currentTheme === 'custom') {
      root.style.setProperty('--primary', customColors.primary);
      root.style.setProperty('--background', customColors.background);
      
      const isDark = customColors.background.startsWith('#0') || customColors.background.startsWith('#1') || customColors.background.startsWith('#2');
      root.style.setProperty('--card-bg', isDark ? '#1e293b' : '#ffffff');
      root.style.setProperty('--text-main', isDark ? '#f8fafc' : '#1f2937');
      root.style.setProperty('--text-muted', isDark ? '#94a3b8' : '#6b7280');
      root.style.setProperty('--border', isDark ? '#334155' : '#e5e7eb');
    } else {
      const theme = PRESET_THEMES[currentTheme as keyof typeof PRESET_THEMES] || PRESET_THEMES.classic;
      root.style.setProperty('--primary', theme.primary);
      root.style.setProperty('--background', theme.background);
      root.style.setProperty('--card-bg', theme.card);
      root.style.setProperty('--text-main', theme.text);
      root.style.setProperty('--text-muted', theme.muted);
      root.style.setProperty('--border', theme.border);
    }
    localStorage.setItem('cookbook-theme', currentTheme);
  };

  const handleSeedData = async () => {
    if (confirm('This will delete ALL current recipes and categories and restore the defaults. Are you sure?')) {
      try {
        const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to seed database');
        fetchCategories();
        fetchRecipes();
        alert('Database reset to defaults!');
        setShowSettings(false);
      } catch (err) {
        alert('Error seeding database.');
      }
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingCategoryName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategoryName })
      });
      if (!res.ok) throw new Error('Failed to update category');
      setEditingCategoryId(null);
      fetchCategories();
    } catch (err) {
      alert('Error updating category.');
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this category? Recipes in this category will be moved to "Uncategorized".')) {
      try {
        const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete category');
        if (selectedCategory === id) setSelectedCategory(null);
        fetchCategories();
        fetchRecipes();
      } catch (err) {
        alert('Error deleting category.');
      }
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    try {
      const newStatus = !recipe.isFavorite;
      const res = await fetch(`${API_BASE}/recipes/${recipe.id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newStatus })
      });
      if (!res.ok) throw new Error('Failed to toggle favorite');
      fetchRecipes();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      const data = await res.json()
      setCategories(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      });
      if (!res.ok) throw new Error('Failed to add category');
      setNewCategoryName('');
      setShowAddCategory(false);
      fetchCategories();
    } catch (err) {
      alert('Error adding category. It might already exist.');
    }
  };

  const formatQuantity = (qty: string) => {
    const num = parseFloat(qty);
    if (isNaN(num)) return qty;
    
    const count = Math.floor(num);
    const fraction = num - count;
    
    if (fraction === 0) return count.toString();
    
    let fracStr = '';
    if (Math.abs(fraction - 0.25) < 0.01) fracStr = '¼';
    else if (Math.abs(fraction - 0.5) < 0.01) fracStr = '½';
    else if (Math.abs(fraction - 0.75) < 0.01) fracStr = '¾';
    else if (Math.abs(fraction - 0.33) < 0.02) fracStr = '⅓';
    else if (Math.abs(fraction - 0.66) < 0.02) fracStr = '⅔';
    else return num.toString();
    
    return count > 0 ? `${count} ${fracStr}` : fracStr;
  };

  const fetchRecipes = async () => {
    try {
      let url = `${API_BASE}/recipes`
      if (selectedCategory) url += `?categoryId=${selectedCategory}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch recipes')
      const data = await res.json()
      setRecipes(data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchRecipeDetails = async (id: number, isEdit = false) => {
    try {
      const res = await fetch(`${API_BASE}/recipes/${id}`)
      if (!res.ok) throw new Error('Failed to fetch recipe details')
      const data = await res.json()
      if (isEdit) {
        setRecipeToEdit(data)
        setShowAddModal(true)
      } else {
        setSelectedRecipe(data)
        setShowDetailModal(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const deleteRecipe = async (id: number) => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      await fetch(`${API_BASE}/recipes/${id}`, { method: 'DELETE' })
      fetchRecipes()
    }
  }

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !showFavorites || r.isFavorite;
    return matchesSearch && matchesFavorite;
  });

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <BookOpen size={32} className="primary-color" />
          <h1 className="gradient-text">CookBook</h1>
        </div>
        
        <nav className="categories-nav">
          <button 
            className={selectedCategory === null && !showFavorites ? 'active' : ''}
            onClick={() => { setSelectedCategory(null); setShowFavorites(false); }}
          >
            All Recipes
          </button>
          <button 
            className={showFavorites ? 'active' : ''}
            onClick={() => { setShowFavorites(true); setSelectedCategory(null); }}
          >
            <Star size={16} fill={showFavorites ? "currentColor" : "none"} /> Favorites
          </button>
          <div className="nav-divider"></div>
          {categories.map(cat => (
            <div key={cat.id} className="category-item">
              {editingCategoryId === cat.id ? (
                <div className="category-edit-form">
                  <input 
                    autoFocus
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                  />
                  <div className="edit-actions">
                    <button onClick={() => handleUpdateCategory(cat.id)}><Check size={14} /></button>
                    <button onClick={() => setEditingCategoryId(null)}><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    className={selectedCategory === cat.id ? 'active flex-1' : 'flex-1'}
                    onClick={() => { setSelectedCategory(cat.id); setShowFavorites(false); }}
                  >
                    {cat.name}
                  </button>
                  <div className="category-controls">
                    <button className="control-btn" onClick={() => {
                      setEditingCategoryId(cat.id);
                      setEditingCategoryName(cat.name);
                    }}><Edit2 size={12} /></button>
                    <button className="control-btn delete" onClick={(e) => handleDeleteCategory(e, cat.id)}><X size={12} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          <div className="add-category-section">
            {!showAddCategory ? (
              <button className="text-btn add-cat-btn" onClick={() => setShowAddCategory(true)}>
                <Plus size={16} /> New Category
              </button>
            ) : (
              <form onSubmit={handleAddCategory} className="add-category-form">
                <input 
                  autoFocus
                  placeholder="Category Name" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <div className="form-actions">
                  <button type="button" onClick={() => setShowAddCategory(false)}>Cancel</button>
                  <button type="submit" className="primary-text">Add</button>
                </div>
              </form>
            )}
          </div>
        </nav>
        <div className="sidebar-footer">
          <button className="text-btn settings-btn" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={18} /> Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search your recipes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={20} />
            Add Recipe
          </button>
        </header>

        <section className="recipe-grid">
          {filteredRecipes.map(recipe => (
            <div key={recipe.id} className="recipe-card" onClick={() => fetchRecipeDetails(recipe.id)}>
              <div className="recipe-image">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.title} />
                ) : (
                  <div className="placeholder-image">
                    <BookOpen size={48} />
                  </div>
                )}
                <div className="card-actions">
                  <button className="delete-overlay" onClick={(e) => {
                    e.stopPropagation()
                    deleteRecipe(recipe.id)
                  }}>
                    <Trash2 size={18} />
                  </button>
                  <button className="edit-overlay" onClick={(e) => {
                    e.stopPropagation()
                    fetchRecipeDetails(recipe.id, true)
                  }}>
                    <Edit2 size={18} />
                  </button>
                  <button className={`fav-overlay ${recipe.isFavorite ? 'active' : ''}`} onClick={(e) => toggleFavorite(e, recipe)}>
                    <Star size={18} fill={recipe.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
              <div className="recipe-info">
                <h3>{recipe.title}</h3>
                <p>{recipe.description}</p>
                <div className="recipe-meta">
                  <span><Clock size={16} /> {recipe.prepTime}</span>
                  <span><Users size={16} /> {recipe.servings}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredRecipes.length === 0 && (
            <div className="empty-state">
              <p>No recipes found. Start adding some!</p>
            </div>
          )}
        </section>
      </main>

      {/* Add/Edit Recipe Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setRecipeToEdit(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{recipeToEdit ? 'Edit Recipe' : 'Add New Recipe'}</h2>
              <button className="close-x" onClick={() => { setShowAddModal(false); setRecipeToEdit(null); }}>&times;</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);

              const ings = Array.from(document.querySelectorAll('.ing-row')).map(row => ({
                name: (row.querySelector('.ing-name') as HTMLInputElement).value,
                quantity: (row.querySelector('.ing-qty') as HTMLInputElement).value,
                unit: (row.querySelector('.ing-unit') as HTMLInputElement).value,
              })).filter(i => i.name);

              const insts = Array.from(document.querySelectorAll('.inst-row')).map((row, idx) => ({
                stepNumber: idx + 1,
                instructionText: (row as HTMLTextAreaElement).value,
              })).filter(i => i.instructionText);

              formData.append('ingredients', JSON.stringify(ings));
              formData.append('instructions', JSON.stringify(insts));

              const url = recipeToEdit ? `${API_BASE}/recipes/${recipeToEdit.id}` : `${API_BASE}/recipes`;
              const method = recipeToEdit ? 'PUT' : 'POST';

              await fetch(url, {
                method: method,
                body: formData
              });

              setShowAddModal(false);
              setRecipeToEdit(null);
              fetchRecipes();
            }}>
              <div className="form-group">
                <label>Title</label>
                <input name="title" required defaultValue={recipeToEdit?.title} placeholder="e.g. Classic Pancakes" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select name="categoryId" required defaultValue={recipeToEdit?.categoryId}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Servings</label>
                  <input type="number" name="servings" defaultValue={recipeToEdit?.servings || "4"} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prep Time</label>
                  <input name="prepTime" defaultValue={recipeToEdit?.prepTime} placeholder="15 mins" />
                </div>
                <div className="form-group">
                  <label>Cook Time</label>
                  <input name="cookTime" defaultValue={recipeToEdit?.cookTime} placeholder="20 mins" />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea name="description" rows={2} defaultValue={recipeToEdit?.description} placeholder="Briefly describe the dish..."></textarea>
              </div>

              <div className="form-group">
                <label>Recipe Photo {recipeToEdit?.imageUrl && '(Leave empty to keep current)'}</label>
                <input type="file" name="image" accept="image/*" />
              </div>

              <div className="form-group">
                <label>Ingredients</label>
                <div id="ingredients-list">
                  {recipeToEdit?.ingredients && recipeToEdit.ingredients.length > 0 ? (
                    recipeToEdit.ingredients.map((ing, idx) => (
                      <div key={idx} className="ing-row">
                        <input className="ing-qty" defaultValue={ing.quantity} placeholder="Qty" style={{width: '60px'}} />
                        <input className="ing-unit" defaultValue={ing.unit} placeholder="Unit" style={{width: '80px'}} />
                        <input className="ing-name" defaultValue={ing.name} placeholder="Ingredient name" style={{flex: 1}} />
                      </div>
                    ))
                  ) : (
                    <div className="ing-row">
                      <input className="ing-qty" placeholder="Qty" style={{width: '60px'}} />
                      <input className="ing-unit" placeholder="Unit" style={{width: '80px'}} />
                      <input className="ing-name" placeholder="Ingredient name" style={{flex: 1}} />
                    </div>
                  )}
                </div>
                <button type="button" className="text-btn" onClick={() => {
                  const div = document.createElement('div');
                  div.className = 'ing-row';
                  div.innerHTML = `
                    <input class="ing-qty" placeholder="Qty" style="width: 60px" />
                    <input class="ing-unit" placeholder="Unit" style="width: 80px" />
                    <input class="ing-name" placeholder="Ingredient name" style="flex: 1" />
                  `;
                  document.getElementById('ingredients-list')?.appendChild(div);
                }}>+ Add Ingredient</button>
              </div>

              <div className="form-group">
                <label>Instructions</label>
                <div id="instructions-list">
                  {recipeToEdit?.instructions && recipeToEdit.instructions.length > 0 ? (
                    recipeToEdit.instructions.map((inst, idx) => (
                      <textarea key={idx} className="inst-row" rows={2} defaultValue={inst.instructionText} placeholder={`Step ${idx + 1}...`}></textarea>
                    ))
                  ) : (
                    <textarea className="inst-row" rows={2} placeholder="Step 1..."></textarea>
                  )}
                </div>
                <button type="button" className="text-btn" onClick={() => {
                  const area = document.createElement('textarea');
                  area.className = 'inst-row';
                  area.rows = 2;
                  area.placeholder = `Step ${document.querySelectorAll('.inst-row').length + 1}...`;
                  document.getElementById('instructions-list')?.appendChild(area);
                }}>+ Add Step</button>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => { setShowAddModal(false); setRecipeToEdit(null); }}>Cancel</button>
                <button type="submit" className="primary-btn">{recipeToEdit ? 'Save Changes' : 'Save Recipe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {showDetailModal && selectedRecipe && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content recipe-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRecipe.title}</h2>
              <button className="close-x" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>
            
            <div className="recipe-detail-body">
              {selectedRecipe.imageUrl && (
                <div className="detail-image">
                  <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} />
                </div>
              )}
              
              <p className="detail-description">{selectedRecipe.description}</p>
              
              <div className="detail-meta">
                <div className="meta-item">
                  <Clock size={18} />
                  <span>Prep: {selectedRecipe.prepTime}</span>
                </div>
                <div className="meta-item">
                  <Clock size={18} />
                  <span>Cook: {selectedRecipe.cookTime}</span>
                </div>
                <div className="meta-item">
                  <Users size={18} />
                  <span>Servings: {selectedRecipe.servings}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Ingredients</h3>
                <ul className="ingredients-list">
                  {selectedRecipe.ingredients?.map((ing, idx) => (
                    <li key={idx}>
                      <strong>{formatQuantity(ing.quantity)} {ing.unit}</strong> {ing.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h3>Instructions</h3>
                <ol className="instructions-list">
                  {selectedRecipe.instructions?.map((inst, idx) => (
                    <li key={idx}>
                      <span className="step-number">{inst.stepNumber}</span>
                      <p>{inst.instructionText}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>App Settings</h2>
              <button className="close-x" onClick={() => setShowSettings(false)}>&times;</button>
            </div>

            <section className="settings-section">
              <h3>Theme Selection</h3>
              <div className="theme-grid">
                {Object.keys(PRESET_THEMES).map(themeKey => (
                  <button 
                    key={themeKey} 
                    className={`theme-swatch ${currentTheme === themeKey ? 'active' : ''}`}
                    onClick={() => setCurrentTheme(themeKey)}
                  >
                    <div className="swatch-color" style={{ 
                      backgroundColor: PRESET_THEMES[themeKey as keyof typeof PRESET_THEMES].primary,
                      borderBottom: `8px solid ${PRESET_THEMES[themeKey as keyof typeof PRESET_THEMES].background}`
                    }}></div>
                    <span>{themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}</span>
                  </button>
                ))}
                <button 
                  className={`theme-swatch ${currentTheme === 'custom' ? 'active' : ''}`}
                  onClick={() => setCurrentTheme('custom')}
                >
                  <div className="swatch-color" style={{ 
                    backgroundColor: customColors.primary,
                    borderBottom: `8px solid ${customColors.background}`
                  }}></div>
                  <span>Custom</span>
                </button>
              </div>

              {currentTheme === 'custom' && (
                <div className="custom-theme-controls">
                  <div className="form-group">
                    <label>Primary Color</label>
                    <div className="color-input-wrapper">
                      <input 
                        type="color" 
                        value={customColors.primary} 
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, primary: e.target.value }))
                          localStorage.setItem('custom-primary', e.target.value)
                        }} 
                      />
                      <span>{customColors.primary}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Background Color</label>
                    <div className="color-input-wrapper">
                      <input 
                        type="color" 
                        value={customColors.background} 
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, background: e.target.value }))
                          localStorage.setItem('custom-background', e.target.value)
                        }} 
                      />
                      <span>{customColors.background}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="settings-section" style={{marginTop: '2rem'}}>
              <h3>Database Management</h3>
              <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
                Reset your cookbook to the default seed recipes and categories.
              </p>
              <button className="danger-btn" onClick={handleSeedData}>
                Reset to Default Recipes
              </button>
            </section>

            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
