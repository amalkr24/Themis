import { db } from './client.js';
import { users } from './schema.js';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await db.insert(users).values({
      name: 'System Admin',
      email: 'admin@themis.com',
      passwordHash,
      role: 'admin',
    });

    console.log('Admin account created successfully!');
    console.log('Email: admin@themis.com');
    console.log('Password: admin123');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

seedAdmin();
