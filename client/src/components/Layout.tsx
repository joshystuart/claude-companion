import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Monitor, 
  Settings, 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboard-store';
import { useSSE } from '@/hooks/use-sse';
import { clsx } from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { connectionStatus, getActiveAgents } = useDashboardStore();
  const { reconnect } = useSSE();
  
  const activeAgents = getActiveAgents();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Monitor },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            {/* Logo and title */}
            <div className="flex items-center space-x-4">
              <Activity className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Claude Code Companion
                </h1>
                <p className="text-sm text-gray-500">
                  Remote monitoring dashboard
                </p>
              </div>
            </div>

            {/* Navigation, stats, and connection status */}
            <div className="flex items-center space-x-8">
              {/* Navigation tabs */}
              <nav className="flex space-x-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          'mr-2 h-4 w-4',
                          isActive ? 'text-primary-600' : 'text-gray-500'
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Active agents count */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{activeAgents.length}</span>
                <span>active agents</span>
              </div>
              
              {/* Connection status */}
              <button
                onClick={reconnect}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                title="Connection status - click to reconnect"
              >
                {getConnectionIcon()}
                <span className="capitalize">{connectionStatus}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - full width */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}