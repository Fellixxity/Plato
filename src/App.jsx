import { useState, useEffect } from 'react'
import { generateMenu } from './services/geminiService'
import './App.css'

const DAYS = ['月', '火', '水', '木', '金', '土', '日']
const MEAL_TYPES = ['朝食', '昼食', '夕食']

function App() {
  const [inventory, setInventory] = useState(() => localStorage.getItem('inventory') || '')
  const [skippedSlots, setSkippedSlots] = useState(() => {
    const saved = localStorage.getItem('skipped-slots')
    return saved ? JSON.parse(saved) : []
  })
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem('meal-plan')
    return saved ? JSON.parse(saved) : {}
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [apiKey] = useState(() => {
    return localStorage.getItem('gemini-api-key') || import.meta.env.VITE_GEMINI_API_KEY || ''
  })
  const [targetCalories, setTargetCalories] = useState(() => {
    const saved = localStorage.getItem('target-calories')
    return saved ? saved : '2000'
  })
  const [genreFilters, setGenreFilters] = useState(() => {
    const saved = localStorage.getItem('genre-filters')
    return saved ? JSON.parse(saved) : { preferred: [], excluded: [] }
  })
  const [mealStyle, setMealStyle] = useState(() => {
    const saved = localStorage.getItem('meal-style')
    return saved || 'バランス'
  })
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites')
    return saved ? JSON.parse(saved) : []
  })
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)

  useEffect(() => {
    localStorage.setItem('meal-plan', JSON.stringify(meals))
    localStorage.setItem('skipped-slots', JSON.stringify(skippedSlots))
    localStorage.setItem('inventory', inventory)
    localStorage.setItem('gemini-api-key', apiKey)
    localStorage.setItem('target-calories', targetCalories.toString())
    localStorage.setItem('genre-filters', JSON.stringify(genreFilters))
    localStorage.setItem('meal-style', mealStyle)
    localStorage.setItem('favorites', JSON.stringify(favorites))
  }, [meals, skippedSlots, inventory, apiKey, targetCalories, genreFilters, mealStyle, favorites])

  const handleMealChange = (day, type, value) => {
    setMeals(prev => {
      const slotId = `${day}-${type}`
      // If value is a string, convert to object format
      const mealData = typeof value === 'string' ? { name: value } : value
      return {
        ...prev,
        [slotId]: mealData
      }
    })
  }

  const toggleSkip = (slotId) => {
    setSkippedSlots(prev =>
      prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    )
  }

  const handleSelectAll = () => {
    const allSlots = []
    DAYS.forEach(day => {
      MEAL_TYPES.forEach(type => {
        allSlots.push(`${day}-${type}`)
      })
    })
    setSkippedSlots(allSlots)
  }

  const handleDeselectAll = () => {
    setSkippedSlots([])
  }

  // Calculate daily calorie totals
  const getDailyCalories = (day) => {
    let total = 0
    MEAL_TYPES.forEach(type => {
      const slotId = `${day}-${type}`
      const meal = meals[slotId]
      if (meal && !skippedSlots.includes(slotId)) {
        const calories = typeof meal === 'object' ? (meal.calories || 0) : 0
        total += calories
      }
    })
    return total
  }

  const handleGenerate = async () => {
    if (!inventory.trim()) {
      alert('食材を入力してください。')
      return
    }
    if (!apiKey) {
      alert('Gemini APIキーを画面下部の設定から入力してください。')
      return
    }

    setIsGenerating(true)
    try {
      // 有効なスロットのみを抽出
      const schedule = []
      DAYS.forEach(day => {
        MEAL_TYPES.forEach(type => {
          const slotId = `${day}-${type}`
          if (!skippedSlots.includes(slotId)) {
            schedule.push(slotId)
          }
        })
      })

      // APIキーを一時的に反映（実際の開発では環境変数が望ましい）
      // ここでは service 側に渡すか、あるいは service をクロージャにする
      // 今回は簡易的に service 内で localStorage を見るように修正するか、引数で渡す。
      // (ここでは geminiService を使用)
      // (ここでは geminiService を使用)
      const results = await generateMenu(inventory, schedule, apiKey, 'gemini-2.5-flash', genreFilters, mealStyle, parseInt(targetCalories) || 2000)
      setMeals(prev => ({ ...prev, ...results }))
    } catch (error) {
      alert('エラーが発生しました: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateSlot = async (day, type) => {
    if (!inventory.trim()) {
      alert('食材を入力してください。')
      return
    }
    if (!apiKey) {
      alert('Gemini APIキーを画面下部の設定から入力してください。')
      return
    }

    setIsGenerating(true)
    try {
      const slotId = `${day}-${type}`
      const schedule = [slotId]
      const results = await generateMenu(inventory, schedule, apiKey, 'gemini-2.5-flash', genreFilters, mealStyle, parseInt(targetCalories) || 2000)
      setMeals(prev => ({ ...prev, ...results }))
    } catch (error) {
      alert('エラーが発生しました: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleGenreFilter = (genre, type) => {
    setGenreFilters(prev => {
      const newFilters = { ...prev }
      if (type === 'preferred') {
        if (newFilters.preferred.includes(genre)) {
          newFilters.preferred = newFilters.preferred.filter(g => g !== genre)
        } else {
          newFilters.preferred = [...newFilters.preferred, genre]
          newFilters.excluded = newFilters.excluded.filter(g => g !== genre)
        }
      } else {
        if (newFilters.excluded.includes(genre)) {
          newFilters.excluded = newFilters.excluded.filter(g => g !== genre)
        } else {
          newFilters.excluded = [...newFilters.excluded, genre]
          newFilters.preferred = newFilters.preferred.filter(g => g !== genre)
        }
      }
      return newFilters
    })
  }

  const handleShowRecipe = (meal) => {
    if (meal && typeof meal === 'object' && meal.steps) {
      setSelectedRecipe(meal)
      setShowRecipeModal(true)
    }
  }

  const handleCloseRecipe = () => {
    setShowRecipeModal(false)
    setTimeout(() => setSelectedRecipe(null), 300)
  }

  const isFavorite = (recipe) => {
    if (!recipe) return false
    return favorites.some(f => f.name === recipe.name && f.calories === recipe.calories)
  }

  const toggleFavorite = (recipe) => {
    if (isFavorite(recipe)) {
      setFavorites(prev => prev.filter(f => !(f.name === recipe.name && f.calories === recipe.calories)))
    } else {
      setFavorites(prev => [...prev, { ...recipe, id: Date.now(), dateAdded: new Date().toISOString() }])
    }
  }

  const handleRemoveFavorite = (id) => {
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="app-container">
      <header>
        <h1>AI献立プランナー</h1>
        <button
          className="favorites-btn-header"
          onClick={() => setShowFavoritesModal(true)}
        >
          ❤️ お気に入り ({favorites.length})
        </button>
      </header>

      <section className="genre-filter-section card">
        <h2>🍜 ジャンル設定</h2>
        <div className="genre-filters">
          {['和食', '洋食', '中華', 'エスニック'].map(genre => (
            <div key={genre} className="genre-item">
              <span className="genre-name">{genre}</span>
              <div className="genre-buttons">
                <button
                  className={`genre-btn ${genreFilters.preferred.includes(genre) ? 'active-preferred' : ''}`}
                  onClick={() => toggleGenreFilter(genre, 'preferred')}
                >
                  優先
                </button>
                <button
                  className={`genre-btn ${genreFilters.excluded.includes(genre) ? 'active-excluded' : ''}`}
                  onClick={() => toggleGenreFilter(genre, 'excluded')}
                >
                  除外
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="meal-style-section card">
        <h2>🎯 食事スタイル設定</h2>
        <div className="meal-style-options">
          {[
            { name: 'がっつり', icon: '🍖', description: 'ボリューム重視' },
            { name: 'ダイエット', icon: '🥗', description: '低カロリー' },
            { name: '筋トレ', icon: '💪', description: '高タンパク質' },
            { name: 'バランス', icon: '⚖️', description: '栄養バランス' },
            { name: '時短', icon: '⏱️', description: '15分以内' },
            { name: '節約', icon: '💰', description: 'コスパ重視' }
          ].map(style => (
            <div
              key={style.name}
              className={`meal-style-option ${mealStyle === style.name ? 'active' : ''}`}
              onClick={() => setMealStyle(style.name)}
            >
              <div className="style-icon">{style.icon}</div>
              <div className="style-name">{style.name}</div>
              <div className="style-description">{style.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="inventory-card card">
        <div className="inventory-section">
          <h2>冷蔵庫にある食材</h2>
          <textarea
            placeholder="例: 鶏肉、たまねぎ、卵、キャベツ、冷凍ごはん..."
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
          />
          <div className="ingredient-tags">
            <span className="tags-label">よく使う食材:</span>
            <div className="tags-list">
              {[
                '鶏肉', '豚肉', '合い挽き肉', '鮭', 'ツナ缶',
                '玉ねぎ', '人参', 'じゃがいも', 'キャベツ', 'トマト', 'ブロッコリー', 'ピーマン', 'きのこ',
                '卵', '豆腐', '納豆', '牛乳', 'チーズ', 'うどん', 'パスタ', '冷凍ごはん'
              ].map(ing => (
                <button
                  key={ing}
                  className="ingredient-tag"
                  onClick={() => {
                    const current = inventory.trim()
                    const newItem = current ? (current.endsWith('、') ? ing : `、${ing}`) : ing
                    setInventory(current + newItem)
                  }}
                >
                  {ing}
                </button>
              ))}
            </div>
          </div>
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'AIが考え中...' : '献立を自動生成する'}
          </button>
        </div>
      </section>

      <div className="bulk-actions">
        <span>「いらない」チェックを一括操作:</span>
        <div className="bulk-buttons">
          <button onClick={handleSelectAll} className="secondary-btn">すべて選択</button>
          <button onClick={handleDeselectAll} className="secondary-btn">すべて解除</button>
        </div>
      </div>

      <main className="calendar-grid">
        {DAYS.map((day) => (
          <div key={day} className="day-card card">
            <h2>{day}曜日</h2>
            <div className="meals-list">
              {MEAL_TYPES.map((type) => {
                const slotId = `${day}-${type}`
                const isSkipped = skippedSlots.includes(slotId)
                return (
                  <div key={type} className={`meal-slot ${isSkipped ? 'skipped' : ''}`}>
                    <div className="slot-header">
                      <span>{type}</span>
                      <label className="skip-label">
                        <input
                          type="checkbox"
                          checked={isSkipped}
                          onChange={() => toggleSkip(slotId)}
                        />
                        <span>いらない</span>
                      </label>
                    </div>
                    <textarea
                      className="meal-content-display"
                      placeholder={isSkipped ? '除外されています' : `${type}のメニュー...`}
                      value={typeof meals[slotId] === 'object' ? meals[slotId]?.name || '' : meals[slotId] || ''}
                      readOnly
                      disabled={isSkipped}
                    />
                    <div className="slot-actions">
                      {meals[slotId] && typeof meals[slotId] === 'object' && meals[slotId].calories && (
                        <div className="calorie-badge">{meals[slotId].calories} kcal</div>
                      )}
                      <div className="action-buttons">
                        {meals[slotId] && typeof meals[slotId] === 'object' && meals[slotId].steps && (
                          <button
                            className="recipe-detail-btn"
                            onClick={() => handleShowRecipe(meals[slotId])}
                            title="レシピを見る"
                          >
                            📖
                          </button>
                        )}
                        {!isSkipped && (
                          <button
                            className="regenerate-btn"
                            onClick={() => handleRegenerateSlot(day, type)}
                            disabled={isGenerating}
                            title="このスロットだけ再生成"
                          >
                            🔄
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {(() => {
              const dailyTotal = getDailyCalories(day)
              if (dailyTotal > 0) {
                const diff = targetCalories - dailyTotal
                const statusClass = diff >= 0 ? 'calorie-ok' : 'calorie-over'
                return (
                  <div className={`daily-calorie-summary ${statusClass}`}>
                    <span className="daily-total">📊 {dailyTotal} kcal</span>
                    <span className="daily-diff">
                      {diff >= 0 ? `残り ${diff} kcal` : `${Math.abs(diff)} kcal 超過`}
                    </span>
                  </div>
                )
              }
              return null
            })()}
          </div>
        ))}
      </main>

      <section className="settings-section card">
        <h2>設定</h2>
        <div className="setting-item">
          <label>目標カロリー (1日あたり): </label>
          <input
            type="number"
            value={targetCalories}
            onChange={(e) => setTargetCalories(e.target.value)}
            min="500"
            max="5000"
            step="100"
          />
          <span className="unit-label">kcal</span>
        </div>
      </section>

      {showRecipeModal && selectedRecipe && (
        <div className="modal-overlay" onClick={handleCloseRecipe}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseRecipe}>×</button>
            <div className="modal-header-actions">
              <h2 className="recipe-title">{selectedRecipe.name}</h2>
              <button
                className={`favorite-toggle-btn ${isFavorite(selectedRecipe) ? 'active' : ''}`}
                onClick={() => toggleFavorite(selectedRecipe)}
                title={isFavorite(selectedRecipe) ? 'お気に入りから削除' : 'お気に入りに追加'}
              >
                {isFavorite(selectedRecipe) ? '❤️ 保存済み' : '🤍 保存する'}
              </button>
            </div>

            <div className="recipe-meta">
              <span className="meta-item">🔥 {selectedRecipe.calories} kcal</span>
              {selectedRecipe.cookingTime && (
                <span className="meta-item">⏱️ {selectedRecipe.cookingTime}分</span>
              )}
            </div>

            <div className="recipe-section">
              <h3>🧂 材料</h3>
              <ul className="ingredients-list">
                {selectedRecipe.ingredients?.map((ing, idx) => (
                  <li key={idx}>
                    {ing.name}: {ing.amount}{ing.unit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="recipe-section">
              <h3>👨‍🍳 作り方</h3>
              <ol className="steps-list">
                {selectedRecipe.steps?.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
      {showFavoritesModal && (
        <div className="modal-overlay" onClick={() => setShowFavoritesModal(false)}>
          <div className="modal-content favorites-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowFavoritesModal(false)}>×</button>
            <h2>❤️ お気に入りレシピ ({favorites.length})</h2>

            {favorites.length === 0 ? (
              <p className="no-favorites">まだお気に入りがありません。レシピ詳細画面から保存できます。</p>
            ) : (
              <div className="favorites-list">
                {favorites.map(fav => (
                  <div key={fav.id} className="favorite-item">
                    <div className="favorite-info" onClick={() => {
                      setSelectedRecipe(fav)
                      setShowRecipeModal(true)
                    }}>
                      <h3>{fav.name}</h3>
                      <span>{fav.calories} kcal / {fav.cookingTime}分</span>
                    </div>
                    <button
                      className="remove-favorite-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFavorite(fav.id)
                      }}
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
