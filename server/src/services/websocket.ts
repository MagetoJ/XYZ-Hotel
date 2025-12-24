import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';

export class WebSocketService {
  private wss: WebSocketServer;
  private kitchenSockets = new Set<WebSocket>();
  private monitoringSockets = new Set<WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      if (req.url === '/ws/kitchen') {
        console.log('🍳 Kitchen display connected');
        this.kitchenSockets.add(ws);
        
        ws.on('close', () => {
          console.log('🍳 Kitchen display disconnected');
          this.kitchenSockets.delete(ws);
        });
        
        ws.on('error', console.error);
      } else if (req.url === '/ws/monitoring') {
        console.log('📊 Monitoring display connected');
        this.monitoringSockets.add(ws);
        
        ws.on('close', () => {
          console.log('📊 Monitoring display disconnected');
          this.monitoringSockets.delete(ws);
        });
        
        ws.on('error', console.error);
      } else {
        ws.close();
      }
    });
  }

  public broadcastToKitchens(message: object) {
    const data = JSON.stringify(message);
    this.kitchenSockets.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public broadcastToMonitoring(message: object) {
    const data = JSON.stringify(message);
    this.monitoringSockets.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public getKitchenSocketsCount(): number {
    return this.kitchenSockets.size;
  }

  public getMonitoringSocketsCount(): number {
    return this.monitoringSockets.size;
  }
}

export default WebSocketService;