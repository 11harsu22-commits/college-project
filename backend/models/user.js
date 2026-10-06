const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
      phone: {
        type: String
    },
    address: {
        type: String
    },
    city: {
        type: String
    },
    pincode: {
        type: String
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
},
    
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);