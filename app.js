const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const methodOverride = require('method-override');
const User = require('./models/User');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

const config = require('./config/config');

// Configure session store
config.session.store = MongoStore.create({
  mongoUrl: config.mongodb.uri,
  ttl: 24 * 60 * 60 // 1 day
});

// Connect to MongoDB with enhanced error handling
mongoose.connect(config.mongodb.uri, config.mongodb.options)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use(session(config.session));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Auth Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect(req.session.user.role === 'admin' ? '/events/admin/dashboard' : '/events/user/dashboard');
  } else {
    res.render('index');
  }
});

app.get('/login', (req, res) => {
  const type = req.query.type || 'user';
  if (type !== 'user' && type !== 'admin') {
    return res.redirect('/');
  }
  res.render('login', { type });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password, type } = req.body;
    
    if (type !== 'user' && type !== 'admin') {
      return res.render('login', { error: 'Invalid account type' });
    }

    const user = await User.findOne({ username, role: type });

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = user;
      res.redirect(user.role === 'admin' ? '/events/admin/dashboard' : '/events/user/dashboard');
    } else {
      res.render('login', { error: 'Invalid credentials' });
    }
  } catch (error) {
    res.render('login', { error: 'Login failed' });
  }
});

app.get('/register', (req, res) => {
  const type = req.query.type || 'user';
  if (type !== 'user' && type !== 'admin') {
    return res.redirect('/');
  }
  res.render('register', { type });
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, type } = req.body;
    
    if (type !== 'user' && type !== 'admin') {
      return res.render('register', { error: 'Invalid account type' });
    }

    // Input validation
    if (!username || !email || !password) {
      return res.render('register', { error: 'All fields are required' });
    }

    if (password.length < config.password.minLength) {
      return res.render('register', { error: `Password must be at least ${config.password.minLength} characters long` });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('register', { 
        error: 'Username or email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, config.password.saltRounds);

    await User.create({
      username,
      email,
      password: hashedPassword,
      role: type
    });

    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', { 
      error: 'Registration failed. Please try again.'
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Protected route middleware
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req, res) => {
  res.redirect(req.session.user ? '/events/user/dashboard' : '/login');
});

const { errorHandler } = require('./middleware/errorHandler');

app.use('/events', requireAuth, eventRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(config.server.port, () => {
  console.log(`🚀 Server is running at http://localhost:${config.server.port} in ${config.server.env} mode`);
});
