/**
 * Safe wipe script
 * Usage: node wipe_keep_admins.js --yes
 * This will:
 *  - Delete all Trainer documents
 *  - Delete non-admin Users (keeps usernames 'trainer1' and 'manager1')
 *  - Clear VerificationCode collection
 *  - Drop any other collections except 'users'
 *  - Remove files in ./uploads and ./logs (if present)
 *
 * IMPORTANT: Pass --yes to run. Without it the script will only print what it would do.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const KEEP_USERS = ['trainer1', 'manager1'];
const CONFIRM = process.argv.includes('--yes') || process.env.WIPE_CONFIRM === 'true';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trainer_attendance';

async function run() {
  console.log('Wipe script starting.');
  console.log(`Mongo: ${MONGODB_URI}`);
  console.log(`Keep users: ${KEEP_USERS.join(', ')}`);
  if (!CONFIRM) {
    console.log('\nDry-run mode. No destructive actions will be taken.');
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;

  try {
    // Delete Trainer documents
    console.log('\n- Clearing Trainer collection');
    if (CONFIRM) {
      await db.collection('trainers').deleteMany({});
      console.log('  Trainer collection cleared.');
    } else {
      const count = await db.collection('trainers').countDocuments();
      console.log(`  [DRY] Would delete ${count} trainer documents.`);
    }

    // Delete VerificationCode documents
    console.log('\n- Clearing VerificationCode collection');
    if (CONFIRM) {
      if (await db.collection('verificationcodes').countDocuments()) {
        await db.collection('verificationcodes').deleteMany({});
      }
      console.log('  VerificationCode collection cleared.');
    } else {
      const count = await db.collection('verificationcodes').countDocuments();
      console.log(`  [DRY] Would delete ${count} verification code documents.`);
    }

    // Remove other collections except users
    const collInfos = await db.listCollections().toArray();
    for (const info of collInfos) {
      const name = info.name;
      if (name === 'users') continue; // keep users collection
      if (name === 'trainers' || name === 'verificationcodes') continue; // already handled
      try {
        console.log(`\n- Dropping collection: ${name}`);
        if (CONFIRM) {
          await db.collection(name).deleteMany({});
          console.log(`  Collection ${name} cleared.`);
        } else {
          const cnt = await db.collection(name).countDocuments();
          console.log(`  [DRY] Would clear ${cnt} documents from ${name}.`);
        }
      } catch (err) {
        console.warn(`  Skipping ${name}: ${err.message}`);
      }
    }

    // Delete non-kept users
    console.log('\n- Pruning Users (keeping specified usernames)');
    if (CONFIRM) {
      const usersColl = db.collection('users');
      const res = await usersColl.deleteMany({ username: { $nin: KEEP_USERS } });
      console.log(`  Deleted ${res.deletedCount} user(s).`);
    } else {
      const total = await db.collection('users').countDocuments();
      const keepCount = await db.collection('users').countDocuments({ username: { $in: KEEP_USERS } });
      console.log(`  [DRY] Users total: ${total}, would keep: ${keepCount}, would delete: ${total - keepCount}`);
    }

    // Files cleanup: uploads and logs
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const logsDir = path.join(__dirname, '..', 'logs');

    async function removeDirFiles(dir) {
      if (!fs.existsSync(dir)) return 0;
      const files = fs.readdirSync(dir);
      let removed = 0;
      for (const f of files) {
        const p = path.join(dir, f);
        try {
          const stat = fs.lstatSync(p);
          if (stat.isDirectory()) {
            // recursively remove
            removed += await removeDirFiles(p);
            // remove directory if empty
            try { fs.rmdirSync(p); } catch(e) {}
          } else {
            if (CONFIRM) {
              fs.unlinkSync(p);
              removed++;
            } else {
              removed++;
            }
          }
        } catch (err) {
          console.warn(`  Could not remove ${p}: ${err.message}`);
        }
      }
      return removed;
    }

    console.log('\n- Clearing uploads folder');
    const uploadsRemoved = await removeDirFiles(uploadsDir);
    console.log(CONFIRM ? `  Removed ${uploadsRemoved} file(s) from uploads.` : `  [DRY] Would remove ${uploadsRemoved} file(s) from uploads.`);

    console.log('\n- Clearing logs folder');
    const logsRemoved = await removeDirFiles(logsDir);
    console.log(CONFIRM ? `  Removed ${logsRemoved} file(s) from logs.` : `  [DRY] Would remove ${logsRemoved} file(s) from logs.`);

    console.log('\nWipe operation completed.');
  } catch (err) {
    console.error('Error during wipe:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
