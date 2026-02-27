import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import BattleArena from './components/BattleArena';
import Matchmaking from './components/Matchmaking';
import Leaderboard from './components/Leaderboard';
import BattleHistory from './components/BattleHistory';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="App">
        {user && (
          <nav className="navbar">
            <div className="nav-brand">⚔️ Battle Arena</div>
            <div className="nav-links">
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/battle">Battle</Link>
              <Link to="/matchmaking">Matchmaking</Link>
              <Link to="/leaderboard">Leaderboard</Link>
              <Link to="/history">History</Link>
            </div>
            <div className="nav-user">
              <span>👤 {user.username}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </nav>
        )}

        <div className="content">
          <Routes>
            <Route path="/login" element={
              user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} apiUrl={API_URL} />
            } />
            <Route path="/register" element={
              user ? <Navigate to="/dashboard" /> : <Register onRegister={handleLogin} apiUrl={API_URL} />
            } />
            <Route path="/dashboard" element={
              user ? <Dashboard user={user} apiUrl={API_URL} /> : <Navigate to="/login" />
            } />
            <Route path="/battle" element={
              user ? <BattleArena user={user} apiUrl={API_URL} /> : <Navigate to="/login" />
            } />
            <Route path="/matchmaking" element={
              user ? <Matchmaking user={user} apiUrl={API_URL} /> : <Navigate to="/login" />
            } />
            <Route path="/leaderboard" element={
              user ? <Leaderboard apiUrl={API_URL} /> : <Navigate to="/login" />
            } />
            <Route path="/history" element={
              user ? <BattleHistory user={user} apiUrl={API_URL} /> : <Navigate to="/login" />
            } />
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;