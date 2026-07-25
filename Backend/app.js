const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser=require('cookie-parser');
const connectDB = require('./db');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const riderRoutes = require('./routes/ride.routes');
const mapRoutes=require('./routes/map.routes');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());


connectDB();


app.use('/api/users', userRoutes);
app.use('/api/captains', captainRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/maps',mapRoutes);

app.get('/', (req, res) => {
    res.send('Hello World');
});

module.exports = app;