import { io } from "socket.io-client";
import API_BASE_URL from "../config";

const riderSocket = io(API_BASE_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: false,
});

export default riderSocket;
