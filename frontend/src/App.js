import React, { useState, useEffect, useContext, createContext } from 'react';
import './App.css';

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (username, password, referCode) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          password, 
          refer_code: referCode || null 
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Components
const SignUpPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [referCode, setReferCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await signup(username, password, referCode);
    
    if (result.success) {
      setMessage(result.message);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Join MineTRXWithfun</h1>
          <p className="text-blue-200">Sign up and claim your 25 TRX bonus!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Referral Code (Optional)</label>
            <input
              type="text"
              value={referCode}
              onChange={(e) => setReferCode(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter referral code"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Signing Up...' : 'Sign Up & Claim 25 TRX'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/60">Already have an account?</p>
          <button className="text-blue-300 hover:text-blue-200 font-medium">
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-blue-200">Sign in to your mining account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const MockWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/mock-withdrawals`);
        const data = await response.json();
        setWithdrawals(data.withdrawals);
      } catch (error) {
        console.error('Error fetching withdrawals:', error);
      }
    };

    fetchWithdrawals();
    const interval = setInterval(fetchWithdrawals, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 h-64 overflow-hidden">
      <h3 className="text-white font-semibold mb-4 text-center">🚀 Live Withdrawals</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {withdrawals.map((withdrawal, index) => (
          <div
            key={index}
            className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <span className="text-green-300 font-medium">
                {withdrawal.amount} TRX
              </span>
              <span className="text-green-200 text-sm">
                {new Date(withdrawal.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HomePage = () => {
  const [nodes, setNodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [paymentNode, setPaymentNode] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [config, setConfig] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    fetchNodes();
    fetchConfig();
  }, []);

  const fetchNodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/nodes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setNodes(data.nodes);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/config`);
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleBuyNode = (nodeId) => {
    const node = nodes[nodeId];
    if (!node.can_rebuy) {
      alert('Node is still active or you already own it!');
      return;
    }
    setPaymentNode(nodeId);
    setPurchasing(nodeId);
  };

  const handlePaymentSubmit = async () => {
    if (!transactionHash.trim()) {
      alert('Please enter transaction hash');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/nodes/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          node_id: paymentNode,
          transaction_hash: transactionHash
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        setPaymentNode(null);
        setPurchasing(null);
        setTransactionHash('');
        fetchNodes();
      } else {
        alert(data.detail);
      }
    } catch (error) {
      alert('Error processing payment');
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(config.trx_address);
    alert('Address copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-white text-center">MineTRXWithfun</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <img 
            src="https://images.unsplash.com/photo-1694219782948-afcab5c095d3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxibG9ja2NoYWluJTIwdGVjaG5vbG9neXxlbnwwfHx8fDE3NTI4MTE1MDJ8MA&ixlib=rb-4.1.0&q=85"
            alt="TRX Mining" 
            className="w-full max-w-2xl mx-auto rounded-2xl shadow-2xl mb-8"
          />
          <h2 className="text-4xl font-bold text-white mb-4">World's Largest TRX Mining Farm</h2>
          <p className="text-xl text-blue-200 mb-8">Legal Platform • Guaranteed Returns • Secure Mining</p>
        </div>

        {/* Live Withdrawals */}
        <div className="mb-12">
          <MockWithdrawals />
        </div>

        {/* Mining Information */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-12 border border-white/20">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">About MineTRXWithfun</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <img 
                src="https://images.unsplash.com/flagged/photo-1579274216947-86eaa4b00475?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxzZXJ2ZXIlMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc1MjgxMTUwOXww&ixlib=rb-4.1.0&q=85"
                alt="Mining Farm" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <p className="text-white">World's largest TRX mining operation</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <p className="text-white">100% legal and regulated platform</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <p className="text-white">Guaranteed mining returns</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <p className="text-white">24/7 customer support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mining Nodes */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-white text-center mb-8">Choose Your Mining Node</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(nodes).map(([nodeId, node]) => (
              <div key={nodeId} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <div className="text-center mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1729964079476-595fd4f7d627?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxzZXJ2ZXIlMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc1MjgxMTUwOXww&ixlib=rb-4.1.0&q=85"
                    alt={node.config.name}
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h4 className="text-xl font-bold text-white">{node.config.name}</h4>
                  <p className="text-blue-200">{node.config.gb} GB Storage</p>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-white/80">Price:</span>
                    <span className="text-green-400 font-bold">{node.config.price} TRX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">Mining:</span>
                    <span className="text-yellow-400 font-bold">{node.config.mining_amount} TRX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">Duration:</span>
                    <span className="text-blue-400 font-bold">{node.config.duration_days} days</span>
                  </div>
                </div>

                {node.active && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/80">Progress:</span>
                      <span className="text-green-400">{node.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${node.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleBuyNode(nodeId)}
                  disabled={!node.can_rebuy}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    node.can_rebuy
                      ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {node.active ? 'Running' : node.can_rebuy ? 'Buy Node' : 'Owned'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Modal */}
        {paymentNode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                Purchase {nodes[paymentNode]?.config.name}
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-white/80 mb-2">Send exactly:</p>
                  <p className="text-2xl font-bold text-green-400">
                    {nodes[paymentNode]?.config.price} TRX
                  </p>
                </div>

                <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-white/80 mb-2">To address:</p>
                  <div className="flex items-center space-x-2">
                    <code className="text-blue-300 text-sm bg-black/30 px-2 py-1 rounded flex-1">
                      {config.trx_address}
                    </code>
                    <button
                      onClick={copyAddress}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Transaction Hash
                  </label>
                  <input
                    type="text"
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter transaction hash"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setPaymentNode(null);
                    setPurchasing(null);
                    setTransactionHash('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700"
                >
                  I Already Paid
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [withdrawing, setWithdrawing] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleWithdraw = async (balanceType) => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          balance_type: balanceType,
          amount: parseFloat(withdrawAmount)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        setWithdrawing(null);
        setWithdrawAmount('');
        
        // Refresh user data
        const profileResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUser(profileData.user);
        }
      } else {
        alert(data.detail);
      }
    } catch (error) {
      alert('Error processing withdrawal');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
            <p className="text-2xl text-blue-200">Welcome, {user?.username}!</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Mine Balance */}
            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">💰 Mine Balance</h3>
              <div className="text-3xl font-bold text-green-400 mb-4">
                {user?.mine_balance?.toFixed(2)} TRX
              </div>
              <p className="text-white/80 text-sm mb-4">
                Includes sign-up bonus and mining rewards
              </p>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-200 text-sm">
                  📍 Minimum withdrawal: 25 TRX
                </p>
                {!user?.has_purchased_node && (
                  <p className="text-yellow-200 text-sm mt-2">
                    ⚠️ First-time withdrawal requires purchasing any node
                  </p>
                )}
              </div>
              <button
                onClick={() => setWithdrawing('mine')}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700"
              >
                Withdraw Mine Balance
              </button>
            </div>

            {/* Referral Balance */}
            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">🎯 Referral Balance</h3>
              <div className="text-3xl font-bold text-purple-400 mb-4">
                {user?.referral_balance?.toFixed(2)} TRX
              </div>
              <p className="text-white/80 text-sm mb-4">
                Earned from valid referrals
              </p>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 mb-4">
                <p className="text-purple-200 text-sm">
                  📍 Minimum withdrawal: 50 TRX
                </p>
                {!user?.has_purchased_node4 && (
                  <p className="text-yellow-200 text-sm mt-2">
                    ⚠️ Must purchase Node 4 (1024 GB) to withdraw
                  </p>
                )}
              </div>
              <button
                onClick={() => setWithdrawing('referral')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-700"
              >
                Withdraw Referral Balance
              </button>
            </div>
          </div>
        </div>

        {/* Withdrawal Modal */}
        {withdrawing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                Withdraw {withdrawing === 'mine' ? 'Mine' : 'Referral'} Balance
              </h3>
              
              <div className="mb-6">
                <label className="block text-white text-sm font-medium mb-2">
                  Amount (TRX)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setWithdrawing(null);
                    setWithdrawAmount('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleWithdraw(withdrawing)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ReferralsPage = () => {
  const [referrals, setReferrals] = useState({
    refer_code: '',
    valid_referrals: [],
    invalid_referrals: [],
    total_earned: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/referrals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setReferrals(data);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferCode = () => {
    navigator.clipboard.writeText(referrals.refer_code);
    alert('Referral code copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Referral System</h1>
            <p className="text-blue-200">Invite friends and earn 50 TRX per valid referral!</p>
          </div>

          {/* Referral Code */}
          <div className="bg-black/20 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">🎯 Your Referral Code</h3>
            <div className="flex items-center space-x-4">
              <code className="text-2xl font-bold text-blue-300 bg-black/30 px-4 py-2 rounded-lg flex-1 text-center">
                {referrals.refer_code}
              </code>
              <button
                onClick={copyReferCode}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Referral Info */}
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">💰 How It Works</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <p className="text-white">Share your referral code with friends</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <p className="text-white">They sign up using your code</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <p className="text-white">When they purchase any node, you earn 50 TRX!</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <p className="text-white">Total earned: {referrals.total_earned} TRX</p>
              </div>
            </div>
          </div>

          {/* Valid Referrals */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-4">
                ✅ Valid Referrals ({referrals.valid_referrals.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {referrals.valid_referrals.length === 0 ? (
                  <p className="text-white/60 text-center py-8">No valid referrals yet</p>
                ) : (
                  referrals.valid_referrals.map((referral, index) => (
                    <div key={index} className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{referral.username}</p>
                          <p className="text-green-300 text-sm">
                            Joined: {new Date(referral.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-green-400 font-bold">+50 TRX</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                ⏳ Pending Referrals ({referrals.invalid_referrals.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {referrals.invalid_referrals.length === 0 ? (
                  <p className="text-white/60 text-center py-8">No pending referrals</p>
                ) : (
                  referrals.invalid_referrals.map((referral, index) => (
                    <div key={index} className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{referral.username}</p>
                          <p className="text-yellow-300 text-sm">
                            Joined: {new Date(referral.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-yellow-400 text-sm">Needs to buy node</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navigation = () => {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'referrals', label: 'Referrals', icon: '🎯' },
  ];

  return (
    <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <span className="text-xl font-bold text-white">MineTRXWithfun</span>
          </div>
          
          <div className="flex items-center space-x-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-blue-500 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-all duration-200"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <AuthProvider>
      <AuthenticatedApp showLogin={showLogin} setShowLogin={setShowLogin} />
    </AuthProvider>
  );
};

const AuthenticatedApp = ({ showLogin, setShowLogin }) => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return showLogin ? (
      <div>
        <LoginPage />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowLogin(false)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Need an account? Sign Up
          </button>
        </div>
      </div>
    ) : (
      <div>
        <SignUpPage />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowLogin(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'profile':
        return <ProfilePage />;
      case 'referrals':
        return <ReferralsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {renderCurrentPage()}
    </div>
  );
};

export default App;