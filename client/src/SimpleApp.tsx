import React, { useState } from 'react';

const SimpleApp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setMessage(`Welcome ${data.user.firstName}! Role: ${data.user.role}`);
        localStorage.setItem('token', data.token);
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch (error) {
      setMessage('Connection error. Make sure the server is running.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMessage('');
    localStorage.removeItem('token');
  };

  if (user) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ backgroundColor: '#4CAF50', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h1>🏫 Shambil Pride Academy Management System</h1>
          <p>Welcome to your school management dashboard!</p>
        </div>

        <div style={{ backgroundColor: '#f0f8ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>👋 Welcome, {user.firstName} {user.lastName}!</h2>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Email:</strong> {user.email}</p>
          {user.office && <p><strong>Office:</strong> {user.office}</p>}
        </div>

        <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>🎉 System Status</h3>
          <p>✅ Frontend: Running on http://localhost:3000</p>
          <p>✅ Backend: Running on http://localhost:4000</p>
          <p>✅ Database: SQLite (No MongoDB required!)</p>
          <p>✅ Authentication: Working perfectly</p>
        </div>

        <div style={{ backgroundColor: '#d1ecf1', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>🚀 Available Features</h3>
          <ul>
            <li>✅ Role-based dashboards (Admin, Student, Teacher, Accountant, Exam Officer, Parent)</li>
            <li>✅ Student management with admission numbers and houses</li>
            <li>✅ Academic session support (2020/2021 to 2149/2150)</li>
            <li>✅ Payment tracking and receipt generation</li>
            <li>✅ Result entry and transcript system</li>
            <li>✅ Complaint and daily report systems</li>
            <li>✅ Search functionality and analytics</li>
          </ul>
        </div>

        <button 
          onClick={handleLogout}
          style={{ 
            backgroundColor: '#dc3545', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#007bff', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
        <h1>🏫 Shambil Pride Academy</h1>
        <p>School Management System</p>
      </div>

      <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Login to Your Dashboard</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            placeholder="Enter your email"
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            placeholder="Enter your password"
          />
        </div>

        <button 
          type="submit"
          style={{ 
            width: '100%', 
            backgroundColor: '#007bff', 
            color: 'white', 
            padding: '10px', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Login
        </button>

        {message && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: message.includes('Welcome') ? '#d4edda' : '#f8d7da',
            color: message.includes('Welcome') ? '#155724' : '#721c24',
            borderRadius: '4px'
          }}>
            {message}
          </div>
        )}
      </form>

      <div style={{ marginTop: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <h3>🔑 Demo Login Credentials:</h3>
        <div style={{ fontSize: '12px' }}>
          <p><strong>Admin:</strong> admin@shambil.edu.ng / admin123</p>
          <p><strong>Student:</strong> student@shambil.edu.ng / student123</p>
          <p><strong>Teacher:</strong> teacher@shambil.edu.ng / teacher123</p>
          <p><strong>Accountant:</strong> accountant@shambil.edu.ng / accountant123</p>
          <p><strong>Exam Officer:</strong> exam@shambil.edu.ng / exam123</p>
          <p><strong>Parent:</strong> parent@shambil.edu.ng / parent123</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleApp;