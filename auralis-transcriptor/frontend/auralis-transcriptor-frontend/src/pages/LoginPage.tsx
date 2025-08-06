import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, User, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LcarsButton from '../components/ui/LcarsButton';
import LcarsPanel from '../components/ui/LcarsPanel';
import LcarsInput from '../components/ui/LcarsInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--lcars-primary-black)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* LCARS Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--lcars-orange)] flex items-center justify-center relative">
            <Zap className="w-12 h-12 text-[var(--lcars-primary-black)]" />
            <div className="absolute inset-0 rounded-full border-4 border-[var(--lcars-burnt-orange)] animate-pulse"></div>
          </div>
          <h1 className="text-4xl font-bold text-lcars-orange mb-2">
            AURALIS
          </h1>
          <h2 className="text-xl text-lcars-blue mb-4 uppercase tracking-wider">
            Transcriptor
          </h2>
          <div className="w-32 h-1 bg-[var(--lcars-orange)] mx-auto mb-2"></div>
          <p className="text-lcars-grey text-sm uppercase tracking-wider">
            Starfleet Linguistic Analysis System
          </p>
        </div>

        <LcarsPanel title="System Access" subtitle="Authentication Required">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-3 p-4 rounded-lg bg-[var(--lcars-red)]/20 border border-[var(--lcars-red)] text-[var(--lcars-red)]"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <div className="space-y-4">
              <LcarsInput
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />

              <LcarsInput
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            <LcarsButton 
              type="submit" 
              size="lg" 
              loading={isLoading}
              className="w-full"
            >
              Authenticate
            </LcarsButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-lcars-grey text-sm">
              New to Starfleet?{' '}
              <Link 
                to="/register" 
                className="text-lcars-blue hover:text-lcars-orange transition-colors uppercase tracking-wider font-medium"
              >
                Request Access
              </Link>
            </p>
          </div>
        </LcarsPanel>

        {/* System Status Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--lcars-panel-black)] rounded-full border border-[var(--lcars-burnt-orange)]">
            <div className="w-2 h-2 bg-[var(--lcars-green)] rounded-full animate-pulse"></div>
            <span className="text-lcars-grey text-xs uppercase tracking-wider">
              System Online
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}