import { Request, Response } from 'express';
import db from '../db';
import os from 'os';

export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const dbStart = Date.now();
    await db.raw('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    const prepTimeData = await db('orders')
      .whereRaw("created_at > NOW() - INTERVAL '6 hours'")
      .whereNotNull('completed_at')
      .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_mins'))
      .first() as { avg_mins: string | number } | undefined;
    
    const avgPrepTime = parseFloat(String(prepTimeData?.avg_mins || 0));
    const failureRisk = avgPrepTime > 30 ? 'High' : avgPrepTime > 20 ? 'Moderate' : 'Low';

    const systemMetrics = {
      cpuLoad: os.loadavg()[0],
      memoryUsage: (1 - os.freemem() / os.totalmem()) * 100,
      uptime: os.uptime(),
      dbLatency,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      platform: os.platform(),
      cpus: os.cpus().length
    };

    const hourlyOrders = await db('orders')
      .whereRaw("created_at > NOW() - INTERVAL '24 hours'")
      .select(db.raw("to_char(created_at, 'HH24:00') as hour"))
      .count('id as count')
      .groupBy('hour')
      .orderBy('hour', 'asc');

    const totalOrders = await db('orders').count('id as total').first() as { total: string | number } | undefined;
    const completedOrders = await db('orders').whereNotNull('completed_at').count('id as count').first() as { count: string | number } | undefined;
    const pendingOrders = await db('orders').whereNull('completed_at').count('id as count').first() as { count: string | number } | undefined;

    const totalCount = Number(totalOrders?.total) || 0;
    const completedCount = Number(completedOrders?.count) || 0;
    const pendingCount = Number(pendingOrders?.count) || 0;
    const completionRate = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(2) : '0.00';

    res.json({
      status: dbLatency < 200 ? 'Optimal' : dbLatency < 500 ? 'Good' : 'Degraded',
      timestamp: new Date().toISOString(),
      metrics: systemMetrics,
      predictions: {
        prepTimeRisk: failureRisk,
        avgPrepTime: avgPrepTime.toFixed(2),
        recommendation: failureRisk === 'High' ? 'Increase Kitchen Staff' : failureRisk === 'Moderate' ? 'Monitor Kitchen Load' : 'System Stable',
        estimatedServiceDegradation: failureRisk === 'High' ? 'Likely' : failureRisk === 'Moderate' ? 'Possible' : 'Unlikely'
      },
      graphData: hourlyOrders,
      orderStats: {
        total: totalCount,
        completed: completedCount,
        pending: pendingCount,
        completionRate
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'Critical', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

export const getSystemMetricsHistory = async (req: Request, res: Response) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    
    const metricsHistory = await db('orders')
      .whereRaw(`created_at > NOW() - INTERVAL '${hours} hours'`)
      .select(
        db.raw(`DATE_TRUNC('hour', created_at) as hour`),
        db.raw('COUNT(*) as order_count'),
        db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_prep_time')
      )
      .groupBy(db.raw("DATE_TRUNC('hour', created_at)"))
      .orderBy('hour', 'asc');

    res.json({
      hours,
      data: metricsHistory,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'Error', 
      message: error.message 
    });
  }
};

export const getDatabaseMetrics = async (req: Request, res: Response) => {
  try {
    const dbStart = Date.now();
    await db.raw('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    const tableSizes = await db.raw(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    const connectionStats = await db.raw(`
      SELECT 
        datname,
        numbackends as active_connections,
        pg_database.datsize
      FROM pg_database
      WHERE datname LIKE '%xyz%' OR datname LIKE '%maria%' OR datname LIKE '%pos%'
    `);

    res.json({
      latency: dbLatency,
      tables: tableSizes.rows || [],
      connections: connectionStats.rows || [],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'Error', 
      message: error.message 
    });
  }
};

export const getPerformanceAlerts = async (req: Request, res: Response) => {
  try {
    const alerts: any[] = [];

    const dbStart = Date.now();
    await db.raw('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    if (dbLatency > 500) {
      alerts.push({
        severity: 'HIGH',
        message: `Database latency is ${dbLatency}ms - consider optimization`,
        timestamp: new Date().toISOString()
      });
    }

    const cpuLoad = os.loadavg()[0];
    const cpuThreshold = os.cpus().length;
    if (cpuLoad > cpuThreshold) {
      alerts.push({
        severity: 'HIGH',
        message: `CPU load (${cpuLoad.toFixed(2)}) exceeds threshold (${cpuThreshold})`,
        timestamp: new Date().toISOString()
      });
    }

    const memoryUsage = (1 - os.freemem() / os.totalmem()) * 100;
    if (memoryUsage > 85) {
      alerts.push({
        severity: 'MEDIUM',
        message: `Memory usage is ${memoryUsage.toFixed(2)}% - consider clearing cache`,
        timestamp: new Date().toISOString()
      });
    }

    const pendingOrders = await db('orders')
      .whereNull('completed_at')
      .count('id as count')
      .first() as { count: string | number } | undefined;

    const pendingCount = Number(pendingOrders?.count) || 0;
    if (pendingCount > 50) {
      alerts.push({
        severity: 'MEDIUM',
        message: `${pendingCount} pending orders - kitchen may be overwhelmed`,
        timestamp: new Date().toISOString()
      });
    }

    const stalledOrders = await db('orders')
      .whereNull('completed_at')
      .whereRaw("created_at < NOW() - INTERVAL '2 hours'")
      .count('id as count')
      .first() as { count: string | number } | undefined;

    const stalledCount = Number(stalledOrders?.count) || 0;
    if (stalledCount > 0) {
      alerts.push({
        severity: 'HIGH',
        message: `${stalledCount} orders stalled for over 2 hours`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      alerts,
      alertCount: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'Error', 
      message: error.message 
    });
  }
};
