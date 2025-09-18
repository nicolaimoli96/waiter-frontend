import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function MoneyRain({ isActive }) {
  const [shouldStop, setShouldStop] = useState(false);
  
  useEffect(() => {
    if (isActive && !shouldStop) {
      const timer = setTimeout(() => {
        setShouldStop(true);
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isActive, shouldStop]);
  
  useEffect(() => {
    if (!isActive) {
      setShouldStop(false);
    }
  }, [isActive]);
  
  if (!isActive || shouldStop) return null;
  
  return (
    <div className="money-rain">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="dollar-bill"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        >
          💵
        </div>
      ))}
    </div>
  );
}

function ActivityRings({ items, onRingClick }) {
  const size = 320;
  const center = size / 2;
  const ringSpecs = [
    { stroke: 20, inset: 0 },
    { stroke: 20, inset: 30 },
    { stroke: 20, inset: 60 },
  ];

  return (
    <svg width={size} height={size} className="activity-rings">
      <defs>
        {items.map((it, idx) => (
          <linearGradient key={idx} id={`ringGrad${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={it.color[0]} />
            <stop offset="100%" stopColor={it.color[1]} />
          </linearGradient>
        ))}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background rings */}
      {items.map((it, idx) => {
        const spec = ringSpecs[idx];
        const radius = (size - spec.stroke) / 2 - spec.inset;
        return (
          <circle
            key={`bg-${idx}`}
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={spec.stroke}
            fill="none"
          />
        );
      })}
      
      {/* Progress rings */}
      {items.map((it, idx) => {
        const spec = ringSpecs[idx];
        const radius = (size - spec.stroke) / 2 - spec.inset;
        const circumference = 2 * Math.PI * radius;
        const safeTarget = Math.max(it.target, 1);
        const pct = Math.min(it.actual / safeTarget, 1);
        const offset = pct >= 1 ? 0 : circumference * (1 - pct);
        
        return (
          <g key={idx} className="activity-ring">
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke={`url(#ringGrad${idx})`}
              strokeWidth={spec.stroke}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              filter="url(#glow)"
              style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }}
              onClick={(e) => onRingClick && onRingClick(idx, it, e)}
              onTouchEnd={(e) => onRingClick && onRingClick(idx, it, e)}
            />
          </g>
        );
      })}
      
      
      {/* Clean center - no content */}
      <g className="activity-center-text">
        <circle cx={center} cy={center} r={50} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </g>
    </svg>
  );
}

const ringColors = [
  { color: ['#00f5ff', '#0099ff'] }, // electric cyan
  { color: ['#ff0080', '#ff4081'] }, // hot pink
  { color: ['#00ff88', '#00e676'] }, // neon green
];

function App() {
  const [day, setDay] = useState('Mon');
  const [session, setSession] = useState('Lunch');
  const [weather, setWeather] = useState('Rain');
  const [waiter, setWaiter] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [actuals, setActuals] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [waiters, setWaiters] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRing, setSelectedRing] = useState(null);

  // Determine base URL: local dev vs. production
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction 
    ? 'https://waiter-backend-futa.onrender.com'  // Your Render backend
    : 'http://localhost:5000';  // Local for dev

  // Fetch waiter names from backend on mount
  useEffect(() => {
    const fetchWaiters = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/waiters`);
        setWaiters(response.data.waiters);
        if (response.data.waiters.length > 0) {
          setWaiter(response.data.waiters[0]); // Default to first waiter
        }
      } catch (err) {
        console.error('Error fetching waiters:', err);
      }
    };
    fetchWaiters();
  }, [baseUrl]);

  // Check if all rings are at 100%
  const allTargetsReached = recommendations.length > 0 && 
    recommendations.slice(0, 3).every((rec, idx) => {
      const actual = actuals[idx] !== undefined ? Number(actuals[idx]) : Math.round(rec.predicted_quantity);
      return actual >= rec.target_quantity;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setRecommendations([]);
    setActuals({});
    try {
      const response = await axios.post(`${baseUrl}/api/recommend-categories`, {
        day,
        session,
        weather,
        waiter,
      });
      setRecommendations(response.data.recommendations);
      setSidebarOpen(false); // Close sidebar after successful submission
    } catch (err) {
      setError('Error fetching recommendations: ' + err.message);
      alert(error);
    }
  };

  const handleActualChange = (idx, value) => {
    setActuals((prev) => ({ ...prev, [idx]: value }));
  };

  return (
    <div className="App">
      <MoneyRain isActive={allTargetsReached} />
      <header className="App-header">
        <div className="card">
          {recommendations.length > 0 && (
            <div className="activity-rings-container">
              {(() => {
                const items = recommendations.slice(0, 3).map((rec, idx) => {
                  const predictedInt = Math.round(rec.predicted_quantity);
                  const actual = actuals[idx] !== undefined ? Number(actuals[idx]) : predictedInt;
                  const { color } = ringColors[idx % ringColors.length];
                  return {
                    category: rec.category,
                    target: rec.target_quantity,
                    predicted: predictedInt,
                    actual,
                    color,
                    idx,
                  };
                });
                return (
                  <>
                    <div 
                      className="rings-layout"
                      onClick={() => setSelectedRing(null)}
                      onTouchEnd={() => setSelectedRing(null)}
                    >
                      <ActivityRings 
                        items={items} 
                        onRingClick={(idx, item, event) => {
                          event.stopPropagation();
                          setSelectedRing(idx);
                        }}
                      />
                      <div className="right-panel">
                        {selectedRing !== null ? (
                          <div className="selected-ring-info">
                            <div className="selected-header">
                              <div 
                                className="selected-dot" 
                                style={{ background: `linear-gradient(135deg, ${items[selectedRing].color[0]}, ${items[selectedRing].color[1]})` }} 
                              />
                              <span className="selected-category">{items[selectedRing].category}</span>
                            </div>
                            <div className="target-display">
                              <span className="target-label">Actual</span>
                              <span 
                                className="target-number"
                                style={{ 
                                  color: items[selectedRing].color[0],
                                  textShadow: `0 0 20px ${items[selectedRing].color[0]}`,
                                  filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
                                }}
                              >
                                {items[selectedRing].actual}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="targets-table">
                            <div className="table-header">
                              <span className="header-text">TARGETS</span>
                            </div>
                            {items.map((it, i) => (
                              <div key={i} className="target-row">
                                <div 
                                  className="target-dot" 
                                  style={{ background: `linear-gradient(135deg, ${it.color[0]}, ${it.color[1]})` }} 
                                />
                                <span className="target-category">{it.category}</span>
                                <span 
                                  className="target-value"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${it.color[0]}, ${it.color[1]})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                    textShadow: 'none'
                                  }}
                                >
                                  {it.target}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="actuals-inline">
                      {items.map((it, i) => (
                        <div key={i} className="actuals-chip">
                          <span className="chip-dot" style={{ background: `linear-gradient(135deg, ${it.color[0]}, ${it.color[1]})` }} />
                          <span className="chip-label">{it.category}</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="actual-input chip-input"
                            value={actuals[it.idx] ?? it.predicted}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d+$/.test(val)) {
                                handleActualChange(it.idx, val === '' ? '' : parseInt(val, 10));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="details-section">
                      <button 
                        className="details-button"
                        onClick={() => setDetailsOpen(!detailsOpen)}
                      >
                        <span className="details-icon">{detailsOpen ? '▼' : '▶'}</span>
                        <span className="details-text">Details</span>
                      </button>
                      {detailsOpen && (
                        <div className="rings-stats">
                          {items.map((it, i) => (
                            <div key={i} className="rings-row">
                              <div className="rings-row-left">
                                <span className="row-category">{it.category}</span>
                              </div>
                              <div className="rings-row-right">
                                <div className="row-stat">
                                  <span className="stat-label">Predicted</span>
                                  <span className="stat-value">{it.predicted}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
        
        {/* Sidebar Toggle Button */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className="sidebar-toggle-icon">{sidebarOpen ? '✕' : '⚙️'}</span>
          <span className="sidebar-toggle-text">Your Goals</span>
        </button>

        {/* Sidebar */}
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            <form onSubmit={handleSubmit}>
              <h1>Settings</h1>
              <div className="form-group">
                <label>Day:</label>
                <select value={day} onChange={(e) => setDay(e.target.value)}>
                  <option value="Mon">Mon</option>
                  <option value="Tue">Tue</option>
                  <option value="Wed">Wed</option>
                  <option value="Thu">Thu</option>
                  <option value="Fri">Fri</option>
                  <option value="Sat">Sat</option>
                  <option value="Sun">Sun</option>
                </select>
              </div>
              <div className="form-group">
                <label>Session:</label>
                <select value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>
              <div className="form-group">
                <label>Weather:</label>
                <select value={weather} onChange={(e) => setWeather(e.target.value)}>
                  <option value="Rain">Rain</option>
                  <option value="Wind">Wind</option>
                  <option value="Cloud">Cloud</option>
                  <option value="Sunny">Sunny</option>
                </select>
              </div>
              <div className="form-group">
                <label>Waiter:</label>
                <select value={waiter} onChange={(e) => setWaiter(e.target.value)}>
                  {waiters.map((w, idx) => (
                    <option key={idx} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <button type="submit">Get Recommendations</button>
              {error && <p className="error">{error}</p>}
            </form>
          </div>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}
      </header>
    </div>
  );
}

export default App;