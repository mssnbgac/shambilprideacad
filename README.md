# 🏫 Shambil Pride Academy - School Management System

A comprehensive school management system built with React, Node.js, TypeScript, and SQLite. This system provides complete functionality for managing students, teachers, staff, academic records, payments, and communication within a school environment.

## 🌟 Features

### 👥 Multi-Role Dashboard System
- **Admin Dashboard**: Complete school management and oversight
- **Student Dashboard**: View grades, attendance, payments, and download transcripts
- **Teacher Dashboard**: Messaging system with admin and exam officers
- **Parent Dashboard**: Monitor child's progress and communicate with school
- **Accountant Dashboard**: Financial management with payment confirmation and summaries
- **Exam Officer Dashboard**: Manage academic records and student communications

### 📊 Academic Management
- **Results Management**: Enter, publish, and track student academic performance
- **Attendance Tracking**: Daily attendance with comprehensive reporting
- **Class Position Tracking**: Automatic ranking and position calculation
- **Transcript Generation**: Professional HTML transcript downloads
- **Subject Management**: Flexible subject and class organization

### 💰 Financial Management
- **Payment Tracking**: Comprehensive fee management system
- **Receipt Generation**: Professional payment receipt downloads
- **Financial Summaries**: Real-time balance and expenditure tracking
- **Payment Confirmation**: Accountant workflow for payment verification

### 💬 Communication System
- **Multi-Role Messaging**: Students, teachers, parents can message admin/exam officers
- **Priority-Based Messages**: Low, normal, and high priority message handling
- **Reply System**: Bidirectional communication with reply tracking
- **Message Categories**: Academic, administrative, disciplinary, facilities, transport

### 🏠 Student House System
- **11 House System**: RED, BLUE, GREEN, PURPLE, PINK, BROWN, YELLOW, WHITE, MAGENTA, ORANGE, BLACK
- **House Assignment**: Automatic and manual house assignment capabilities
- **House-Based Reporting**: Filter and organize students by house

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Professional Interface**: Clean, modern design with intuitive navigation
- **Real-Time Updates**: Dynamic data loading and updates
- **Accessibility**: WCAG compliant interface design

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/shambil-pride-academy.git
   cd shambil-pride-academy
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Start the development servers**
   ```bash
   # Terminal 1: Start the backend server
   cd server
   npm run dev

   # Terminal 2: Start the frontend client
   cd client
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:4000

## 🔐 Demo Accounts

The system comes with pre-configured demo accounts for testing:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shambil.edu.ng | admin123 |
| Student | alice@shambil.edu.ng | student123 |
| Teacher | teacher@shambil.edu.ng | teacher123 |
| Accountant | accountant@shambil.edu.ng | accountant123 |
| Exam Officer | exam@shambil.edu.ng | exam123 |
| Parent | parent@shambil.edu.ng | parent123 |

## 📁 Project Structure

```
shambil-pride-academy/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Node.js backend application
│   ├── src/
│   │   ├── config/        # Database and app configuration
│   │   ├── models/        # Database models
│   │   ├── routes/        # API route handlers
│   │   └── index.ts       # Main server file
│   └── database/          # SQLite database files
└── docs/                  # Documentation files
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching and state management
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **SQLite** - Lightweight, file-based database
- **Sequelize** - SQL ORM for database operations
- **bcryptjs** - Password hashing and authentication
- **CORS** - Cross-origin resource sharing

## 📊 Database Schema

The system uses SQLite with the following main tables:
- **Users** - All system users (students, teachers, staff, parents)
- **Students** - Student-specific information and class assignments
- **Classes** - Class definitions and teacher assignments
- **Subjects** - Subject definitions and curriculum
- **Results** - Academic results with position tracking
- **SubjectResults** - Individual subject scores and grades
- **Payments** - Fee payments and financial records
- **Attendance** - Daily attendance tracking
- **Comments** - Communication system messages
- **Staff** - Staff-specific information and roles

## 🎯 Key Features Implemented

### ✅ Complete Dashboard System
- Multi-role authentication and authorization
- Role-specific dashboards with appropriate functionality
- Real-time data loading and updates

### ✅ Academic Management
- Results entry with automatic grade calculation
- Position tracking within classes
- Professional transcript generation
- Comprehensive attendance management

### ✅ Financial System
- Payment tracking and confirmation
- Receipt generation with professional formatting
- Financial summaries and balance calculations
- Expenditure tracking and reporting

### ✅ Communication Platform
- Multi-directional messaging system
- Priority-based message handling
- Reply tracking and status management
- Category-based message organization

### ✅ Modern UI/UX
- Responsive design for all devices
- Professional, clean interface
- Intuitive navigation and user experience
- Accessibility compliance

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the server directory:
```env
PORT=4000
NODE_ENV=development
DB_PATH=./database/shambil_academy.sqlite
JWT_SECRET=your-jwt-secret-key
```

### Database Setup
The SQLite database is automatically created and seeded with demo data on first run. No additional setup required.

## 📱 Mobile Responsiveness

The application is fully responsive and works seamlessly on:
- Desktop computers (1920px and above)
- Laptops (1024px - 1919px)
- Tablets (768px - 1023px)
- Mobile phones (320px - 767px)

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 🚀 Deployment

The application is ready for deployment on platforms like:
- **Heroku** - Easy deployment with PostgreSQL addon
- **Vercel** - Frontend deployment with serverless functions
- **DigitalOcean** - Full-stack deployment on VPS
- **AWS** - Scalable cloud deployment

## 📞 Contact Information

**Shambil Pride Academy**
- 📧 Email: shehubala70@gmail.com
- 📱 Phone: +2348079387958, +2348034012480
- 📍 Address: Birnin Gwari, Kaduna State, Nigeria

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed for educational institutions
- Focused on user experience and functionality
- Comprehensive school management solution

---

**Made with ❤️ for Shambil Pride Academy, Birnin Gwari**