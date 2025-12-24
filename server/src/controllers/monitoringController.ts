import { Request, Response } from 'express';
import db from '../db';
import os from 'os';
import { WebSocketService } from '../services/websocket';

let webSocketService: WebSocketService | null = null;

export const setWebSocketService = (service: WebSocketService) => {
  webSocketService = service;
  console.log('📊 WebSocket service initialized for monitoring');
};

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
      const orderStats = await db.raw(`
        SELECT 
          COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
          COUNT(*) FILTER (WHERE completed_at IS NULL) as pending,
          COUNT(*) as total
        FROM orders
      `) as any;
      
      const stats = orderStats.rows?.[0] || { completed: 0, pending: 0, total: 0 };
      totalCount = Number(stats.total) || 0;
      completedCount = Number(stats.completed) || 0;
      pendingCount = Number(stats.pending) || 0;
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
      const alert = {
        severity: 'HIGH',
        message: `Database latency is ${dbLatency}ms - consider optimization`,
        timestamp: new Date().toISOString(),
        type: 'CRITICAL_ALERT'
      };
      alerts.push(alert);
      if (webSocketService) {
        webSocketService.broadcastToMonitoring(alert);
      }
    }

    const cpuLoad = os.loadavg()[0];
    const cpuThreshold = os.cpus().length;
    if (cpuLoad > cpuThreshold && cpuLoad > 0) {
      const alert = {
        severity: 'HIGH',
        message: `CPU load (${cpuLoad.toFixed(2)}) exceeds threshold (${cpuThreshold})`,
        timestamp: new Date().toISOString(),
        type: 'CRITICAL_ALERT'
      };
      alerts.push(alert);
      if (webSocketService) {
        webSocketService.broadcastToMonitoring(alert);
      }
    }

    const memoryUsage = (1 - os.freemem() / os.totalmem()) * 100;
    if (memoryUsage > 85) {
      const alert = {
        severity: 'MEDIUM',
        message: `Memory usage is ${memoryUsage.toFixed(2)}% - consider clearing cache`,
        timestamp: new Date().toISOString(),
        type: 'CRITICAL_ALERT'
      };
      alerts.push(alert);
      if (webSocketService) {
        webSocketService.broadcastToMonitoring(alert);
      }
    }

    try {
      const orderAlerts = await db.raw(`
        SELECT 
          COUNT(*) FILTER (WHERE completed_at IS NULL) as pending,
          COUNT(*) FILTER (WHERE completed_at IS NULL AND created_at < NOW() - INTERVAL '2 hours') as stalled
        FROM orders
      `) as any;
      
      const alerts_data = orderAlerts.rows?.[0] || { pending: 0, stalled: 0 };
      const pendingCount = Number(alerts_data.pending) || 0;
      const stalledCount = Number(alerts_data.stalled) || 0;
      
      if (pendingCount > 50) {
        const alert = {
          severity: 'MEDIUM',
          message: `${pendingCount} pending orders - kitchen may be overwhelmed`,
          timestamp: new Date().toISOString(),
          type: 'CRITICAL_ALERT'
        };
        alerts.push(alert);
        if (webSocketService) {
          webSocketService.broadcastToMonitoring(alert);
        }
      }

      if (stalledCount > 0) {
        const alert = {
          severity: 'HIGH',
          message: `${stalledCount} orders stalled for over 2 hours`,
          timestamp: new Date().toISOString(),
          type: 'CRITICAL_ALERT'
        };
        alerts.push(alert);
        if (webSocketService) {
          webSocketService.broadcastToMonitoring(alert);
        }
      }
    } catch (e: any) {
      alerts.push({
        severity: 'LOW',
        message: `Could not check order alerts: ${e.message}`,
        timestamp: new Date().toISOString(),
        type: 'CRITICAL_ALERT'
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

export const getAdvancedMetrics = async (req: Request, res: Response) => {
  try {
    let cacheMetrics = { hitRatio: 0, reads: 0, hits: 0 };
    let topQueries: any[] = [];
    let bloatAnalysis: any[] = [];
    let warnings: string[] = [];

    try {
      const cacheResult = await db.raw(`
        SELECT 
          SUM(heap_blks_read) as reads, 
          SUM(heap_blks_hit) as hits,
          CASE 
            WHEN SUM(heap_blks_hit) + SUM(heap_blks_read) = 0 THEN 0
            ELSE ROUND(100.0 * SUM(heap_blks_hit) / (SUM(heap_blks_hit) + SUM(heap_blks_read)), 2)
          END as hit_ratio
        FROM pg_statio_user_tables
      `);
      
      const cacheData = cacheResult.rows?.[0] || { reads: 0, hits: 0, hit_ratio: 0 };
      cacheMetrics = {
        hitRatio: Number(cacheData.hit_ratio) || 0,
        reads: Number(cacheData.reads) || 0,
        hits: Number(cacheData.hits) || 0
      };
    } catch (e: any) {
      warnings.push('Could not calculate cache hit ratio: ' + e.message);
    }

    try {
      const queriesResult = await db.raw(`
        SELECT 
          query,
          calls,
          total_time as total_exec_time,
          mean_time,
          max_time,
          rows
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY total_time DESC 
        LIMIT 5
      `);
      
      topQueries = queriesResult.rows?.map((q: any) => ({
        query: q.query?.substring(0, 100) + (q.query?.length > 100 ? '...' : ''),
        totalTime: Number(q.total_exec_time)?.toFixed(2) || 0,
        meanTime: Number(q.mean_time)?.toFixed(2) || 0,
        maxTime: Number(q.max_time)?.toFixed(2) || 0,
        calls: Number(q.calls) || 0,
        rows: Number(q.rows) || 0
      })) || [];
    } catch (e: any) {
      warnings.push('Could not fetch slowest queries: ' + e.message);
    }

    try {
      const bloatResult = await db.raw(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          ROUND(100.0 * pg_relation_size(schemaname||'.'||tablename) / 
            NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2) as live_ratio
        FROM pg_tables
        WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);
      
      bloatAnalysis = bloatResult.rows?.map((b: any) => ({
        table: b.tablename,
        schema: b.schemaname,
        size: b.total_size,
        liveDataRatio: Number(b.live_ratio)?.toFixed(2) || 0,
        recommendation: Number(b.live_ratio) < 70 ? 'VACUUM REQUIRED' : 'OK'
      })) || [];
    } catch (e: any) {
      warnings.push('Could not fetch bloat analysis: ' + e.message);
    }

    res.json({
      cacheMetrics,
      topQueries,
      bloatAnalysis,
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

export const getStaffSalesDistribution = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const staffSales = await db.raw(`
      SELECT 
        s.id,
        s.name,
        s.role,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COALESCE(SUM(o.service_charge), 0) as total_tips
      FROM staff s
      LEFT JOIN orders o ON s.id = o.staff_id 
        AND o.created_at >= '${startDate} 00:00:00'
        AND o.created_at <= '${endDate} 23:59:59'
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.role
      ORDER BY total_sales DESC
    `);

    const data = staffSales.rows?.map((r: any) => ({
      name: r.name,
      role: r.role,
      value: Number(r.total_sales) || 0,
      orders: Number(r.order_count) || 0,
      tips: Number(r.total_tips) || 0
    })) || [];

    res.json({
      period: { start: startDate, end: endDate },
      distribution: data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'Error', 
      message: error.message 
    });
  }
};

export const getProfitabilityAnalytics = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const profitData = await db.raw(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(service_charge), 0) as total_tips,
        COALESCE(SUM(discount), 0) as total_discounts,
        ROUND(COALESCE(SUM(total_amount), 0) + COALESCE(SUM(service_charge), 0) - COALESCE(SUM(discount), 0), 2) as net_revenue
      FROM orders
      WHERE created_at >= '${startDate} 00:00:00'
        AND created_at <= '${endDate} 23:59:59'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    interface ProfitDay {
      date: string;
      orders: number;
      sales: number;
      tips: number;
      discounts: number;
      netRevenue: number;
    }

    const data: ProfitDay[] = profitData.rows?.map((r: any) => ({
      date: r.date,
      orders: Number(r.total_orders) || 0,
      sales: Number(r.total_sales) || 0,
      tips: Number(r.total_tips) || 0,
      discounts: Number(r.total_discounts) || 0,
      netRevenue: Number(r.net_revenue) || 0
    })) || [];

    interface TotalsAccumulator {
      totalOrders: number;
      totalSales: number;
      totalTips: number;
      totalDiscounts: number;
      totalRevenue: number;
    }

    const totals = data.reduce((acc: TotalsAccumulator, curr: ProfitDay) => ({
      totalOrders: acc.totalOrders + curr.orders,
      totalSales: acc.totalSales + curr.sales,
      totalTips: acc.totalTips + curr.tips,
      totalDiscounts: acc.totalDiscounts + curr.discounts,
      totalRevenue: acc.totalRevenue + curr.netRevenue
    }), { totalOrders: 0, totalSales: 0, totalTips: 0, totalDiscounts: 0, totalRevenue: 0 });

    res.json({
      period: { start: startDate, end: endDate },
      daily: data,
      totals,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'Error', 
      message: error.message 
    });
  }
};

export const getInventoryVelocity = async (req: Request, res: Response) => {
  try {
    const velocityData: any[] = [];
    let warnings: string[] = [];

    try {
      const inventoryResult = await db.raw(`
        SELECT 
          i.id,
          i.item_name,
          i.current_qty,
          i.min_qty,
          i.unit_cost,
          COALESCE(SUM(il.quantity_used), 0) as usage_7days
        FROM inventory i
        LEFT JOIN inventory_log il ON i.id = il.inventory_id 
          AND il.created_at >= NOW() - INTERVAL '7 days'
        WHERE i.current_qty > 0
        GROUP BY i.id, i.item_name, i.current_qty, i.min_qty, i.unit_cost
        HAVING COALESCE(SUM(il.quantity_used), 0) > 0
        ORDER BY (COALESCE(SUM(il.quantity_used), 0) / 7) DESC
        LIMIT 15
      `);

      const items = inventoryResult.rows || [];
      
      for (const item of items) {
        const dailyUsage = Number(item.usage_7days) / 7 || 0;
        const currentQty = Number(item.current_qty) || 0;
        const minQty = Number(item.min_qty) || 1;
        const daysUntilDepletion = dailyUsage > 0 ? Math.ceil(currentQty / dailyUsage) : 999;

        velocityData.push({
          itemName: item.item_name,
          currentQty: currentQty,
          minQty: minQty,
          dailyUsage: dailyUsage.toFixed(2),
          daysUntilDepletion,
          status: daysUntilDepletion <= 7 ? 'URGENT' : daysUntilDepletion <= 14 ? 'SOON' : 'OK',
          stockValue: (currentQty * Number(item.unit_cost)).toFixed(2)
        });
      }
    } catch (e: any) {
      warnings.push('Could not fetch inventory velocity: ' + e.message);
    }

    res.json({
      velocity: velocityData,
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
