# 🚀 How to Run Shambil Pride Academy Management System

## ✅ System Status: READY TO USE

Both the backend server and React frontend are now running successfully!

## 🔗 Access URLs

- **React Frontend**: http://localhost:3002
- **Backend API**: http://localhost:4000
- **System Test Dashboard**: Open `test-complete-system.html` in your browser

## 🏃‍♂️ Running the System

### Current Status (Already Running)
- ✅ **Backend Server**: Running on port 4000
- ✅ **React Client**: Running on port 3002
- ✅ **SQLite Database**: Connected and working
- ✅ **Authentication**: Working with demo users

### If You Need to Restart

#### 1. Start Backend Server
```bash
cd server
npm run dev
```
The server will start on http://localhost:4000

#### 2. Start React Frontend
```bash
cd client
npm start
```
The React app will start on http://localhost:3002

## 👥 Demo User Accounts

### Student Account
- **Email**: `student@shambil.edu.ng`
- **Password**: `student123`
- **Name**: John Student
- **Admission Number**: SHA/2024/001
- **Class**: JSS 2A

### Admin Account
- **Email**: `admin@shambil.edu.ng`
- **Password**: `admin123`
- **Role**: Administrator

### Teacher Account
- **Email**: `teacher@shambil.edu.ng`
- **Password**: `teacher123`
- **Role**: Teacher

### Accountant Account
- **Email**: `accountant@shambil.edu.ng`
- **Password**: `accountant123`
- **Role**: Accountant

### Exam Officer Account
- **Email**: `exam@shambil.edu.ng`
- **Password**: `exam123`
- **Role**: Exam Officer

## 🧪 Testing the System

### 1. Quick System Test
Open `test-complete-system.html` in your browser for a comprehensive system status check.

### 2. Login Test
1. Go to http://localhost:3002
2. Click "Login" 
3. Use any of the demo accounts above
4. You should be redirected to the appropriate dashboard

### 3. Complaint Form Test
1. Login as a student
2. Navigate to the complaint/feedback section
3. The form should show real user data (not demo placeholders)

### 4. API Test
Use the test files:
- `test-student-api.js` - Test student API endpoints
- `test-complaint-form-user-info.html` - Test complaint form functionality

## 🎯 Key Features Working

### ✅ Authentication System
- User login/logout
- JWT token-based authentication
- Role-based access control
- Student data integration

### ✅ Student Dashboard
- Real student information display
- Admission number, class, and personal details
- Results, payments, and attendance (when available)

### ✅ Complaint/Feedback System
- Shows real user information (not demo data)
- Priority level selection
- Subject and message fields
- Proper form submission

### ✅ Admin Features
- Dashboard statistics
- Student management
- Class and subject management
- Financial overview

### ✅ Database Integration
- SQLite database with real data
- Student records with admission numbers
- User authentication data
- Class and subject information

## 🔧 Troubleshooting

### Port Conflicts
If you get "EADDRINUSE" errors:
```bash
# Kill processes using the ports
taskkill /F /IM node.exe
# Or kill specific PIDs
netstat -ano | findstr :4000
taskkill /PID [PID_NUMBER] /F
```

### Server Not Starting
1. Check if all dependencies are installed:
   ```bash
   cd server && npm install
   cd client && npm install
   ```

2. Check environment variables in `server/.env`

3. Restart both servers

### Database Issues
The SQLite database is automatically created and seeded with demo data. If you have issues:
1. Delete `server/database/shambil_academy.sqlite`
2. Restart the server (it will recreate the database)

## 📱 Using the System

### For Students
1. Login with student credentials
2. View dashboard with personal information
3. Check results, payments, attendance
4. Submit complaints/feedback with real user data

### For Teachers
1. Login with teacher credentials
2. Access teacher dashboard
3. Manage classes and students
4. Enter grades and results

### For Administrators
1. Login with admin credentials
2. Access comprehensive dashboard
3. Manage all system aspects
4. View reports and statistics

## 🎉 System is Ready!

The Shambil Pride Academy Management System is now fully operational with:
- ✅ Working authentication
- ✅ Real student data integration
- ✅ Functional complaint system
- ✅ Role-based dashboards
- ✅ SQLite database with demo data
- ✅ Modern React frontend
- ✅ Secure backend API

You can now use the system for school management tasks!