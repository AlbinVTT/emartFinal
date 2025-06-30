import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ProductList from './ProductList';
import Cart from './Cart';
import OrderConfirmation from './OrderConfirmation';
import PaymentPage from './PaymentPage';
import axios from 'axios';

function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

function MainApp() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState({ items: [], total: 0 });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
  const storedUser = localStorage.getItem('username');
  if (storedUser) {
    // Optional: validate session via API
    setUsername(storedUser);
    setIsLoggedIn(true);
    navigate('/');
  } else {
    navigate('/'); // force show login page
  }
}, []);

  const login = async () => {
    try {
      const response = await axios.post('/login', {
        user_id: username,
        password: password
      });

      if (response.data.status === 'success') {
        setIsLoggedIn(true);
        localStorage.setItem('username', username);
        setCart([]);         // ✅ Clear cart
        setOrder({ items: [], total: 0 }); // ✅ Clear previous order
        setError('');
        navigate('/');
      } else {
        setError('❌ Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('❌ Login failed. Backend not reachable?');
    }
  };

  const logout = () => {
  setIsLoggedIn(false);
  setUsername('');
  setPassword('');
  setCart([]); // Clear cart on logout
  localStorage.clear(); // Not just username
  navigate('/'); // Redirect to login
};


  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const handleUpdateQuantity = (productId, action) => {
    const index = cart.findIndex((item) => item.id === productId);
    if (index === -1) return;

    let updatedCart = [...cart];

    if (action === 'increase') {
      updatedCart.push(cart[index]);
    } else if (action === 'decrease') {
      const i = updatedCart.findIndex(item => item.id === productId);
      if (i !== -1) updatedCart.splice(i, 1);
    } else if (action === 'remove') {
      updatedCart = updatedCart.filter(item => item.id !== productId);
    }

    setCart(updatedCart);
  };

  return isLoggedIn ? (
    <>
      <nav className="top-nav">
        <div className="brand">
          <img src="/images/logo.png" alt="eMart Logo" className="brand-logo" />
          <div className="brand-title">
            <span className="blue">e</span><span className="green">M</span><span className="orange">a</span><span className="red">r</span><span className="purple">t</span>
          </div>
        </div>
        <div className="nav-links">
          <button className="nav-link product-link" onClick={() => navigate('/')}>🛍️ Products</button>
          <button className="nav-link cart-link" onClick={() => navigate('/cart')}>🛒 Cart <span className="cart-count">({cart.length})</span></button>
          <button className="logout-btn" onClick={logout}>🚪 Logout</button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<ProductList onAddToCart={addToCart} />} />
        <Route path="/cart" element={<Cart cartItems={cart} onUpdateQuantity={handleUpdateQuantity} />} />
        <Route path="/payment" element={<PaymentPage cartItems={cart} setCart={setCart} setOrder={setOrder} />} />
        <Route path="/confirmation" element={<OrderConfirmation order={order} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  ) : (
    <div className="App">
      <img src="/images/logo.png" alt="eMart Logo" className="logo" />
      <h1 className="multicolor-title bounce">
        <span className="blue">e</span><span className="green">M</span><span className="orange">a</span><span className="red">r</span><span className="purple">t</span>
      </h1>
      <input type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p className="register-link">New user? Register here</p>
    </div>
  );
}

export default App;

