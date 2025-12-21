import React, { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { apiClient } from '../config/api';

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

const SystemHealthDashboard = () => {
  const [data, setData] = useState<HealthData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);

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

  useEffect(() => {
    fetchHealth();
    fetchAlerts();

    const interval = setInterval(() => {
      fetchHealth();
      fetchAlerts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

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

  const getStatusIcon = (status: string) => {
    return status === 'Optimal' || status === 'Good' ? (
      <CheckCircle className="w-6 h-6 text-green-600" />
    ) : (
      <AlertTriangle className="w-6 h-6 text-red-600" />
    );
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

      <div className="text-center text-sm text-gray-500 mt-8">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default SystemHealthDashboard;
