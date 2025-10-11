import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './routes/Home';
import Game from './routes/Game';
import './App.css';

// Lazy load the editors for better performance
const RulesetEditor = lazy(() => import('./routes/RulesetEditor'));
const ConfigEditor = lazy(() => import('./routes/ConfigEditor'));

/**
 * Main App component with React Router setup
 * 
 * Provides three main routes:
 * - / : Landing page with prompt form and game setup
 * - /game : Game interface with live gameplay  
 * - /ruleset : Ruleset editor for customizing game rules
 * 
 * @see daijo-bu_architecture.md Section 4 for UI breakdown
 */
function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>大条部</h1>
          <h2>Daijō-bu</h2>
          <p>Proof-Nomic LLM Game</p>
        </header>
        
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game" element={<Game />} />
            <Route 
              path="/ruleset" 
              element={
                <Suspense fallback={<div>Loading Ruleset Editor...</div>}>
                  <RulesetEditor />
                </Suspense>
              } 
            />
            <Route 
              path="/config" 
              element={
                <Suspense fallback={<div>Loading Configuration Editor...</div>}>
                  <ConfigEditor />
                </Suspense>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
