const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/users/User');

async function listStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mydreamschool');
    
    // Find all students and print their names exactly as stored
    const students = await User.find({ role: 'student' }).select('firstName lastName studentId');
    
    console.log('--- ALL STUDENTS ---');
    students.forEach(s => {
      console.log(`[${s.firstName}] [${s.lastName}] (ID: ${s.studentId})`);
    });
    console.log('--- END ---');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listStudents();
