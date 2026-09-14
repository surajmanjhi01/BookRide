import { io } from "socket.io-client";
import API_BASE_URL from "../config";

const socket = io(API_BASE_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: false,
});

socket.on("connect", () => {
  console.log("✅ Captain socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Captain socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error.message);
});

export default socket;