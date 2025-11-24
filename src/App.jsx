import { useState } from 'react'
import './App.css'

function App() {
const [song, setSong] = useState('')
  const [artist, setArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [safeData, setSafeData] = useState(null)
  const [rawJSON, setRawJSON] = useState(null)

  const ERROR_JSON = {
    error: true,
    message: "The Sound Facts engine could not analyze the song. Please try again or choose a different song.",
    song: "",
    artist: "",
    core_categories: {},
    expansion_categories: [],
    final_score: null,
    summary: ""
  }

  const validateSoundFactsResponse = (data) => {
    try {
      const coreKeys = [
        "emotional_honesty",
        "storytelling",
        "melodic_complexity",
        "vocal_performance",
        "production_quality",
        "cultural_imprint",
        "replay_value",
        "overall_impact"
      ]

      if (typeof data !== "object" || data === null) return false
      if (!data.song || !data.artist) return false
      if (!data.core_categories) return false
      if (!data.summary) return false
      if (!data.runtime || !data.year || !data.genre) return false

      // Validate core categories
      for (const key of coreKeys) {
        const cat = data.core_categories[key]
        if (!cat) return false
        if (!Number.isInteger(cat.score)) return false
        if (cat.score < 1 || cat.score > 10) return false
        if (typeof cat.comment !== "string") return false
      }

      // Validate expansion categories
      if (!Array.isArray(data.expansion_categories)) return false
      for (const item of data.expansion_categories) {
        if (!item) continue
        if (typeof item.category !== "string") return false
        if (!Number.isInteger(item.score)) return false
        if (item.score < 1 || item.score > 10) return false
        if (typeof item.comment !== "string") return false
      }

      // Validate final score
      if (data.final_score != null) {
        const s = Number(data.final_score)
        if (!Number.isFinite(s) || s < 1 || s > 10) return false
      }

      return true
    } catch {
      return false
    }
  }

  const searchSongInData = (allSongs, searchSong, searchArtist) => {
    if (!allSongs || !Array.isArray(allSongs)) return null

    const songLower = searchSong.toLowerCase().trim()
    const artistLower = searchArtist.toLowerCase().trim()

    // Search for matching song and artist
    const foundSong = allSongs.find(item => {
      const itemSongLower = (item.song || '').toLowerCase().trim()
      const itemArtistLower = (item.artist || '').toLowerCase().trim()
      
      return itemSongLower === songLower && itemArtistLower === artistLower
    })

    return foundSong || null
  }

  const handleSearch = async () => {
    if (!song.trim() || !artist.trim()) {
      alert('Please enter both song and artist name')
      return
    }

    setLoading(true)
    setSafeData(null)
    setRawJSON(null)

    try {
      // POST request to the API with song and artist
      const response = await fetch('https://soundfacts-endpoint.vercel.app/api/soundfacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          song: song.trim(),
          artist: artist.trim()
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch from API')
      }

      const apiResponse = await response.json()
      setRawJSON(apiResponse)

      // Check if response is an error
      if (apiResponse.error) {
        setSafeData(ERROR_JSON)
        setLoading(false)
        return
      }

      // Validate the API response
      if (validateSoundFactsResponse(apiResponse)) {
        setSafeData(apiResponse)
      } else {
        // Validation failed
        setSafeData(ERROR_JSON)
      }
    } catch (err) {
      console.error('Error:', err)
      setSafeData(ERROR_JSON)
      setRawJSON(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getScoreColor = (score) => {
    if (score >= 9) return '#4ade80'
    if (score >= 7) return '#3b82f6'
    if (score >= 5) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="sound-facts-container">
      <div className="sound-facts-wrapper">
        {/* Header */}
        <div className="header">
          <h1>Sound Facts</h1>
          <p>AI-powered song analysis & scoring</p>
        </div>

        {/* Search Form */}
        <div className="search-card">
          <div className="input-group">
            <div className="input-field">
              <label>Song Title</label>
              <input
                type="text"
                value={song}
                onChange={(e) => setSong(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., Blinding Lights"
                disabled={loading}
              />
            </div>
            <div className="input-field">
              <label>Artist Name</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., The Weeknd"
                disabled={loading}
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="search-button"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Error State */}
        {safeData && safeData.error && (
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <div>
              <h3>Analysis Failed</h3>
              <p>{safeData.message}</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#fecaca' }}>
                If you see a network error, the backend needs to enable CORS and handle OPTIONS requests.
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {safeData && !safeData.error && (
          <div className="results-card">
            <div className="song-header">
              <div>
                <h2>{safeData.song}</h2>
                <p className="artist">{safeData.artist}</p>
              </div>
              <div className="final-score" style={{ borderColor: getScoreColor(safeData.final_score) }}>
                <span className="score-number">{safeData.final_score}</span>
                <span className="score-label">/10</span>
              </div>
            </div>

            <div className="song-meta">
              <span>{safeData.year}</span>
              <span>•</span>
              <span>{safeData.genre}</span>
              <span>•</span>
              <span>{safeData.runtime}</span>
            </div>

            <div className="summary-section">
              <p>{safeData.summary}</p>
            </div>

            {/* Core Categories */}
            <div className="categories-section">
              <h3>Core Analysis</h3>
              <div className="categories-grid">
                {Object.entries(safeData.core_categories).map(([key, data]) => (
                  <div key={key} className="category-card">
                    <div className="category-header">
                      <h4>{key.replace(/_/g, ' ')}</h4>
                      <span 
                        className="score-badge"
                        style={{ backgroundColor: getScoreColor(data.score) }}
                      >
                        {data.score}
                      </span>
                    </div>
                    <p>{data.comment}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Expansion Categories */}
            {safeData.expansion_categories && safeData.expansion_categories.length > 0 && (
              <div className="categories-section">
                <h3>Additional Insights</h3>
                <div className="categories-grid">
                  {safeData.expansion_categories.map((item, idx) => (
                    <div key={idx} className="category-card expansion">
                      <div className="category-header">
                        <h4>{item.category.replace(/_/g, ' ')}</h4>
                        <span 
                          className="score-badge"
                          style={{ backgroundColor: getScoreColor(item.score) }}
                        >
                          {item.score}
                        </span>
                      </div>
                      <p>{item.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            {rawJSON && (
              <div className="json-section">
                <h3>Raw JSON Response</h3>
                <pre className="json-box">
                  {JSON.stringify(rawJSON, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!safeData && !loading && (
          <div className="empty-state">
            <p className="emoji">🎵</p>
            <p>Enter a song and artist to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App