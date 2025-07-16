const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  email: { type: String, required: true, unique: true },
  registeredEvents: [{
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    bookingDate: { type: Date, default: Date.now }
  }],
  notifications: [{
    message: String,
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }]
});

module.exports = mongoose.model('User', userSchema);