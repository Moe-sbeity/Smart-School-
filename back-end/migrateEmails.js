import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from './models/UserModels.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/SchoolSystem';

// Map old domains to new domains
const DOMAIN_MAP = {
  '@teacher.school.com': '@teacher.com',
  '@student.school.com': '@student.com',
  '@parent.school.com': '@parent.com',
  '.parent@school.com': '.parent@parent.com',  // parent emails like "ahmad.hassan.parent@school.com"
};

async function migrateEmails() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const allUsers = await UserModel.find({});
    console.log(`📊 Total users: ${allUsers.length}\n`);

    let updated = 0;
    let skipped = 0;

    for (const user of allUsers) {
      let newEmail = user.email;
      let changed = false;

      // Try each domain mapping
      for (const [oldDomain, newDomain] of Object.entries(DOMAIN_MAP)) {
        if (user.email.includes(oldDomain)) {
          newEmail = user.email.replace(oldDomain, newDomain);
          changed = true;
          break;
        }
      }

      // Special case: parent emails ending with @school.com
      if (!changed && user.email.endsWith('@school.com') && user.role === 'parent') {
        newEmail = user.email.replace('@school.com', '@parent.com');
        changed = true;
      }

      if (changed) {
        // Check for duplicate
        const existing = await UserModel.findOne({ email: newEmail, _id: { $ne: user._id } });
        if (existing) {
          console.log(`   ⚠️ SKIP (duplicate): ${user.email} → ${newEmail}`);
          skipped++;
          continue;
        }

        const oldEmail = user.email;
        user.email = newEmail;
        await user.save();
        console.log(`   ✓ ${user.role.padEnd(8)} ${oldEmail} → ${newEmail}`);
        updated++;
      } else {
        // Check if already correct
        const correctDomains = ['@teacher.com', '@student.com', '@parent.com', '@admin.com'];
        const isCorrect = correctDomains.some(d => user.email.endsWith(d));
        if (isCorrect) {
          console.log(`   ○ ${user.role.padEnd(8)} ${user.email} (already correct)`);
        } else {
          console.log(`   ? ${user.role.padEnd(8)} ${user.email} (unknown domain)`);
        }
        skipped++;
      }
    }

    console.log(`\n✅ Migration complete: ${updated} updated, ${skipped} skipped`);

    // Print final summary
    console.log('\n📋 Final user summary:');
    const finalUsers = await UserModel.find({}).select('name email role').sort('role');
    
    const byRole = {};
    finalUsers.forEach(u => {
      if (!byRole[u.role]) byRole[u.role] = [];
      byRole[u.role].push(u);
    });

    for (const [role, users] of Object.entries(byRole)) {
      console.log(`\n  ${role.toUpperCase()} (${users.length}):`);
      users.forEach(u => console.log(`    ${u.name || 'N/A'} → ${u.email}`));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateEmails();
