import React, { useState, useEffect } from 'react';
import { EventControl } from './EventControl';

interface HookEvent {
  agentId: string;
  sessionId: string;
  hookType: string;
  timestamp: string;
  data: any;
}

interface SessionEventViewProps {
  sessionId: string;
  agentId?: string;
}

export const SessionEventView: React.FC<SessionEventViewProps> = ({
  sessionId,
  agentId
}) => {
  const [events, setEvents] = useState<HookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      
      // Fetch session info
      const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
      const session = await sessionResponse.json();
      setSessionInfo(session);
      
      // Fetch session events
      const eventsResponse = await fetch(`/api/sessions/${sessionId}/events`);
      const sessionEvents = await eventsResponse.json();
      setEvents(sessionEvents);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch session data:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Session not found
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white overflow-hidden">
      {/* Session Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {sessionInfo.name}
            </h1>
            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
              <span>
                📋 Session: {sessionInfo.id.substring(0, 8)}...
              </span>
              <span>
                🤖 Agent: {agentId?.substring(0, 12)}...
              </span>
              <span>
                📁 {sessionInfo.workingDirectory.split('/').pop()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${\n              sessionInfo.status === 'active'\n                ? 'bg-green-100 text-green-800'\n                : sessionInfo.status === 'completed'\n                ? 'bg-gray-100 text-gray-800'\n                : 'bg-red-100 text-red-800'\n            }`}>\n              {sessionInfo.status === 'active' && '🟢'}\n              {sessionInfo.status === 'completed' && '✅'}\n              {sessionInfo.status === 'interrupted' && '⚠️'}\n              <span className=\"ml-1 capitalize\">{sessionInfo.status}</span>\n            </div>\n            <div className=\"mt-1 text-xs text-gray-500\">\n              Duration: {formatDuration(sessionInfo.startTime, sessionInfo.endTime)}\n            </div>\n          </div>\n        </div>\n      </div>\n\n      {/* Events List */}\n      <div className=\"flex-1 overflow-y-auto\">\n        {events.length === 0 ? (\n          <div className=\"text-center py-12 text-gray-500\">\n            <div className=\"text-4xl mb-4\">📝</div>\n            <h3 className=\"text-lg font-medium text-gray-900 mb-2\">No events yet</h3>\n            <p>Events will appear here as the agent works</p>\n          </div>\n        ) : (\n          <div className=\"space-y-4 p-6\">\n            {events.map((event, index) => (\n              <div key={`${event.sessionId}-${index}`} className=\"border border-gray-200 rounded-lg\">\n                <div className=\"flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50\">\n                  <div className=\"flex items-center space-x-3\">\n                    <div className=\"text-sm font-medium text-gray-900\">\n                      {event.hookType.replace('_', ' ').toUpperCase()}\n                    </div>\n                    {event.data?.toolName && (\n                      <div className=\"text-sm text-gray-500\">\n                        Tool: <span className=\"font-mono\">{event.data.toolName}</span>\n                      </div>\n                    )}\n                  </div>\n                  <div className=\"text-xs text-gray-500\">\n                    {formatTimestamp(event.timestamp)}\n                  </div>\n                </div>\n                \n                <div className=\"p-4\">\n                  <EventControl\n                    event={event}\n                    onApprove={(reason, feedback) => {\n                      console.log('Approve:', reason, feedback);\n                    }}\n                    onDeny={(reason, feedback) => {\n                      console.log('Deny:', reason, feedback);\n                    }}\n                    onInjectContext={(context) => {\n                      console.log('Inject context:', context);\n                    }}\n                  />\n                </div>\n              </div>\n            ))}\n          </div>\n        )}\n      </div>\n    </div>\n  );\n};