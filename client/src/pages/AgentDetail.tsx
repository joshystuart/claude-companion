import { useParams, Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Circle, Terminal, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '@/store/dashboard-store';

export function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const { agents, getAgentEvents } = useDashboardStore();
  
  if (!agentId) {
    return <Navigate to="/" replace />;
  }
  
  const agent = agents.get(agentId);
  const events = getAgentEvents(agentId);
  
  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Agent Not Found</h2>
        <p className="text-gray-600 mb-4">The agent "{agentId}" was not found.</p>
        <Link to="/" className="btn btn-primary">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'idle':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link 
          to="/" 
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Details</h2>
          <p className="text-gray-600">{agentId}</p>
        </div>
      </div>

      {/* Agent Info Card */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <div className="flex items-center space-x-2 mt-1">
              <Circle className={`h-3 w-3 ${getStatusColor(agent.status)}`} />
              <span className="text-lg font-semibold text-gray-900 capitalize">
                {agent.status}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Last Seen</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatDistanceToNow(agent.lastSeen, { addSuffix: true })}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Current Session</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {agent.sessionId || 'None'}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Total Events</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {events.length}
            </p>
          </div>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Event Timeline</h3>
          <p className="text-sm text-gray-600 mt-1">
            Recent activities from this agent
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Terminal className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">No events recorded</p>
              <p className="text-sm text-gray-400 mt-1">
                Events will appear here when this agent becomes active
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {events.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {event.hookType.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      
                      {event.data.toolName && (
                        <p className="text-sm text-gray-600 mt-1">
                          Tool: <span className="font-medium">{event.data.toolName}</span>
                        </p>
                      )}
                      
                      {event.data.message && (
                        <p className="text-sm text-gray-800 mt-1">
                          {event.data.message}
                        </p>
                      )}
                      
                      {event.data.toolArgs && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            Show raw data
                          </summary>
                          <pre className="text-xs bg-gray-50 p-2 mt-1 rounded-md overflow-auto">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}