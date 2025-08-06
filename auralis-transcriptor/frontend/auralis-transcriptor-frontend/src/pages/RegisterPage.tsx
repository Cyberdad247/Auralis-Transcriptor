import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, User, Lock, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LCARSButton from '../components/ui/LCARSButton';
import LcarsPanel from '../components/ui/LcarsPanel';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        
        .lcars-font {
          font-family: 'Rajdhani', sans-serif;
          letter-spacing: 0.05em;
        }
        
        .data-font {
          font-family: 'Space Mono', monospace;
        }
        
        .lcars-panel {
          background: linear-gradient(135deg, rgba(0, 204, 204, 0.1) 0%, rgba(0, 51, 102, 0.2) 100%);
          border: 1px solid rgba(0, 204, 204, 0.3);
          backdrop-filter: blur(10px);
        }
        
        .lcars-input {
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(0, 204, 204, 0.3);
          border-radius: 8px;
          color: white;
          padding: 12px 16px;
          font-family: 'Space Mono', monospace;
          transition: all 0.3s ease;
        }
        
        .lcars-input:focus {
          outline: none;
          border-color: #00CCCC;
          box-shadow: 0 0 10px rgba(0, 204, 204, 0.3);
        }
      `}</style>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="lcars-font text-3xl font-bold text-cyan-300 mb-2">AURALIS TRANSCRIPTOR</h1>
          <p className="data-font text-cyan-500 text-sm">CREW REGISTRATION TERMINAL</p>
        </div>

        <LcarsPanel title="ACCESS REQUEST">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300"
              >
                <AlertCircle className="w-5 h-5" />
                <span className="data-font text-sm">{error}</span>
              </motion.div>
            )}

            <div>
              <label className="block data-font text-cyan-400 text-sm mb-2">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="lcars-input w-full pl-12"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block data-font text-cyan-400 text-sm mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lcars-input w-full pl-12"
                  placeholder="Create a password"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block data-font text-cyan-400 text-sm mb-2">
                CONFIRM PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="lcars-input w-full pl-12"
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            </div>

            <LCARSButton 
              type="submit" 
              variant="primary" 
              size="lg" 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              <span>{isLoading ? 'PROCESSING...' : 'REGISTER'}</span>
            </LCARSButton>
          </form>

          <div className="mt-6 text-center">
            <p className="data-font text-cyan-500 text-sm">
              Already have access?{' '}
              <Link 
                to="/login" 
                className="text-cyan-300 hover:text-cyan-100 transition-colors"
              >
                LOGIN HERE
              </Link>
            </p>
          </div>
        </LcarsPanel>
      </motion.div>
    </div>
  );
}