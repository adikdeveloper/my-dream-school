/**
 * Script to assign a student to a class
 * This fixes the "Siz hali hech qanday sinfga biriktirilmagansiz" error
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
const User = require('../models/users/User');
const Class = require('../models/academic/Class');

async function assignStudentToClass() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mydreamschool', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Find the test student (the one showing the error)
        const studentId = '68fb107eb8a886043f2e6576';
        const student = await User.findById(studentId);

        if (!student) {
            console.log('Student not found! Searching for other students...');
            const students = await User.find({ role: 'student' }).limit(5);
            console.log('Available students:', students.map(s => ({
                id: s._id,
                name: `${s.firstName} ${s.lastName}`,
                classId: s.classId
            })));
            process.exit(1);
        }

        console.log(`Found student: ${student.firstName} ${student.lastName}`);
        console.log(`Current classId: ${student.classId || 'None'}`);

        // Find an active class
        const activeClass = await Class.findOne({ isActive: true });

        if (!activeClass) {
            console.log('No active class found! Creating a test class...');

            // Find a teacher to be class teacher
            const teacher = await User.findOne({ role: 'teacher' });

            const newClass = new Class({
                name: 'Test Class 1-A',
                grade: 1,
                section: 'A',
                group: 'MIT',
                academicYear: '2025-2026',
                classTeacher: teacher ? teacher._id : null,
                students: [studentId],
                isActive: true
            });

            await newClass.save();
            console.log(`Created new class: ${newClass.name}`);

            // Update student's classId
            student.classId = newClass._id;
            await student.save();
            console.log(`Assigned student to class: ${newClass.name}`);

        } else {
            console.log(`Found active class: ${activeClass.name}`);

            // Add student to class if not already in it
            if (!activeClass.students.includes(studentId)) {
                activeClass.students.push(studentId);
                await activeClass.save();
                console.log(`Added student to class: ${activeClass.name}`);
            }

            // Update student's classId
            student.classId = activeClass._id;
            await student.save();
            console.log(`Updated student's classId to: ${activeClass._id}`);
        }

        console.log('\n✅ Student successfully assigned to a class!');
        console.log('Please refresh the "Mening sinfim" page to see the changes.');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

assignStudentToClass();
