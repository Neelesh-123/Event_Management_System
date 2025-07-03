const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const multer = require('multer');
const path = require('path');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const upload = multer({ storage });

// Route: GET dashboard
router.get('/', async (req, res) => {
  const events = await Event.find().sort({ date: 1 });
  res.render('dashboard', { events });
});

// Route: GET add event form
router.get('/add', (req, res) => {
  res.render('addEvent');
});
const fs = require('fs');
const uploadDir = './public/uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
};


// Route: POST add event with image upload
router.post('/add', upload.single('image'), async (req, res) => {
  const { name, date, time, location, description } = req.body;
  const image = req.file ? req.file.filename : null;

  await Event.create({ name, date, time, location, description, image });
  res.redirect('/');
});

// Route: DELETE event
router.get('/delete/:id', async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

module.exports = router;
