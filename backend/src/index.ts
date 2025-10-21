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
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


const server = http.createServer(app);


const io = initializeWebSocket(server);

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/submission", submissionRoutes);
app.use("/api/admin", adminRoutes);

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
  server.close(() => {
    console.log("HTTP server closed");
  })
  stopMonitoring();
  await Promise.all([
    cleanupBuildQueue(),
    cleanupYjsRooms(),
    // few left
  ])
  
  io.close(() => {
    console.log("Websocket connection closed");
  })
  process.exit(0);
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
