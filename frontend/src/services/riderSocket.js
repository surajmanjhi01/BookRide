import { io } from "socket.io-client";

const riderSocket = io("http://localhost:3000", {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: false,
});

export default riderSocket;
