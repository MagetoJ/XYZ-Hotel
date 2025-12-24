import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
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

export default function MonitoringDisplay() {
  const [data, setData] = useState<HealthData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [displayMode, setDisplayMode] = useState<'metrics' | 'prediction'>('metrics');
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const fetchHealthData = async () => {
    try {
      const res = await apiClient.get('/api/monitoring/health');
      if (res.ok) {
        const healthData = await res.json();
        setData(healthData);

        const alertsRes = await apiClient.get('/api/monitoring/alerts');
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData);

          if (alertsData.some((a: Alert) => a.severity === 'HIGH')) {
            const highAlert = alertsData.find((a: Alert) => a.severity === 'HIGH');
            handleCriticalAlert(highAlert);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch health data:', err);
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

  const getRiskColor = (risk: string) => {
    if (risk === 'High') return 'bg-red-900 text-white';
    if (risk === 'Moderate') return 'bg-yellow-600 text-white';
    return 'bg-green-900 text-white';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Optimal') return 'bg-green-900 text-white';
    if (status === 'Good') return 'bg-blue-900 text-white';
    if (status === 'Degraded') return 'bg-yellow-900 text-white';
    return 'bg-red-900 text-white';
  };

  if (!data) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading system data...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <div>
          <h1 className="text-3xl font-bold">🏨 XYZ Hotel - System Monitoring</h1>
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
            <h2 className={`text-5xl font-bold mb-4 ${getRiskColor(data.predictions.prepTimeRisk)}`}>
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

      <div className="p-4 border-t border-gray-700 text-center text-xs text-gray-500">
        <button
          onClick={() => setDisplayMode(displayMode === 'metrics' ? 'prediction' : 'metrics')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Switch to {displayMode === 'metrics' ? 'Prediction' : 'Metrics'} View
        </button>
        <p className="mt-2">Auto-refresh every 10 seconds | Thermal alerts enabled</p>
      </div>
    </div>
  );
}
