// import { useState } from 'react';
// import './App.css'; // Importing the styles we just made

// function App() {
//   // 1. State Management
//   const [isLogin, setIsLogin] = useState(true); // Tracks if we are on Login or Signup tab
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   // 2. Form submission handler
//   const handleSubmit = (e) => {
//     e.preventDefault(); // Prevents the page from refreshing automatically
    
//     if (isLogin) {
//       console.log("Logging in with:", { email, password });
//       alert(`Logging in with: ${email}`);
//     } else {
//       console.log("Signing up with:", { email, password });
//       alert(`Signing up with: ${email}`);
//     }
//   };

//   return (
//     <div className="container">
//       <div className="form-card">
//         <h2>Login Form</h2>

//         {/* Toggle Slide Tabs */}
//         <div className="toggle-container">
//           <button 
//             className={`toggle-btn ${isLogin ? 'active' : ''}`} 
//             onClick={() => setIsLogin(true)}
//           >
//             Login
//           </button>
//           <button 
//             className={`toggle-btn ${!isLogin ? 'active' : ''}`} 
//             onClick={() => setIsLogin(false)}
//           >
//             Signup
//           </button>
//         </div>

//         {/* HTML Form */}
//         <form onSubmit={handleSubmit}>
//           <div className="input-group">
//             <input 
//               type="email" 
//               placeholder="Email Address" 
//               value={email}
//               onChange={(e) => setEmail(e.target.value)} // Syncing input to state
//               required 
//             />
//           </div>
          
//           <div className="input-group">
//             <input 
//               type="password" 
//               placeholder="Password" 
//               value={password}
//               onChange={(e) => setPassword(e.target.value)} // Syncing input to state
//               required 
//             />
//           </div>

//           {isLogin && <a href="#" className="forgot-pass">Forgot password?</a>}

//           <button type="submit" className="submit-btn">
//             {isLogin ? 'Login' : 'Signup'}
//           </button>
//         </form>

//         <p className="signup-text">
//           {isLogin ? "Not a member? " : "Already a member? "}
//           <span onClick={() => setIsLogin(!isLogin)}>
//             {isLogin ? 'Signup now' : 'Login now'}
//           </span>
//         </p>
//       </div>
//     </div>
//   );
// }

// export default App;

import React, { useState } from 'react';

const Navbar = () => {
  return (
    <div style={styles.navbar}>
      <img 
        style={styles.logo} 
        src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" 
        alt="Netflix Logo" 
      />
      <div style={styles.navButtons}>
        <button style={styles.langBtn}>English</button>
        <button style={styles.signinBtn}>Sign In</button>
      </div>
    </div>
  );
};

const Hero = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      alert(`Welcome! Processing registration for: ${email}`);
    }
  };

  return (
    <div style={styles.heroContainer}>
      <h1 style={styles.heroTitle}>Unlimited movies, TV shows and more</h1>
      <p style={styles.heroSubtitle}>Watch anywhere. Cancel anytime.</p>
      <p style={styles.heroDesc}>
        Ready to watch? Enter your email to create or restart your membership.
      </p>
      
      <form onSubmit={handleSubmit} style={styles.ctaForm}>
        <input 
          type="email" 
          style={styles.emailInput} 
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" style={styles.getStartedBtn}>
          Get Started &gt;
        </button>
      </form>
    </div>
  );
};

export default function App() {
  return (
    <div style={styles.bodyWrapper}>
      <Navbar />
      <Hero />
    </div>
  );
}

const styles = {
  bodyWrapper: {
    margin: 0,
    padding: 0,
    backgroundColor: '#000000',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    color: '#ffffff',
    backgroundImage: "linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.8) 100%), url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1600')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
    width: '100vw',
    overflowX: 'hidden'
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px 10%',
  },
  logo: {
    width: '150px',
    height: 'auto',
  },
  navButtons: {
    display: 'flex',
    gap: '20px',
  },
  langBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#ffffff',
    border: '1px solid #ffffff',
    padding: '6px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  signinBtn: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  heroContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '100px 5%',
    marginTop: '20px',
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 900,
    margin: '0 0 16px 0',
    maxWidth: '800px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
  },
  heroSubtitle: {
    fontSize: '24px',
    fontWeight: 400,
    margin: '0 0 24px 0',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
  },
  heroDesc: {
    fontSize: '20px',
    fontWeight: 400,
    margin: '0 0 20px 0',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
  },
  ctaForm: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    maxWidth: '700px',
  },
  emailInput: {
    flexGrow: 1,
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    border: '1px solid #8c8c8c',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
  },
  getStartedBtn: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    border: 'none',
    padding: '18px 36px',
    fontSize: '24px',
    fontWeight: 'bold',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
  },
};