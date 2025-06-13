import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './routes/Home';
import Game from './routes/Game';
import './App.css';

/**
 * Main App component with React Router setup
 * 
 * Provides two main routes:
 * - / : Landing page with prompt form and game setup
 * - /game : Game interface with live gameplay
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
