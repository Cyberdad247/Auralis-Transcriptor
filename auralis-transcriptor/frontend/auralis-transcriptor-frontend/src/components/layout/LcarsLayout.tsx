import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Upload, History, User } from 'lucide-react';

interface LcarsLayoutProps {
  children: React.ReactNode;
}

const LcarsLayout: React.FC<LcarsLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="lcars-layout">
      {/* LCARS Sidebar Navigation */}
      <div className="lcars-sidebar">
        {/* Header */}
        <div className="p-6 border-b border-[var(--lcars-burnt-orange)]">
          <h1 className="text-2xl font-bold text-lcars-orange mb-2">
            AURALIS
          </h1>
          <p className="text-lcars-blue text-sm uppercase tracking-wider">
            Transcriptor
          </p>
          <p className="text-lcars-grey text-xs mt-1">
            Starfleet Linguistic Analysis
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <div
            className={`lcars-nav-item flex items-center gap-3 ${
              isActive('/') ? 'active' : ''
            }`}
            onClick={() => navigate('/')}
          >
            <Upload size={20} />
            Upload
          </div>
          <div
            className={`lcars-nav-item flex items-center gap-3 ${
              isActive('/transcriptions') ? 'active' : ''
            }`}
            onClick={() => navigate('/transcriptions')}
          >
            <History size={20} />
            History
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="p-6 border-t border-[var(--lcars-burnt-orange)]">
          <div className="flex items-center gap-3 mb-4">
            <User size={20} className="text-lcars-blue" />
            <div>
              <p className="text-lcars-white text-sm font-medium">
                {user?.email || 'Unknown User'}
              </p>
              <p className="text-lcars-grey text-xs uppercase">
                Active Session
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="lcars-button w-full flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* System Status */}
        <div className="p-4 bg-[var(--lcars-panel-black)] m-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lcars-blue text-xs uppercase tracking-wider">
              System Status
            </span>
            <div className="w-2 h-2 bg-[var(--lcars-green)] rounded-full animate-pulse"></div>
          </div>
          <p className="text-lcars-white text-xs">All systems nominal</p>
          <p className="text-lcars-grey text-xs mt-1">
            Transcription engines online
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="lcars-main">
        {children}
      </main>
    </div>
  );
};

export default LcarsLayout;
