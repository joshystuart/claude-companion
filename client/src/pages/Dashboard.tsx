import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Computer, 
  Clock, 
  Filter,
  Circle,
  Terminal,
  Shield,
  History
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboard-store';
import { HookEvent } from '@/types';
import { clsx } from 'clsx';
import { EventControl } from '@/components/EventControl';
import { AgentTabs } from '@/components/AgentTabs';
import { HeaderSessionControl } from '@/components/HeaderSessionControl';
import { CommandHistory } from '@/components/CommandHistory';

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

  const [showCommandHistory, setShowCommandHistory] = useState(false);

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
    <div className="space-y-4">
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
            onClick={() => setShowCommandHistory(!showCommandHistory)}
            className="btn btn-secondary px-4 py-2 flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            {showCommandHistory ? 'Hide' : 'Show'} Command History
          </button>
          <button
            onClick={clearEvents}
            className="btn btn-secondary px-4 py-2"
          >
            Clear Events
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center">
            <Computer className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Agents</p>
              <p className="text-2xl font-semibold text-gray-900">{agentList.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
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
        
        <div className="card p-4">
          <div className="flex items-center">
            <Terminal className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Events Today</p>
              <p className="text-2xl font-semibold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
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

      {/* Command History Modal */}
      {showCommandHistory && (
        <div className="mb-6">
          <CommandHistory />
        </div>
      )}

      {/* Agent Tabs */}
      {agentList.length > 0 && (
        <AgentTabs
          agents={agentList}
          selectedAgentId={selectedAgentId}
          onAgentSelect={setSelectedAgent}
        />
      )}

      {/* Header with Session Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedAgentId ? `Agent: ${agentList.find(a => a.id === selectedAgentId)?.id}` : 'All Agents'}
          </h2>
          
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

        {/* Session Controls for Selected Agent */}
        <HeaderSessionControl
          agent={selectedAgentId ? agentList.find(a => a.id === selectedAgentId) || null : null}
          onCommandSent={() => {
            // Optionally refresh or show notification
          }}
        />
      </div>

      {/* No Agents State */}
      {agentList.length === 0 && (
        <div className="text-center py-12">
          <Computer className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No agents connected</h3>
          <p className="mt-2 text-sm text-gray-500">
            Install the agent to start monitoring Claude Code sessions
          </p>
        </div>
      )}

      {/* Events Feed */}
      {agentList.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Events</h3>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Terminal className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">No events yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Events will appear here when agents are active
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {events.map((event, index) => (
                  <EventControl
                    key={`${event.agentId}-${event.timestamp}`}
                    event={event}
                    isLatest={index === 0}
                    onCommandSent={() => {
                      // Optionally refresh or show notification
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}