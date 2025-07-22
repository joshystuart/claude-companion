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

            {/* Connection status and stats */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{activeAgents.length}</span>
                <span>active agents</span>
              </div>
              
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar navigation */}
          <nav className="flex-shrink-0 w-64">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={clsx(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          'mr-3 h-5 w-5',
                          isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}