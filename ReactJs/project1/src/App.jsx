import { useState } from 'react';
import './App.css'; // Importing the styles we just made

function App() {
  // 1. State Management
  const [isLogin, setIsLogin] = useState(true); // Tracks if we are on Login or Signup tab
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2. Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevents the page from refreshing automatically
    
    if (isLogin) {
      console.log("Logging in with:", { email, password });
      alert(`Logging in with: ${email}`);
    } else {
      console.log("Signing up with:", { email, password });
      alert(`Signing up with: ${email}`);
    }
  };

  return (
    <div className="container">
      <div className="form-card">
        <h2>Login Form</h2>

        {/* Toggle Slide Tabs */}
        <div className="toggle-container">
          <button 
            className={`toggle-btn ${isLogin ? 'active' : ''}`} 
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={`toggle-btn ${!isLogin ? 'active' : ''}`} 
            onClick={() => setIsLogin(false)}
          >
            Signup
          </button>
        </div>

        {/* HTML Form */}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Syncing input to state
              required 
            />
          </div>
          
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Syncing input to state
              required 
            />
          </div>

          {isLogin && <a href="#" className="forgot-pass">Forgot password?</a>}

          <button type="submit" className="submit-btn">
            {isLogin ? 'Login' : 'Signup'}
          </button>
        </form>

        <p className="signup-text">
          {isLogin ? "Not a member? " : "Already a member? "}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Signup now' : 'Login now'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;