import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }

    client.send(JSON.stringify(payload));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection",async (socket,req) => {
     
      if(wsArcjet)
      {
        try {

            const decision = wsArcjet.protectWebSocket(req);

            if (decision.isDenied) {
              if (decision.reason.isRateLimit) {
                socket.close(1013, "Too Many Requests");
                return;
              }
              socket.close(1008, "Forbidden");
              return;
            }
        }
        catch (error) {
          console.error("Error in Arcjet WebSocket protection:", error);
          socket.close(1011, "WebSocket protection error");
          return;
        }
      }



        socket.isAlive = true;
        socket.on("pong", () => {
          socket.isAlive = true;
        });

    sendJson(socket, { type: "welcome" });

    socket.on("error", console.error);
  });

    // Heartbeat to detect dead connections
    const interval = setInterval(() => {
        wss.clients.forEach((socket) => {
            if (!socket.isAlive) {
                socket.terminate();
                return;
            }

            socket.isAlive = false;
            socket.ping();
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
    });


  function broadcastMatchCreate(match) {
    broadcast(wss, { type: "match_created", data: match });
  }


  return { broadcastMatchCreate,
  };
}
