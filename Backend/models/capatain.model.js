const mongoose = require('mongoose');

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, "firstname must be at least 3 characters long"]
        },
        lastname: {
            type: String,
            required: true,
            minlength: [3, "lastname must be at least 3 characters long"]
        }
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    socketId: {
        type: String
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive'
    },

    vehicle: {
        color: {
            type: String,
            required: true,
            minlength: [3, "color must be at least 3 characters long"]
        },

        plate: {
            type: String,
            required: true,
            minlength: [3, "plate must be at least 3 characters long"]
        },

        capacity: {
            type: Number,
            required: true,
            min: [1, "capacity must be at least 1"]
        },

        vehicleType: {
            type: String,
            required: true,
            enum: ['car', 'bike', 'van']
        }
    },

    location: {
        lat: {
            type: Number
        },

        lng: {
            type: Number
        }
    }
});


module.exports = mongoose.model("Captain", captainSchema);