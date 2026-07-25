# My Dream School - School Management System

A modern, comprehensive school management system built with Node.js, Express.js, React.js, and MongoDB. The system features three distinct dashboards designed with the school's brand colors (navy blue and golden yellow) extracted from the logo.

## 🏫 Features

### Admin Dashboard
- **Executive-style interface** with school brand colors
- User Management (Students, Teachers, Administrators)
- Class and Subject Management
- School Information Management
- Reports and Statistics
- System Settings

### Teacher Dashboard
- **Professional educator-focused design**
- Class Journal for attendance and grade tracking
- Schedule Management
- Student Lists and Performance Tracking
- Assignment Management
- Parent Communication Tools
- Teaching Reports and Analytics
- Profile Settings

### Student Dashboard
- **Youth-friendly yet professional interface**
- Personal Academic Diary
- Class Schedule View
- Homework and Assignment Tracking
- School Announcements
- Progress Statistics and Grade Tracking
- Profile Management

## 🎨 Design Features

- **Brand Integration**: Logo prominently displayed in all dashboard headers
- **Color Scheme**: Navy blue (#1e3a8a) and golden yellow (#fbbf24) extracted from the school logo
- **Responsive Design**: Mobile-optimized for all devices
- **Modern UI/UX**: Clean cards, subtle shadows, and professional typography
- **Role-based Access**: Secure authentication with JWT tokens

## 🚀 Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT Authentication** for secure sessions
- **bcrypt** for password hashing
- **Express Validator** for input validation
- **CORS** enabled for cross-origin requests

### Frontend
- **React.js** with modern hooks and functional components
- **React Router** for SPA navigation
- **Context API** for state management
- **Axios** for API communication
- **CSS3** with Flexbox/Grid layouts
- **Responsive design** with mobile-first approach

## 📁 Project Structure

```
kundalik/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Class.js
│   │   ├── Subject.js
│   │   ├── Grade.js
│   │   ├── Attendance.js
│   │   └── Announcement.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── classes.js
│   │   ├── subjects.js
│   │   ├── grades.js
│   │   ├── attendance.js
│   │   └── announcements.js
│   ├── config/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── assets/
│   │       └── images/
│   │           └── logo.jpg
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── admin/
│   │   │   ├── teacher/
│   │   │   └── student/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── hooks/
│   └── package.json
└── logo.jpg
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or remote connection)
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mydreamschool
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
```

5. Start the backend server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`.

## 👥 Demo Accounts

For testing purposes, you can create demo accounts with the following roles:

### Admin Account
- **Email**: admin@mydreamschool.edu
- **Role**: Administrator
- **Access**: Full system access

### Teacher Account
- **Email**: teacher@mydreamschool.edu
- **Role**: Teacher
- **Access**: Class management, grading, student tracking

### Student Account
- **Email**: student@mydreamschool.edu
- **Role**: Student
- **Access**: Personal dashboard, schedules, grades

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user (admin only)

### Classes
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create new class (admin only)

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create new subject (admin only)

### Grades
- `GET /api/grades` - Get grades (filtered by user role)
- `POST /api/grades` - Create new grade (teacher only)

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record (teacher only)

### Announcements
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create announcement (admin only)

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Role-based Access Control**: Different permissions for admin, teacher, and student roles
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for secure cross-origin requests

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Touch-optimized interface with adapted layouts
- **Mobile**: Streamlined mobile experience with collapsible navigation

## 🎨 Brand Integration

- **Logo Integration**: School logo prominently displayed in all dashboards
- **Color Consistency**: Navy blue and golden yellow theme throughout
- **Professional Typography**: Inter font family for clean, modern appearance
- **Academic Elements**: Design elements inspired by educational institutions

## 🔄 State Management

- **React Context API**: Global state management for authentication and data
- **Local State**: Component-level state for UI interactions
- **Persistent Storage**: JWT tokens stored securely in localStorage

## 📊 Dashboard Features

### Admin Dashboard
- System overview with statistics
- User management with role assignment
- Class and subject administration
- Comprehensive reporting tools
- System configuration settings

### Teacher Dashboard
- Daily class schedule and planning
- Student attendance tracking
- Grade book management
- Assignment creation and tracking
- Parent communication tools

### Student Dashboard
- Personalized academic overview
- Assignment and homework tracking
- Grade and progress monitoring
- School announcements and updates
- Schedule management

## 🚀 Future Enhancements

- Real-time notifications
- File upload and document management
- Advanced reporting and analytics
- Parent portal access
- Mobile application
- Integration with external educational tools

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**My Dream School** - Empowering education through technology 🎓