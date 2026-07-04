const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const Trainer = require('./models/Trainer');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trainer_attendance';

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected.');

    // 1. Delete all trainer records
    console.log('Deleting all trainer attendance records...');
    await Trainer.deleteMany({});
    console.log('All attendance records wiped.');

    // 2. Delete all users
    console.log('Deleting all user accounts...');
    await User.deleteMany({});
    console.log('All user accounts wiped.');

    // 3. Clear uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    console.log(`Clearing uploaded files from ${uploadsDir}...`);
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = path.join(uploadsDir, file);
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Error deleting file ${file}:`, err.message);
          }
        }
      }
      console.log('Uploads directory cleared.');
    }

    // 4. Seed default credentials
    console.log('Creating default user credentials...');
    
    const trainerUser = new User({
      username: 'trainer1',
      password: 'password123',
      role: 'trainer',
      trainerName: 'Default Trainer',
      email: 'trainer1@email.com',
      employeeId: 'TRN-00001',
      isApproved: true
    });
    await trainerUser.save();

    const managerUser = new User({
      username: 'manager1',
      password: 'password123',
      role: 'manager',
      isApproved: true
    });
    await managerUser.save();

    console.log('=========================================');
    console.log('Database reset complete!');
    console.log('Default credentials successfully seeded:');
    console.log(' - Trainer: trainer1 / password123 (ID: TRN-00001)');
    console.log(' - Manager: manager1 / password123');
    console.log('=========================================');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
