const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  description: String,
  image: String,
  status: { 
    type: String, 
    enum: ['upcoming', 'ongoing', 'finished'], 
    default: 'upcoming' 
  },
  capacity: { 
    type: Number, 
    required: true 
  },
  registeredUsers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    bookingDate: { type: Date, default: Date.now }
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
