const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/users/User');

dotenv.config();

const app = express();

// Trust proxy (for Nginx reverse proxy)
app.set('trust proxy', 1);

const corsOptions = {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Recaptcha-Token'],
    credentials: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions)); // Enable CORS before body parsing so errors still include CORS headers
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Return JSON parse errors with CORS headers instead of a browser-side CORS failure.
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'JSON formati noto\'g\'ri' });
    }
    next(err);
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mydreamschool', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            const indexes = await User.collection.indexes();
            const emailIndex = indexes.find((index) => index?.key?.email === 1 || index?.key?.email === '1');
            if (emailIndex && (!emailIndex.unique || !emailIndex.partialFilterExpression)) {
                try {
                    await User.collection.dropIndex(emailIndex.name);
                } catch (indexError) {
                    if (indexError.code !== 27 && indexError.codeName !== 'IndexNotFound') {
                        throw indexError;
                    }
                }
            }

            const refreshedIndexes = await User.collection.indexes();
            const hasDesiredEmailIndex = refreshedIndexes.some((index) =>
                index?.key?.email === 1 &&
                index?.unique &&
                index?.partialFilterExpression?.email?.$type === 'string'
            );

            if (!hasDesiredEmailIndex) {
                await User.collection.createIndex(
                    { email: 1 },
                    {
                        unique: true,
                        name: 'email_1',
                        partialFilterExpression: { email: { $type: 'string' } }
                    }
                );
            }
            console.log('Connected to MongoDB');
        }
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
};

// Routes - Users
app.use('/api/auth', require('./routes/users/auth'));
app.use('/api/users', require('./routes/users/users'));
app.use('/api/classes', require('./routes/users/classes'));

// Routes - Academic
app.use('/api/subjects', require('./routes/academic/subjects'));
app.use('/api/grades', require('./routes/academic/grades'));
app.use('/api/attendance', require('./routes/academic/attendance'));
app.use('/api/tests', require('./routes/academic/tests'));
app.use('/api/assignments', require('./routes/academic/assignments'));
app.use('/api/coins', require('./routes/academic/coins'));

// Routes - Scheduling
app.use('/api/schedule', require('./routes/scheduling/schedule'));
app.use('/api/holidays', require('./routes/scheduling/holidays'));
app.use('/api/substitutions', require('./routes/scheduling/substitutions'));

// Routes - Financial
app.use('/api/salary', require('./routes/financial/salary'));
app.use('/api/payments', require('./routes/financial/payments'));
app.use('/api/student-fees', require('./routes/financial/studentFees'));
app.use('/api/financial', require('./routes/financial/financial'));
app.use('/api/balance', require('./routes/financial/balance'));

// Routes - Communication
app.use('/api/announcements', require('./routes/communication/announcements'));
app.use('/api/notifications', require('./routes/communication/notifications'));
app.use('/api/leads', require('./routes/communication/leads'));
app.use('/api/parent-contacts', require('./routes/communication/parentContacts'));

// Routes - Chat (Telegram-style messaging)
app.use('/api/chat', require('./routes/chat/chat'));

// Routes - Permissions
app.use('/api/permissions', require('./routes/permissions/permissions'));

// Routes - Inventory (Jihozlar / xonalar)
app.use('/api/inventory', require('./routes/inventory/rooms'));

// Routes - AI (Modular architecture)
// Modullar: chat | education | finance | management | communication | keys
app.use('/api/ai', require('./ai'));

// Routes - Statistics
app.use('/api/stats', require('./routes/stats'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

module.exports = { app, connectDB };

