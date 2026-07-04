require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const trainerRoutes = require('./routes/trainerRoutes');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trainer_attendance';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded photos
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api', trainerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Trainer Attendance JWT API is running.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Auto-seed default credentials
async function seedDefaultUsers() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding default User roles into database...');
      
      // Create trainer account
      const trainerUser = new User({
        username: 'trainer1',
        password: 'password123',
        role: 'trainer',
        email: 'trainer1@email.com',
        isApproved: true
      });
      await trainerUser.save();
      
      // Create manager account
      const managerUser = new User({
        username: 'manager1',
        password: 'password123',
        role: 'manager',
        isApproved: true
      });
      await managerUser.save();

      console.log('Default credentials successfully seeded:');
      console.log(' - Trainer: trainer1 / password123');
      console.log(' - Manager: manager1 / password123');
    } else {
      console.log('Database users found. Seeding skipped.');
    }
  } catch (error) {
    console.error('Error auto-seeding users:', error.message);
  }
}

// Database Connection and Server Startup
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await seedDefaultUsers();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });
