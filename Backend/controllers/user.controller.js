const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const generateToken = require('../utils/generateToken');

// Register User
exports.registerUser = async (req, res) => {
try {
const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
        email: normalizedEmail
    });

    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: "User already exists"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "user"
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
        success: true,
        token,
        data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });

} catch (error) {
    console.error(error);

    res.status(500).json({
        success: false,
        message: error.message
    });
}
};

// Login User
exports.loginUser = async (req, res) => {
try {
const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
        email: normalizedEmail
    }).select('+password');

    if (!user) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
        success: true,
        token,
        data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });

} catch (error) {
    console.error(error);

    res.status(500).json({
        success: false,
        message: error.message
    });
}
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
res.status(200).json({
success: true,
data: req.user
});
};

// Logout User
exports.logoutUser = async (req, res) => {
res.clearCookie("token");

res.status(200).json({
    success: true,
    message: "Logged out successfully"
});

};
