import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { useAuth } from "../../contexts/AuthContext";
import { 
  FileText, 
  Upload, 
  List, 
  Zap, 
  Activity,
  Clock,
  LogOut
} from "lucide-react";
import LcarsButton from "../ui/LcarsButton";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const navigationItems = [
    {
      title: "UPLOAD INTERFACE",
      url: createPageUrl("Upload"),
      icon: Upload,
      description: "DATA TRANSMISSION"
    },
    {
      title: "TRANSCRIPTION LOG",
      url: createPageUrl("Transcriptions"),
      icon: List,
      description: "ARCHIVE ACCESS"
    }
  ];

  const isActive = (url: string) => location.pathname === url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white overflow-hidden">
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
        
        .lcars-button {
          background: linear-gradient(135deg, #00CCCC 0%, #0099CC 100%);
          transition: all 0.3s ease;
        }
        
        .lcars-button:hover {
          background: linear-gradient(135deg, #00FFFF 0%, #00CCCC 100%);
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
        }
        
        .lcars-active {
          background: linear-gradient(135deg, #FF9900 0%, #CC6600 100%);
          box-shadow: 0 0 15px rgba(255, 153, 0, 0.3);
        }
        
        .status-pulse {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 204, 204, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 204, 204, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>

      {/* Header Console */}
      <header className="lcars-panel border-b-2 border-cyan-400 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="lcars-font text-2xl font-bold text-cyan-300">AURALIS TRANSCRIPTOR</h1>
                <p className="data-font text-xs text-cyan-500">STARFLEET LINGUISTIC ANALYSIS SYSTEM</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <div className="data-font text-cyan-300 text-lg font-bold">{formatTime(currentTime)}</div>
              <div className="data-font text-cyan-500 text-sm">{formatDate(currentTime)}</div>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-400 status-pulse" />
              <span className="lcars-font text-green-400 text-sm">SYSTEM ONLINE</span>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="lcars-font text-cyan-300 text-sm">ENSIGN {user.email.split('@')[0].toUpperCase()}</div>
                  <div className="data-font text-cyan-500 text-xs">AUTHENTICATED</div>
                </div>
                <LcarsButton 
                  variant="danger" 
                  size="sm" 
                  onClick={logout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>LOGOUT</span>
                </LcarsButton>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Left Navigation Panel */}
        <nav className="w-80 p-6 border-r border-cyan-400/30">
          <div className="space-y-4">
            <div className="lcars-panel rounded-lg p-4 mb-6">
              <h2 className="lcars-font text-cyan-300 text-lg font-semibold mb-2">COMMAND INTERFACE</h2>
              <div className="grid-pattern h-1 rounded mb-4"></div>
            </div>

            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`block p-4 rounded-lg transition-all duration-300 ${
                  isActive(item.url) 
                    ? 'lcars-active text-white' 
                    : 'lcars-panel hover:border-cyan-400/50 text-cyan-100'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <item.icon className="w-6 h-6" />
                  <div>
                    <div className="lcars-font font-semibold">{item.title}</div>
                    <div className="data-font text-xs opacity-75">{item.description}</div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Status Panel */}
            <div className="lcars-panel rounded-lg p-4 mt-8">
              <h3 className="lcars-font text-cyan-300 font-semibold mb-3">SYSTEM STATUS</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="data-font text-sm">TRANSCRIPTION ENGINE</span>
                  <span className="data-font text-green-400 text-xs">ACTIVE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="data-font text-sm">NEURAL NETWORK</span>
                  <span className="data-font text-green-400 text-xs">OPTIMAL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="data-font text-sm">DATA STORAGE</span>
                  <span className="data-font text-green-400 text-xs">SECURED</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen bg-gradient-to-b from-transparent to-slate-900/50">
          {children}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="lcars-panel border-t-2 border-cyan-400 p-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="data-font text-cyan-400 text-sm">PROCESSING QUEUE: READY</span>
            </div>
          </div>
          <div className="data-font text-cyan-500 text-xs">
            AURALIS TRANSCRIPTOR v2.1.4 | NEURAL LINGUISTICS PROTOCOL ACTIVE
          </div>
        </div>
      </footer>
    </div>
  );
}