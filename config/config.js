const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eventHub',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    },
    resave: false,
    saveUninitialized: false,
    store: null // Will be set in app.js
  },

  // File upload configuration
  upload: {
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    },
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
  },

  // Password configuration
  password: {
    minLength: 6,
    saltRounds: 10
  }
};

module.exports = config;