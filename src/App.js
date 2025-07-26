import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function MoneyRain({ isActive }) {
  const [shouldStop, setShouldStop] = useState(false);
  
  React.useEffect(() => {
    if (isActive && !shouldStop) {
      const timer = setTimeout(() => {
        setShouldStop(true);
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isActive, shouldStop]);
  
  React.useEffect(() => {
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

function ProgressCircle({ actual, target, predicted, color, secondaryColor, size = 150, gradId = 'main', gradId2 = 'secondary' }) {
  // Clamp values
  const safeTarget = Math.max(target, 1);
  const actualPct = Math.min(actual / safeTarget, 1);
  // const predictedPct = Math.min(predicted / safeTarget, 1);
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  // If 100%, offset is 0 (fully closed ring)
  const actualOffset = actualPct >= 1 ? 0 : circ * (1 - actualPct);

  return (
    <svg width={size} height={size} className="progress-circle">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color[0]} />
          <stop offset="100%" stopColor={color[1]} />
        </linearGradient>
      </defs>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#23272f"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Actual ring (main, on top) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={actualOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.35s' }}
      />
      {/* Center text or tick */}
      {actualPct >= 1 ? (
        <g>
          <path
            d="M50 75 L70 95 L100 55"
            fill="none"
            stroke="#4cd964"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy="-0.2em"
            fontSize="1.35rem"
            fill="#fff"
            fontWeight="bold"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
          >
            {target}
          </text>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy="1.3em"
            fontSize="0.85rem"
            fill="#b3b3b3"
            fontWeight="500"
          >
            Target
          </text>
        </>
      )}
    </svg>
  );
}

const ringColors = [
  {
    color: ['#00f2fe', '#4facfe'], // cyan to blue
    secondary: ['#43e97b', '#38f9d7'], // green to teal
  },
  {
    color: ['#fa709a', '#fee140'], // pink to yellow
    secondary: ['#7f53ac', '#647dee'], // purple to blue
  },
  {
    color: ['#f7971e', '#ffd200'], // orange to yellow
    secondary: ['#21d4fd', '#b721ff'], // blue to purple
  },
];

function App() {
  const [day, setDay] = useState('Mon');
  const [session, setSession] = useState('Lunch');
  const [weather, setWeather] = useState('Rain');
  const [waiter, setWaiter] = useState('Jim');
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [actuals, setActuals] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      const response = await axios.post('https://waiter-backend-futa.onrender.com', {
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
            <div className="recommendations-rings">
              {recommendations.slice(0, 3).map((rec, idx) => {
                const predictedInt = Math.round(rec.predicted_quantity);
                const actual = actuals[idx] !== undefined ? Number(actuals[idx]) : predictedInt;
                const { color, secondary } = ringColors[idx % ringColors.length];
                return (
                  <div className="recommendation-section" key={idx}>
                    <div className="ring-labels">
                      <span className="category-label">{rec.category}</span>
                    </div>
                    <ProgressCircle
                      actual={actual}
                      target={rec.target_quantity}
                      predicted={predictedInt}
                      color={color}
                      secondaryColor={secondary}
                      gradId={`main${idx}`}
                      gradId2={`secondary${idx}`}
                    />
                    <div className="quantities">
                      <div className="target-below">
                        <span className="target-label">Target:</span> <span className="target-value">{rec.target_quantity}</span>
                      </div>
                      <div className="quantity-row">
                        <span className="label">Actual</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="actual-input"
                          value={actuals[idx] ?? predictedInt}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              handleActualChange(idx, val === '' ? '' : parseInt(val, 10));
                            }
                          }}
                        />
                      </div>
                      <div className="quantity-row">
                        <span className="label">Predicted</span>
                        <span className="value">{predictedInt}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Sidebar Toggle Button */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '✕' : '⚙️'}
        </button>

        {/* Sidebar */}
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            <form onSubmit={handleSubmit}>
              <h1>Waiter Recommendation App</h1>
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
                  <option value="Jim">Jim</option>
                  <option value="Dwight">Dwight</option>
                  <option value="Toby">Toby</option>
                  <option value="Mike">Mike</option>
                  <option value="Phillies">Phillies</option>
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