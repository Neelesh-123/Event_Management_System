const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  description: String,
  image: String // store uploaded image filename
});

module.exports = mongoose.model('Event', eventSchema);
