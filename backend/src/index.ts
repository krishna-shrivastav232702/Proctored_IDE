import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import teamRoutes from "./routes/teamRoutes";
import sessionRoutes from "./routes/sessionRoutes";
import filesRoutes from "./routes/filesRoutes";
import submissionRoutes from "./routes/submissionRoutes";
import adminRoutes from "./routes/adminRoutes";
import { initializeWebSocket } from "./realTimeServerUtilities/websocket";
import http from "http"
import { startMonitoring, stopMonitoring } from "./containerMonitoring/Monitoring";
import { cleanupBuildQueue } from "./realTimeServerUtilities/buildQueue";
import { cleanupYjsRooms } from "./realTimeServerUtilities/yjs";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { authenticate, AuthRequest } from "./middleware/auth";
import { Request,Response,NextFunction } from "express";
import { prisma } from "./lib/prismaClient";
import { stopAutoSnapshot } from "./lib/snapshot";
import { stopWatcher } from "./lib/filewatcher";
import buildRoutes from "./routes/buildRoutes";
import aiRoutes from "./routes/aiRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


const server = http.createServer(app);


const io = initializeWebSocket(server);

app.use(helmet({
  contentSecurityPolicy: false,
}))

app.use(compression());


const generalLimiter = rateLimit({
  windowMs: 15*60*1000,
  max: 300,
  message: { error: "You're making too many requests. Please slow down a bit." },
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator:(req:AuthRequest) => {
    if(req.user?.userId){
      return `user:${req.user.userId}`;
    }
    return `ip:${req.ip}`
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});


const authLimiter = rateLimit({
  windowMs: 15*60*1000,
  max: 20,
  message:{error:"Too many authentication attempts. Please wait 15 minutes before trying again"},
  standardHeaders:true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return `auth:${email.toLowerCase()}`;
    }
    return `auth-ip:${req.ip}`
  },
  skipSuccessfulRequests: true,
})


const abuseDetector = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) => {
    if (req.user?.userId) {
      return `abuse:user:${req.user.userId}`;
    }
    return `abuse:ip:${req.ip}`;
  },
  
  handler: (req: AuthRequest, res,next) => {
    console.warn(`ABUSE DETECTED: User ${req.user?.email || req.ip} making ${req.rateLimit?.current || 'many'} requests/min`);
    if (io && req.user) {
      io.to("admin-room").emit("abuse:detected", {
        userId: req.user.userId,
        email: req.user.email,
        teamId: req.user.teamId,
        requestCount: req.rateLimit?.current,
        timestamp: new Date().toISOString()
      });
    }
    res.setHeader('X-Rate-Limit-Warning', 'You are making requests very quickly');
    next();
  }
});


app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

const applyAuth = (req:Request,res:Response,next:NextFunction) => {
  const authHeader = req.headers.authorization;
  if(authHeader){
    return authenticate(req as AuthRequest,res,next);
  }
  next();
};




app.use("/api/auth", authLimiter,authRoutes);
app.use("/api/team",applyAuth,generalLimiter,abuseDetector, teamRoutes);
app.use("/api/session", applyAuth, generalLimiter, abuseDetector, sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/build", abuseDetector, buildRoutes);
app.use("/api/ai", abuseDetector, aiRoutes);
app.use("/api/submission", applyAuth, generalLimiter, abuseDetector, submissionRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime(), memory:process.memoryUsage() });
});



app.get("/api/websocket/status",(req,res)=>{
  const sockets = io.sockets.sockets.size;
  const rooms = Array.from(io.sockets.adapter.rooms.keys()).filter(
    (room) => room.startsWith("team-") || room === "admin-room"
  );
  res.json({
    connected:sockets,
    rooms:rooms.length,
    roomList: rooms
  })
})

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});


startMonitoring();


const gracefulShutdown = async(signal:string) => {
  console.log(`Recieved ${signal}, starting gracdeful shutdown`);
  try {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log("HTTP server closed");
        resolve();
      });
    })
    await stopMonitoring();
    const activeTeams = await prisma.team.findMany({
      where:{
        containerInfo:{
          status:"running"
        }
      },
      select:{id:true}
    });
    console.log(`🔧 Stopping watchers for ${activeTeams.length} active teams...`);
    for (const team of activeTeams) {
      try {
        stopAutoSnapshot(team.id);
        stopWatcher(team.id);
      } catch (error) {
        console.error(`Failed to stop watcher for team ${team.id}:`, error);
      }
    }
    console.log("✅ File watchers and snapshots stopped");
    
    // Cleanup build queue and Yjs rooms
    await Promise.all([
      cleanupBuildQueue(),
      cleanupYjsRooms(),
    ]);
    console.log("Build queue and Yjs rooms cleaned up");
    
    // Close WebSocket connections
    await new Promise<void>((resolve) => {
      io.close(() => {
        console.log("WebSocket connections closed");
        resolve();
      });
    });
    
    // Disconnect from database
    await prisma.$disconnect();
    console.log("Database disconnected");
    
    console.log("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}


process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));


process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});




server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
