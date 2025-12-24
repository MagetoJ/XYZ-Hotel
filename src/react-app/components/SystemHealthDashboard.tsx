import React, { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Lock, RotateCcw, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { apiClient } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface HealthData {
  status: string;
  timestamp: string;
  metrics: {
    cpuLoad: number;
    memoryUsage: number;
    uptime: number;
    dbLatency: number;
    totalMemory: number;
    freeMemory: number;
    platform: string;
    cpus: number;
  };
  predictions: {
    prepTimeRisk: string;
    avgPrepTime: string;
    recommendation: string;
    estimatedServiceDegradation: string;
  };
  graphData: any[];
  orderStats: {
    total: number;
    completed: number;
    pending: number;
    completionRate: string;
  };
}

interface Alert {
  severity: string;
  message: string;
  timestamp: string;
}

interface Staff {
  id: number;
  username: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface AuditLog {
  id: number;
  action: string;
  admin_username: string;
  target_username: string;
  details: string;
  created_at: string;
}

const SystemHealthDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<HealthData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [displayMode, setDisplayMode] = useState<'metrics' | 'prediction'>('metrics');
  const [wsConnected, setWsConnected] = useState(false);
  const [staffSalesData, setStaffSalesData] = useState<any[]>([]);
  const [profitabilityData, setProfitabilityData] = useState<any>(null);
  const [inventoryVelocity, setInventoryVelocity] = useState<any[]>([]);
  const [advancedMetrics, setAdvancedMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await apiClient.get('/api/monitoring/health');

      if (res.ok) {
        const healthData = await res.json();
        setData(healthData);
        setError(null);
      } else {
        setError('Failed to fetch health data');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching health data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await apiClient.get('/api/monitoring/alerts');

      if (res.ok) {
        const alertsData = await res.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await apiClient.get('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await apiClient.get('/api/staff/audit/logs?limit=20');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const fetchAdvancedMetrics = async () => {
    try {
      setMetricsLoading(true);
      const [metricsRes, staffRes, profitRes, inventoryRes] = await Promise.all([
        apiClient.get('/api/monitoring/advanced-metrics'),
        apiClient.get('/api/monitoring/staff-sales'),
        apiClient.get('/api/monitoring/profitability'),
        apiClient.get('/api/monitoring/inventory-velocity')
      ]);

      if (metricsRes.ok) {
        setAdvancedMetrics(await metricsRes.json());
      }
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffSalesData(staffData.distribution || []);
      }
      if (profitRes.ok) {
        setProfitabilityData(await profitRes.json());
      }
      if (inventoryRes.ok) {
        const invData = await inventoryRes.json();
        setInventoryVelocity(invData.velocity || []);
      }
    } catch (err) {
      console.error('Failed to fetch advanced metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) {
      setResetError('Please select a user and enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await apiClient.post('/api/staff/reset-password', {
        userId: selectedUser.id,
        newPassword
      });

      if (res.ok) {
        setResetSuccess(true);
        setResetError('');
        setNewPassword('');
        setSelectedUser(null);
        setShowPasswordReset(false);
        setTimeout(() => setResetSuccess(false), 3000);
        fetchAuditLogs();
      } else {
        const data = await res.json();
        setResetError(data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setResetError(err.message || 'Error resetting password');
    }
  };

  const handleCriticalAlert = (alert: Alert) => {
    console.log('🚨 Critical alert received:', alert);
    setAlerts((prev) => [alert, ...prev.slice(0, 4)]);
  };

  const triggerThermalPrint = (alert: Alert) => {
    const printWindow = window.open('', '', 'width=80,height=120');
    if (printWindow) {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: monospace; width: 80mm; margin: 0; padding: 5px; }
              .alert { text-align: center; font-weight: bold; }
              .time { font-size: 10px; text-align: center; }
              hr { border: 1px dashed #000; }
            </style>
          </head>
          <body>
            <div class="alert">⚠️ SYSTEM ALERT ⚠️</div>
            <hr/>
            <div class="time">${new Date(alert.timestamp).toLocaleTimeString()}</div>
            <p style="text-align: center; font-weight: bold;">${alert.message}</p>
            <div class="time">Severity: ${alert.severity}</div>
            <hr/>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchAlerts();
    fetchAdvancedMetrics();
    if (user?.role === 'superadmin') {
      fetchStaffList();
      fetchAuditLogs();
    }

    const interval = setInterval(() => {
      fetchHealth();
      fetchAlerts();
      fetchAdvancedMetrics();
      if (user?.role === 'superadmin') {
        fetchAuditLogs();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, user?.role]);

  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/monitoring`);

      ws.onopen = () => {
        console.log('📊 Connected to monitoring WebSocket');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'CRITICAL_ALERT') {
            handleCriticalAlert(message);
            triggerThermalPrint(message);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWebSocket, 5000);
      };
    };

    connectWebSocket();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        No system data available
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    if (risk === 'High') return 'bg-red-100 text-red-800 border-red-300';
    if (risk === 'Moderate') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getRiskColorFullscreen = (risk: string) => {
    if (risk === 'High') return 'bg-red-900 text-white';
    if (risk === 'Moderate') return 'bg-yellow-600 text-white';
    return 'bg-green-900 text-white';
  };

  const getStatusIcon = (status: string) => {
    return status === 'Optimal' || status === 'Good' ? (
      <CheckCircle className="w-6 h-6 text-green-600" />
    ) : (
      <AlertTriangle className="w-6 h-6 text-red-600" />
    );
  };

  const getStatusColor = (status: string) => {
    if (status === 'Optimal') return 'bg-green-900 text-white';
    if (status === 'Good') return 'bg-blue-900 text-white';
    if (status === 'Degraded') return 'bg-yellow-900 text-white';
    return 'bg-red-900 text-white';
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (fullscreenMode) {
    return (
      <div className="w-screen h-screen bg-black text-white overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h1 className="text-3xl font-bold">🏨 System Monitoring</h1>
            <p className="text-sm text-gray-400">
              {new Date(data.timestamp).toLocaleString()}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg text-lg font-bold ${getStatusColor(data.status)}`}>
            {data.status}
          </div>
          <div className={`px-3 py-1 text-xs rounded ${wsConnected ? 'bg-green-600' : 'bg-red-600'}`}>
            {wsConnected ? '🟢 Connected' : '🔴 Offline'}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {displayMode === 'metrics' ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4">System Metrics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>CPU Load:</span>
                    <span className={data.metrics.cpuLoad > 80 ? 'text-red-400' : 'text-green-400'}>
                      {(data.metrics.cpuLoad * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Memory:</span>
                    <span className={data.metrics.memoryUsage > 85 ? 'text-red-400' : 'text-green-400'}>
                      {data.metrics.memoryUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>DB Latency:</span>
                    <span className={data.metrics.dbLatency > 500 ? 'text-red-400' : 'text-green-400'}>
                      {data.metrics.dbLatency}ms
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Order Statistics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>Total Orders:</span>
                    <span className="text-blue-400">{data.orderStats.total}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Completed:</span>
                    <span className="text-green-400">{data.orderStats.completed}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Pending:</span>
                    <span className={data.orderStats.pending > 5 ? 'text-red-400' : 'text-yellow-400'}>
                      {data.orderStats.pending}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t border-gray-600">
                    <span>Completion Rate:</span>
                    <span className="text-cyan-400 font-bold">{data.orderStats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 p-8 rounded-lg border-4 border-yellow-600 text-center">
              <TrendingUp className="w-24 h-24 mx-auto mb-4 text-yellow-400" />
              <h2 className={`text-5xl font-bold mb-4 ${getRiskColorFullscreen(data.predictions.prepTimeRisk)}`}>
                {data.predictions.prepTimeRisk} RISK
              </h2>
              <p className="text-2xl mb-4">Avg Prep Time: {data.predictions.avgPrepTime} min</p>
              <p className="text-xl mb-2 text-blue-300">{data.predictions.recommendation}</p>
              <p className="text-lg text-red-300">
                Service Degradation: {data.predictions.estimatedServiceDegradation}
              </p>
            </div>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="bg-gray-900 border-t border-gray-700 p-4 max-h-32 overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">🚨 Active Alerts</h3>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`p-2 rounded text-sm ${
                  alert.severity === 'HIGH' ? 'bg-red-900 text-red-100' : 'bg-yellow-900 text-yellow-100'
                }`}>
                  [{new Date(alert.timestamp).toLocaleTimeString()}] {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-gray-700 text-center text-xs text-gray-500 flex justify-center gap-4">
          <button
            onClick={() => setDisplayMode(displayMode === 'metrics' ? 'prediction' : 'metrics')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Switch to {displayMode === 'metrics' ? 'Prediction' : 'Metrics'} View
          </button>
          <button
            onClick={() => setFullscreenMode(false)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2"
          >
            <Minimize2 className="w-4 h-4" />
            Exit Fullscreen
          </button>
          <p>Auto-refresh every 10 seconds | Thermal alerts enabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">System Performance & Monitoring</h2>
        <div className="flex items-center gap-4">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value={10000}>Refresh: 10s</option>
            <option value={30000}>Refresh: 30s</option>
            <option value={60000}>Refresh: 1m</option>
          </select>
          <button
            onClick={() => {
              fetchHealth();
              fetchAlerts();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh Now
          </button>
          <button
            onClick={() => setFullscreenMode(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            Fullscreen Display
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">System Status</h3>
            <p className="text-gray-600 mt-2">
              {data.status === 'Optimal'
                ? 'All systems operating normally'
                : data.status === 'Good'
                ? 'Systems operating with minor delays'
                : 'System performance degraded - attention required'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusIcon(data.status)}
            <span className={`text-2xl font-bold ${data.status === 'Optimal' || data.status === 'Good' ? 'text-green-600' : 'text-red-600'}`}>
              {data.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600">Database Latency</h4>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.metrics.dbLatency}ms</p>
          <p className={`text-xs mt-2 ${data.metrics.dbLatency < 200 ? 'text-green-600' : data.metrics.dbLatency < 500 ? 'text-yellow-600' : 'text-red-600'}`}>
            {data.metrics.dbLatency < 200 ? 'Excellent' : data.metrics.dbLatency < 500 ? 'Good' : 'Slow'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600">Memory Usage</h4>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.metrics.memoryUsage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-2">
            {formatBytes(data.metrics.freeMemory)} / {formatBytes(data.metrics.totalMemory)} free
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600">CPU Load</h4>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.metrics.cpuLoad.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">{data.metrics.cpus} CPU(s)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600">Uptime</h4>
            <Clock className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-lg font-bold text-gray-800">{formatUptime(data.metrics.uptime)}</p>
          <p className="text-xs text-gray-500 mt-2">{data.metrics.platform}</p>
        </div>
      </div>

      <div className={`p-6 rounded-lg border-2 ${getRiskColor(data.predictions.prepTimeRisk)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">Failure Prediction Analysis</h3>
            <p className="mb-4">{data.predictions.recommendation}</p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Risk Level:</strong> {data.predictions.prepTimeRisk}
              </p>
              <p>
                <strong>Avg Prep Time:</strong> {data.predictions.avgPrepTime} minutes
              </p>
              <p>
                <strong>Estimated Degradation:</strong> {data.predictions.estimatedServiceDegradation}
              </p>
            </div>
          </div>
          {data.predictions.prepTimeRisk === 'High' && (
            <AlertTriangle className="w-12 h-12 opacity-50" />
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'HIGH'
                    ? 'bg-red-50 border-red-400'
                    : alert.severity === 'MEDIUM'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-semibold ${alert.severity === 'HIGH' ? 'text-red-800' : alert.severity === 'MEDIUM' ? 'text-yellow-800' : 'text-blue-800'}`}>
                      {alert.severity}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">24h Order Traffic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.graphData}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrders)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Order Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{data.orderStats.total}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{data.orderStats.completed}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{data.orderStats.pending}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{data.orderStats.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {profitabilityData && profitabilityData.daily && profitabilityData.daily.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Efficiency vs. Load (Prep Time Trend)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={profitabilityData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" barSize={20} fill="#8884d8" name="Orders" />
                <Line yAxisId="right" type="monotone" dataKey="netRevenue" stroke="#ff7300" name="Net Revenue" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {staffSalesData && staffSalesData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Staff Sales Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={staffSalesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                >
                  {staffSalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Resource Saturation (System Health)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={[
              {
                name: 'System',
                CPU: Math.min(data.metrics.cpuLoad * 100, 100),
                Memory: data.metrics.memoryUsage,
                'DB Latency': Math.min((data.metrics.dbLatency / 500) * 100, 100)
              }
            ]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Load" dataKey="CPU" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Radar name="Memory" dataKey="Memory" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
              <Radar name="DB Latency" dataKey="DB Latency" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {inventoryVelocity && inventoryVelocity.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Inventory Velocity (Stock Depletion Rate)</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {inventoryVelocity.slice(0, 8).map((item: any, idx: number) => (
                <div key={idx} className="p-3 border-l-4 rounded" style={{
                  borderColor: item.status === 'URGENT' ? '#ef4444' : item.status === 'SOON' ? '#eab308' : '#22c55e'
                }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{item.itemName}</p>
                      <p className="text-sm text-gray-600">Daily Usage: {item.dailyUsage} units</p>
                      <p className="text-sm text-gray-600">Days until depletion: <span className="font-bold">{item.daysUntilDepletion}</span></p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-bold ${
                      item.status === 'URGENT' ? 'bg-red-100 text-red-800' : 
                      item.status === 'SOON' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-gray-500 mt-8">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>

      {user?.role === 'superadmin' && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg shadow-xl p-6 text-white mt-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Superadmin Control Panel
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">User Password Recovery</h4>
                <RotateCcw className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Reset forgotten user passwords. Changes are logged in the audit trail.
              </p>
              <button
                onClick={() => {
                  setShowPasswordReset(!showPasswordReset);
                  setResetError('');
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                {showPasswordReset ? 'Hide Password Reset' : 'Reset User Password'}
              </button>

              {showPasswordReset && (
                <div className="mt-4 space-y-4 p-4 bg-slate-800 rounded-lg">
                  {resetSuccess && (
                    <div className="p-3 bg-green-600 text-white rounded-lg text-sm">
                      ✓ Password reset successfully!
                    </div>
                  )}
                  {resetError && (
                    <div className="p-3 bg-red-600 text-white rounded-lg text-sm">
                      ✗ {resetError}
                    </div>
                  )}
                  
                  <select
                    value={selectedUser?.id || ''}
                    onChange={(e) => {
                      const userId = parseInt(e.target.value);
                      const user = staffList.find(s => s.id === userId);
                      setSelectedUser(user || null);
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg"
                  >
                    <option value="">Select a user...</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} (@{staff.username}) - {staff.role}
                      </option>
                    ))}
                  </select>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg placeholder-gray-400"
                  />

                  <button
                    onClick={handlePasswordReset}
                    disabled={!selectedUser || !newPassword}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Reset Password
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Audit Logs</h4>
                <Eye className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 mb-4">
                View system actions performed by administrators.
              </p>
              <button
                onClick={() => {
                  setShowAuditLogs(!showAuditLogs);
                  if (!showAuditLogs) fetchAuditLogs();
                }}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                {showAuditLogs ? 'Hide Audit Logs' : 'View Audit Logs'}
              </button>

              {showAuditLogs && (
                <div className="mt-4 space-y-2 max-h-80 overflow-y-auto p-4 bg-slate-800 rounded-lg">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-gray-400">No audit logs available</p>
                  ) : (
                    auditLogs.map(log => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-700 rounded-lg border-l-2 border-blue-500 text-sm"
                      >
                        <p className="font-semibold text-blue-300">{log.action}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          By: {log.admin_username || 'System'} → Target: {log.target_username || 'N/A'}
                        </p>
                        {log.details && (
                          <p className="text-xs text-gray-400 mt-1">{log.details}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Profitability Analytics</h4>
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Compare total sales, tips, and service charges for hotel-wide financial health.
              </p>
              {profitabilityData && profitabilityData.totals && (
                <div className="space-y-3 p-4 bg-slate-800 rounded-lg">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-600">
                    <span className="text-gray-300">Total Orders</span>
                    <span className="font-bold text-xl">{profitabilityData.totals.totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-600">
                    <span className="text-gray-300">Total Sales</span>
                    <span className="font-bold text-green-400 text-xl">${profitabilityData.totals.totalSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-600">
                    <span className="text-gray-300">Total Tips & Service Charge</span>
                    <span className="font-bold text-blue-400 text-xl">${profitabilityData.totals.totalTips.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-600">
                    <span className="text-gray-300">Total Discounts</span>
                    <span className="font-bold text-yellow-400 text-xl">-${profitabilityData.totals.totalDiscounts.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-200 font-semibold">Net Revenue</span>
                    <span className="font-bold text-cyan-300 text-2xl">${profitabilityData.totals.totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Advanced DB Metrics</h4>
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Cache hit ratio, slowest queries, and table bloat analysis.
              </p>
              {advancedMetrics && (
                <div className="space-y-3 p-4 bg-slate-800 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Cache Hit Ratio</span>
                    <span className={`font-bold ${advancedMetrics.cacheMetrics?.hitRatio > 90 ? 'text-green-400' : advancedMetrics.cacheMetrics?.hitRatio > 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {advancedMetrics.cacheMetrics?.hitRatio.toFixed(2)}%
                    </span>
                  </div>
                  {advancedMetrics.topQueries && advancedMetrics.topQueries.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-gray-300 font-semibold mb-2">Top Slowest Queries (5)</p>
                      {advancedMetrics.topQueries.slice(0, 3).map((q: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-400 mb-2 truncate" title={q.query}>
                          <span className="text-blue-300">{q.totalTime}ms</span> - {q.query}
                        </div>
                      ))}
                    </div>
                  )}
                  {advancedMetrics.bloatAnalysis && advancedMetrics.bloatAnalysis.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-gray-300 font-semibold mb-2">Table Status</p>
                      {advancedMetrics.bloatAnalysis.slice(0, 2).map((b: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-400 mb-1">
                          <span className="text-cyan-300">{b.table}</span> <span className={b.recommendation === 'VACUUM REQUIRED' ? 'text-red-400' : 'text-green-400'}>{b.recommendation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Inventory Depletion Forecast</h4>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Critical items running out soon based on current consumption rates.
            </p>
            {inventoryVelocity && inventoryVelocity.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryVelocity.slice(0, 9).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      item.status === 'URGENT'
                        ? 'bg-red-900/20 border-red-500'
                        : item.status === 'SOON'
                        ? 'bg-yellow-900/20 border-yellow-500'
                        : 'bg-green-900/20 border-green-500'
                    }`}
                  >
                    <p className="font-semibold text-white truncate">{item.itemName}</p>
                    <p className="text-xs text-gray-300 mt-1">Current: {item.currentQty} units</p>
                    <p className="text-xs text-gray-300">Daily Usage: {item.dailyUsage}</p>
                    <p className={`text-sm font-bold mt-2 ${
                      item.status === 'URGENT'
                        ? 'text-red-300'
                        : item.status === 'SOON'
                        ? 'text-yellow-300'
                        : 'text-green-300'
                    }`}>
                      {item.daysUntilDepletion} days left
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No inventory data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthDashboard;
