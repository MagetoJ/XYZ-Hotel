import { Request, Response } from 'express';
import db from '../db';
import os from 'os';

export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const dbStart = Date.now();
    await db.raw('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    let avgPrepTime = 0;
    let hourlyOrders: any[] = [];
    let totalCount = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let completionRate = '0.00';
    let warnings: string[] = [];

    try {
      const prepTimeData = await db('orders')
        .whereRaw("created_at > NOW() - INTERVAL '6 hours'")
        .whereNotNull('completed_at')
        .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_mins'))
        .first() as { avg_mins: string | number } | undefined;
      
      avgPrepTime = parseFloat(String(prepTimeData?.avg_mins || 0));
    } catch (e: any) {
      warnings.push('Could not calculate preparation time: ' + e.message);
      avgPrepTime = 0;
    }

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

    try {
      hourlyOrders = await db('orders')
        .whereRaw("created_at > NOW() - INTERVAL '24 hours'")
        .select(db.raw("to_char(created_at, 'HH24:00') as hour"))
        .count('id as count')
        .groupBy('hour')
        .orderBy('hour', 'asc');
    } catch (e: any) {
      warnings.push('Could not fetch hourly order data: ' + e.message);
      hourlyOrders = [];
    }

    try {
      const totalOrders = await db('orders').count('id as total').first() as { total: string | number } | undefined;
      const completedOrders = await db('orders').whereNotNull('completed_at').count('id as count').first() as { count: string | number } | undefined;
      const pendingOrders = await db('orders').whereNull('completed_at').count('id as count').first() as { count: string | number } | undefined;

      totalCount = Number(totalOrders?.total) || 0;
      completedCount = Number(completedOrders?.count) || 0;
      pendingCount = Number(pendingOrders?.count) || 0;
      completionRate = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(2) : '0.00';
    } catch (e: any) {
      warnings.push('Could not fetch order statistics: ' + e.message);
      totalCount = 0;
      completedCount = 0;
      pendingCount = 0;
      completionRate = '0.00';
    }

    const responseData: any = {
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
    };

    if (warnings.length > 0) {
      responseData.warnings = warnings;
    }

    res.json(responseData);
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
    
    let metricsHistory: any[] = [];
    let warnings: string[] = [];

    try {
      metricsHistory = await db('orders')
        .whereRaw(`created_at > NOW() - INTERVAL '${hours} hours'`)
        .select(
          db.raw(`DATE_TRUNC('hour', created_at) as hour`),
          db.raw('COUNT(*) as order_count'),
          db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_prep_time')
        )
        .groupBy(db.raw("DATE_TRUNC('hour', created_at)"))
        .orderBy('hour', 'asc');
    } catch (e: any) {
      warnings.push('Could not fetch detailed metrics history: ' + e.message);
      try {
        metricsHistory = await db('orders')
          .whereRaw(`created_at > NOW() - INTERVAL '${hours} hours'`)
          .select(
            db.raw(`DATE_TRUNC('hour', created_at) as hour`),
            db.raw('COUNT(*) as order_count')
          )
          .groupBy(db.raw("DATE_TRUNC('hour', created_at)"))
          .orderBy('hour', 'asc');
      } catch (fallbackError: any) {
        warnings.push('Could not fetch any metrics history: ' + fallbackError.message);
        metricsHistory = [];
      }
    }

    const responseData: any = {
      hours,
      data: metricsHistory,
      timestamp: new Date().toISOString()
    };

    if (warnings.length > 0) {
      responseData.warnings = warnings;
    }

    res.json(responseData);
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

    let tableSizes: any[] = [];
    let connectionStats: any[] = [];
    let warnings: string[] = [];

    try {
      const tableSizesResult = await db.raw(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      tableSizes = tableSizesResult.rows || [];
    } catch (tableError: any) {
      warnings.push('Cannot access table size metrics: ' + tableError.message);
      try {
        const tableNames = await db.raw(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        tableSizes = tableNames.rows?.map((row: any) => ({
          tablename: row.table_name,
          schemaname: 'public',
          size: 'N/A (insufficient permissions)'
        })) || [];
      } catch (e) {
        warnings.push('Cannot list tables from information_schema');
      }
    }

    try {
      const connResult = await db.raw(`
        SELECT 
          datname,
          numbackends as active_connections,
          pg_database_size(datname) as datsize
        FROM pg_database
        WHERE datname = current_database()
      `);
      connectionStats = connResult.rows || [];
    } catch (connError: any) {
      warnings.push('Cannot access connection statistics: ' + connError.message);
      try {
        const currentDb = await db.raw('SELECT current_database() as db');
        connectionStats = [{
          datname: currentDb.rows?.[0]?.db || 'unknown',
          active_connections: 'N/A (insufficient permissions)',
          datsize: 'N/A (insufficient permissions)'
        }];
      } catch (e) {
        warnings.push('Cannot determine current database');
      }
    }

    res.json({
      latency: dbLatency,
      tables: tableSizes,
      connections: connectionStats,
      warnings: warnings.length > 0 ? warnings : undefined,
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
    if (cpuLoad > cpuThreshold && cpuLoad > 0) {
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

    try {
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
    } catch (e: any) {
      alerts.push({
        severity: 'LOW',
        message: `Could not check pending orders: ${e.message}`,
        timestamp: new Date().toISOString()
      });
    }

    try {
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
    } catch (e: any) {
      alerts.push({
        severity: 'LOW',
        message: `Could not check stalled orders: ${e.message}`,
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
