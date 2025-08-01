import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Computer {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  lastSeen: string;
  agents?: Agent[];
}

interface Agent {
  id: string;
  computerId: string;
  name: string;
  workingDirectory: string;
  status: 'active' | 'idle' | 'offline';
  lastActivity: string;
  currentSessionId?: string;
  sessions?: Session[];
}

interface Session {
  id: string;
  agentId: string;
  name: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'interrupted';
  workingDirectory: string;
  eventCount: number;
}

interface HierarchicalSidebarProps {
  onSelectSession?: (sessionId: string) => void;
  selectedSessionId?: string;
}

export const HierarchicalSidebar: React.FC<HierarchicalSidebarProps> = ({
  onSelectSession,
  selectedSessionId
}) => {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [expandedComputers, setExpandedComputers] = useState<Set<string>>(new Set());
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHierarchy();
    
    // Refresh hierarchy every 30 seconds
    const interval = setInterval(fetchHierarchy, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHierarchy = async () => {
    try {
      const response = await fetch('/api/computers');
      const data = await response.json();
      setComputers(data);
      
      // Auto-expand computers with active agents
      const newExpandedComputers = new Set(expandedComputers);
      const newExpandedAgents = new Set(expandedAgents);
      
      data.forEach((computer: Computer) => {
        if (computer.agents?.some(agent => agent.status === 'active')) {
          newExpandedComputers.add(computer.id);
          computer.agents?.forEach(agent => {
            if (agent.status === 'active') {
              newExpandedAgents.add(agent.id);
            }
          });
        }
      });
      
      setExpandedComputers(newExpandedComputers);
      setExpandedAgents(newExpandedAgents);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch hierarchy:', error);
      setLoading(false);
    }
  };

  const toggleComputer = (computerId: string) => {
    const newExpanded = new Set(expandedComputers);
    if (newExpanded.has(computerId)) {
      newExpanded.delete(computerId);
    } else {
      newExpanded.add(computerId);
    }
    setExpandedComputers(newExpanded);
  };

  const toggleAgent = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'idle':
        return '🟡';
      case 'offline':
        return '🔴';
      case 'completed':
        return '✅';
      case 'interrupted':
        return '⚠️';
      default:
        return '⚪';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'darwin':
        return '🍎';
      case 'linux':
        return '🐧';
      case 'win32':
        return '🪟';
      default:
        return '💻';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="w-80 bg-gray-50 border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">System Hierarchy</h2>
        <p className="text-sm text-gray-500">Computers → Agents → Sessions</p>
      </div>
      
      <div className="p-2">
        {computers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📱</div>
            <p>No computers connected</p>
            <p className="text-xs mt-1">Install the agent to get started</p>
          </div>
        ) : (
          computers.map((computer) => (
            <div key={computer.id} className="mb-2">
              {/* Computer Level */}
              <div
                className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => toggleComputer(computer.id)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {expandedComputers.has(computer.id) ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 mr-1" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 mr-1" />
                  )}
                  <span className="mr-2">{getPlatformIcon(computer.platform)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {computer.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {computer.agents?.length || 0} agents • {formatRelativeTime(computer.lastSeen)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Agents Level */}
              {expandedComputers.has(computer.id) && computer.agents && (
                <div className="ml-6 space-y-1">
                  {computer.agents.map((agent) => (
                    <div key={agent.id}>
                      <div
                        className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                        onClick={() => toggleAgent(agent.id)}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          {expandedAgents.has(agent.id) ? (
                            <ChevronDownIcon className="h-3 w-3 text-gray-400 mr-1" />
                          ) : (
                            <ChevronRightIcon className="h-3 w-3 text-gray-400 mr-1" />
                          )}
                          <span className="mr-2 text-sm">🤖</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {agent.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <span className="mr-2">{getStatusIcon(agent.status)}</span>
                              <span className="truncate" title={agent.workingDirectory}>
                                {agent.workingDirectory.split('/').pop()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sessions Level */}
                      {expandedAgents.has(agent.id) && agent.sessions && (
                        <div className="ml-6 space-y-1">
                          {agent.sessions.map((session) => (
                            <div
                              key={session.id}
                              className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedSessionId === session.id
                                  ? 'bg-blue-100 border border-blue-200'
                                  : 'hover:bg-gray-100'
                              }`}
                              onClick={() => onSelectSession?.(session.id)}
                            >
                              <span className="mr-2 text-sm">📋</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-800 truncate">
                                  {session.name}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center justify-between">
                                  <span className="flex items-center">
                                    {getStatusIcon(session.status)}
                                    <span className="ml-1">{session.eventCount} events</span>
                                  </span>
                                  <span>{formatRelativeTime(session.startTime)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {agent.sessions.length === 0 && (
                            <div className="text-xs text-gray-400 italic p-2">
                              No sessions yet
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {computer.agents.length === 0 && (
                    <div className="text-xs text-gray-400 italic p-2">
                      No agents running
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};