const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

const connectDB = require("./db");

const userRoutes = require("./routes/user.routes");
const captainRoutes = require("./routes/captain.routes");
const riderRoutes = require("./routes/ride.routes");
const mapRoutes = require("./routes/map.routes");

// -------------------- Middleware --------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// -------------------- Database --------------------

connectDB();

// -------------------- Routes --------------------

app.use("/api/users", userRoutes);
app.use("/api/captains", captainRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/maps", mapRoutes);

// -------------------- Health Check --------------------

app.get("/", (req, res) => {
  res.send("Uber Clone Backend is running");
});

module.exports = app;