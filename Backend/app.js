const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');

const app = express();
const cookieParser=require('cookie-parser');
const connectDB = require('./db');
const userRoutes = require('./routes/user.routes');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

connectDB();



// Routes
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Hello World');
});

module.exports = app;