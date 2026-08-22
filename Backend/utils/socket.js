const jwt = require("jsonwebtoken");
const captainModel = require("../models/captain.model");

let io;

const initSocket = (server) => {

  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {

    console.log(
      "Socket connected:",
      socket.id
    );

    try {

      const token = socket.handshake.auth?.token;

      if (!token) {

        console.log(
          "Socket connected without authentication:",
          socket.id
        );

        return;
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const captain = await captainModel.findById(
        decoded.id
      );

      if (!captain) {

        console.log(
          "Captain not found for socket:",
          socket.id
        );

        socket.disconnect();

        return;
      }

      // Save socket ID to captain
      captain.socketId = socket.id;

      await captain.save();

      console.log(
        "Captain socket registered:",
        captain._id.toString(),
        socket.id
      );

      socket.captainId = captain._id.toString();

    } catch (error) {

      console.error(
        "Socket authentication error:",
        error.message
      );

      socket.disconnect();

      return;
    }

    socket.on("disconnect", async () => {

      console.log(
        "Socket disconnected:",
        socket.id
      );

      try {

        if (socket.captainId) {

          await captainModel.findByIdAndUpdate(
            socket.captainId,
            {
              socketId: null
            },
            {
              returnDocument: "after"
            }
          );

          console.log(
            "Captain socket cleared:",
            socket.captainId
          );
        }

      } catch (error) {

        console.error(
          "Error clearing captain socket:",
          error.message
        );

      }

    });

  });

  return io;
};


const getIO = () => {

  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized"
    );
  }

  return io;
};


module.exports = {
  initSocket,
  getIO
};