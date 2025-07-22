import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { apiClient } from '@/services/api-client';
import toast from 'react-hot-toast';

export function Settings() {
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setSaving] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await apiClient.healthCheck();
      setIsConnected(connected);
      
      if (connected) {
        toast.success('Connection successful');
      } else {
        toast.error('Connection failed');
      }
    } catch (error) {
      setIsConnected(false);
      toast.error('Connection failed');
    } finally {
      setIsChecking(false);
    }
  };

  const generateToken = async () => {
    setSaving(true);
    try {
      const response = await apiClient.getDashboardToken();
      setToken(response.token);
      localStorage.setItem('dashboard_token', response.token);
      toast.success('Token generated successfully');
    } catch (error) {
      toast.error('Failed to generate token');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('server_url', serverUrl);
    if (token) {
      localStorage.setItem('dashboard_token', token);
    }
    toast.success('Settings saved');
  };

  useEffect(() => {
    // Load saved settings
    const savedUrl = localStorage.getItem('server_url');
    const savedToken = localStorage.getItem('dashboard_token');
    
    if (savedUrl) setServerUrl(savedUrl);
    if (savedToken) setToken(savedToken);

    // Check initial connection
    checkConnection();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">
          Configure your Claude Code Companion dashboard
        </p>
      </div>

      {/* Connection Status */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-500" />
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Server Connection
              </h3>
              <p className="text-sm text-gray-600">
                {isConnected ? 'Connected to server' : 'Unable to connect to server'}
              </p>
            </div>
          </div>
          
          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="btn btn-secondary px-4 py-2"
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Test Connection
          </button>
        </div>
      </div>

      {/* Server Configuration */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Server Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700">
              Server URL
            </label>
            <input
              type="url"
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="http://localhost:3000"
            />
            <p className="mt-1 text-sm text-gray-500">
              The URL where your Claude Code Companion server is running
            </p>
          </div>

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Dashboard Token
            </label>
            <div className="mt-1 flex space-x-2">
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Generate or enter token"
              />
              <button
                onClick={generateToken}
                disabled={isSaving}
                className="btn btn-secondary px-4 py-2 whitespace-nowrap"
              >
                {isSaving ? 'Generating...' : 'Generate'}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Authentication token for dashboard access (optional for Phase 1)
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={saveSettings}
            className="btn btn-primary px-6 py-2"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Agent Installation
        </h3>
        
        <div className="bg-gray-50 rounded-md p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">To start monitoring your Claude Code sessions:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Install the agent globally: <code className="bg-gray-200 px-1 rounded">npm install -g claude-companion-agent</code></li>
                <li>Install hooks: <code className="bg-gray-200 px-1 rounded">claude-companion-agent install --server-url {serverUrl}</code></li>
                <li>Your Claude Code sessions will now send monitoring events to this dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1 Notice */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Phase 1 - Monitoring Only</p>
            <p>
              This is the Phase 1 release focused on monitoring capabilities. 
              Remote control features (approve/deny, context injection, session control) 
              will be available in Phase 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}