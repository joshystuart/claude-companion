// import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Computer, 
  Clock, 
  Filter,
  Circle,
  Terminal
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboard-store';
import { HookEvent } from '@/types';
import { clsx } from 'clsx';

export function Dashboard() {
  const {
    agents,
    getFilteredEvents,
    selectedAgentId,
    setSelectedAgent,
    eventFilter,
    setEventFilter,
    clearEvents,
  } = useDashboardStore();

  // const [showEventDetails, setShowEventDetails] = useState<string | null>(null);

  const events = getFilteredEvents();
  const agentList = Array.from(agents.values());

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

  const getEventIcon = (hookType: string) => {
    switch (hookType) {
      case 'pre_tool_use':
        return '▶';
      case 'post_tool_use':
        return '✓';
      case 'stop':
        return '⏹';
      case 'notification':
        return '💬';
      default:
        return '•';
    }
  };

  const formatEventData = (event: HookEvent) => {
    const { data } = event;
    if (data.toolName) {
      return `${data.toolName}${data.toolArgs ? ` (${JSON.stringify(data.toolArgs).slice(0, 50)}...)` : ''}`;
    }
    if (data.message) {
      return data.message.slice(0, 100) + (data.message.length > 100 ? '...' : '');
    }
    return 'No details available';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">
            Monitor your Claude Code sessions in real-time
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={clearEvents}
            className="btn btn-secondary px-4 py-2"
          >
            Clear Events
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center">
            <Computer className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Agents</p>
              <p className="text-2xl font-semibold text-gray-900">{agentList.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <Circle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Now</p>
              <p className="text-2xl font-semibold text-gray-900">
                {agentList.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <Terminal className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Events Today</p>
              <p className="text-2xl font-semibold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Last Event</p>
              <p className="text-sm font-semibold text-gray-900">
                {events.length > 0 
                  ? formatDistanceToNow(new Date(events[0].timestamp), { addSuffix: true })
                  : 'No events'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Agents</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {agentList.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Computer className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">No agents connected</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Install the agent to start monitoring
                  </p>
                </div>
              ) : (
                agentList.map((agent) => (
                  <div
                    key={agent.id}
                    className={clsx(
                      'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                      selectedAgentId === agent.id && 'bg-primary-50'
                    )}
                    onClick={() => setSelectedAgent(
                      selectedAgentId === agent.id ? null : agent.id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Circle className={clsx('h-3 w-3', getStatusColor(agent.status))} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {agent.id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {agent.sessionId ? `Session: ${agent.sessionId.slice(0, 8)}...` : 'No session'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={clsx('status-indicator', {
                          'status-active': agent.status === 'active',
                          'status-idle': agent.status === 'idle',
                          'status-offline': agent.status === 'offline',
                        })}>
                          {agent.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(agent.lastSeen, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Events Feed */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Recent Events</h3>
                
                {/* Event filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value as any)}
                    className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Events</option>
                    <option value="pre_tool_use">Pre Tool Use</option>
                    <option value="post_tool_use">Post Tool Use</option>
                    <option value="stop">Stop</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Terminal className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">No events yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Events will appear here when agents are active
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {events.map((event) => (
                    <div key={`${event.agentId}-${event.timestamp}`} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <span className="text-lg leading-none mt-1">
                          {getEventIcon(event.hookType)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {event.hookType.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            Agent: {event.agentId}
                          </p>
                          
                          <p className="text-sm text-gray-800 mt-1">
                            {formatEventData(event)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}