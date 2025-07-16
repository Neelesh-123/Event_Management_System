const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');
const User = require('../models/User');

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const config = require('../config/config');

// File upload validation
const upload = multer({
  storage: storage,
  limits: config.upload.limits,
  fileFilter: (req, file, cb) => {
    if (!config.upload.allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    cb(null, true);
  }
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', { error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Admin Routes
router.get('/add', isAdmin, (req, res) => {
  res.render('addevent', { event: null, user: req.session.user });
});

router.get('/edit/:id', isAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    res.render('addevent', { event, user: req.session.user });
  } catch (error) {
    res.status(404).render('error', { error: 'Event not found' });
  }
});

router.get('/admin/dashboard', isAdmin, async (req, res) => {
  try {
    const events = await Event.find().populate('createdBy', 'username');
    const eventsWithPending = await Event.find({
      'registeredUsers.status': 'pending'
    }).populate('registeredUsers.user', 'username');

    const pendingRegistrations = eventsWithPending.flatMap(event => 
      event.registeredUsers
        .filter(reg => reg.status === 'pending')
        .map(reg => ({
          event: {
            _id: event._id,
            name: event.name
          },
          user: reg.user,
          bookingDate: reg.bookingDate
        }))
    );

    res.render('admin-dashboard', { events, pendingRegistrations, user: req.session.user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const { validateEventData, formatDate, formatTime, isEventFullyBooked, getEventStatus } = require('../utils/helpers');

router.post('/create', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const validation = validateEventData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const eventData = {
      ...validation.data,
      status: req.body.status || 'upcoming',
      description: req.body.description,
      image: req.file ? req.file.filename : null,
      createdBy: req.session.user._id
    };

    const event = await Event.create(eventData);
    res.json({ success: true, event });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create event'
    });
  }
});

router.put('/update/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      ...(req.file && { image: req.file.filename })
    };
    const event = await Event.findByIdAndUpdate(req.params.id, eventData, { new: true });
    res.json({ success: true, event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/delete/:id', isAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/registration-status', isAdmin, async (req, res) => {
  try {
    const { eventId, userId, status } = req.body;
    
    // Update Event model
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    const eventRegistration = event.registeredUsers.find(reg => reg.user.toString() === userId);
    if (!eventRegistration) {
      return res.status(404).json({ success: false, message: 'Registration not found in event' });
    }
    
    eventRegistration.status = status;
    await event.save();

    // Update User model
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userRegistration = user.registeredEvents.find(reg => reg.event.toString() === eventId);
    if (!userRegistration) {
      return res.status(404).json({ success: false, message: 'Registration not found in user' });
    }
    
    userRegistration.status = status;
    
    // Add notification
    user.notifications.push({
      message: `Your registration for ${event.name} has been ${status}`,
      date: new Date()
    });
    
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// User Routes
router.get('/user/dashboard', async (req, res) => {
  try {
    const upcomingEvents = await Event.find({ status: 'upcoming' });
    const ongoingEvents = await Event.find({ status: 'ongoing' });
    const finishedEvents = await Event.find({ status: 'finished' });
    
    // Get user with populated event data
    const user = await User.findById(req.session.user._id)
      .populate({
        path: 'registeredEvents.event',
        select: 'name date time location status'
      });

    const userBookings = user.registeredEvents
      .filter(booking => booking.event) // Filter out any bookings where event is null
      .map(booking => ({
        event: booking.event,
        status: booking.status,
        bookingDate: booking.bookingDate
      }));

    const notifications = user.notifications || [];
    const unreadNotifications = notifications.filter(n => !n.read);

    res.render('user-dashboard', {
      upcomingEvents,
      ongoingEvents,
      finishedEvents,
      userBookings,
      notifications,
      unreadNotifications,
      user: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const bookingLimiter = rateLimit({
  ...config.rateLimit,
  message: { success: false, message: 'Too many booking attempts. Please try again later.' }
});

router.post('/book', bookingLimiter, async (req, res) => {
  try {
    const event = await Event.findById(req.body.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (isEventFullyBooked(event)) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    const alreadyRegistered = event.registeredUsers.some(
      reg => reg.user.toString() === req.session.user._id.toString()
    );
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }

    // Update Event model
    event.registeredUsers.push({
      user: req.session.user._id,
      status: 'pending',
      bookingDate: new Date()
    });
    await event.save();

    // Update User model
    const user = await User.findById(req.session.user._id);
    user.registeredEvents.push({
      event: event._id,
      status: 'pending',
      bookingDate: new Date()
    });
    await user.save();

    // Notify admin
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      admin.notifications.push({
        message: `New registration request for ${event.name} from ${req.session.user.username}`,
        date: new Date()
      });
      await admin.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/cancel-booking', async (req, res) => {
  try {
    // Update Event model
    const event = await Event.findById(req.body.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const eventRegistrationIndex = event.registeredUsers.findIndex(
      reg => reg.user.toString() === req.session.user._id.toString()
    );

    if (eventRegistrationIndex === -1) {
      return res.status(404).json({ success: false, message: 'Booking not found in event' });
    }

    event.registeredUsers.splice(eventRegistrationIndex, 1);
    await event.save();

    // Update User model
    const user = await User.findById(req.session.user._id);
    const userRegistrationIndex = user.registeredEvents.findIndex(
      reg => reg.event.toString() === req.body.eventId
    );

    if (userRegistrationIndex > -1) {
      user.registeredEvents.splice(userRegistrationIndex, 1);
      await user.save();
    }

    // Notify admin
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      admin.notifications.push({
        message: `Booking cancelled for ${event.name} by ${req.session.user.username}`,
        date: new Date()
      });
      await admin.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/notifications/mark-read', async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    user.notifications.forEach(notification => {
      notification.read = true;
    });
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
