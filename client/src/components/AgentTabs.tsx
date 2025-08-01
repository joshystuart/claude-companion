import React from 'react';
import { Agent } from '@/types';
import { formatAgentDisplayName } from '@/utils/agent-helpers';
import { useDashboardStore } from '@/store/dashboard-store';
import clsx from 'clsx';

interface AgentTabsProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
}

export const AgentTabs: React.FC<AgentTabsProps> = ({
  agents,
  selectedAgentId,
  onAgentSelect
}) => {
  const { getActiveEvents, getAgentEvents } = useDashboardStore();

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getActiveEventCount = (agentId: string | null) => {
    if (!agentId) {
      return getActiveEvents().length;
    }
    // For individual agents, show 1 if they have an active event, 0 otherwise
    const agentEvents = getAgentEvents(agentId);
    if (agentEvents.length === 0) return 0;
    
    // Check if the most recent event is a pre_tool_use
    const mostRecent = agentEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    
    return (mostRecent && mostRecent.hookType === 'pre_tool_use') ? 1 : 0;
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-6">
        <div className="flex overflow-x-auto scrollbar-hide space-x-1 py-2">
          {/* All Agents Tab */}
          <button
            onClick={() => onAgentSelect(null)}
            className={clsx(
              'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              selectedAgentId === null
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
            )}
          >
            <span>All Agents</span>
            {getActiveEventCount(null) > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500 text-white rounded-full">
                {getActiveEventCount(null)}
              </span>
            )}
          </button>

          {/* Individual Agent Tabs */}
          {agents.map((agent) => {
            const displayName = formatAgentDisplayName(agent.id);
            const activeCount = getActiveEventCount(agent.id);
            const isSelected = selectedAgentId === agent.id;
            
            return (
              <button
                key={agent.id}
                onClick={() => onAgentSelect(agent.id)}
                className={clsx(
                  'flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors min-w-0',
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                )}
              >
                {/* Status Indicator */}
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', getStatusColor(agent.status))} />
                  
                  {/* Agent Name */}
                  <div className="flex flex-col items-start min-w-0">
                    <span className="truncate text-xs font-medium">
                      {displayName.primary}
                    </span>
                    {displayName.secondary && (
                      <span className="text-xs text-gray-500 font-mono">
                        {displayName.secondary}
                      </span>
                    )}
                  </div>
                </div>

                {/* Active Event Count Badge */}
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-500 text-white rounded-full flex-shrink-0">
                    {activeCount}
                  </span>
                )}

                {/* Last Seen Indicator for inactive agents */}
                {agent.status !== 'active' && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(agent.lastSeen).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};