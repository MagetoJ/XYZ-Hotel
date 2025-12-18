import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';

export class WebSocketService {
  private wss: WebSocketServer;
  private kitchenSockets = new Set<WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      if (req.url === '/ws/kitchen') {
        console.log('Kitchen display connected');
        this.kitchenSockets.add(ws);
        
        ws.on('close', () => {
          console.log('Kitchen display disconnected');
          this.kitchenSockets.delete(ws);
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

  public getKitchenSocketsCount(): number {
    return this.kitchenSockets.size;
  }
}

export default WebSocketService;