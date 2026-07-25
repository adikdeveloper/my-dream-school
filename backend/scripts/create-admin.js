// Admin yaratish skripti
// VPS da ishga tushiring: node create-admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB ga ulanish — maxfiy satr .env dan olinadi (kodga yozilmaydi)
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment o\'zgaruvchisi o\'rnatilmagan. backend/.env fayliga qo\'shing.');
  process.exit(1);
}

// User schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: false, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student', 'supervisor'], required: true },
    phone: { type: String, required: true, unique: true },
    address: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB ga ulandi');

        // Admin ma\'lumotlari
        const adminData = {
            phone: '+998880073668',
            password: 'Muxriddin2002',
            firstName: 'Admin',
            lastName: 'Muxriddin',
            role: 'admin',
            isActive: true
        };

        // Parolni hashlash
        const salt = await bcrypt.genSalt(10);
        adminData.password = await bcrypt.hash(adminData.password, salt);

        // Mavjud adminni tekshirish
        const existingUser = await User.findOne({ phone: adminData.phone });

        if (existingUser) {
            // Mavjud bo'lsa yangilash
            existingUser.password = adminData.password;
            existingUser.role = 'admin';
            existingUser.isActive = true;
            await existingUser.save();
            console.log('✅ Admin yangilandi!');
        } else {
            // Yangi admin yaratish
            const admin = new User(adminData);
            await admin.save();
            console.log('✅ Yangi admin yaratildi!');
        }

        console.log('📱 Telefon: +998880073668');
        console.log('🔑 Parol: Muxriddin2002');

        await mongoose.disconnect();
        console.log('MongoDB dan uzildi');
        process.exit(0);
    } catch (error) {
        console.error('❌ Xato:', error.message);
        process.exit(1);
    }
}

createAdmin();
