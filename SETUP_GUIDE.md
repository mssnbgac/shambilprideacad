# Shambil Pride Academy - Setup Guide

## ✅ Dependencies Installation Complete!

All dependencies have been successfully installed:
- ✅ Root dependencies installed
- ✅ Server dependencies installed  
- ✅ Client dependencies installed (with legacy peer deps to resolve TypeScript conflicts)
- ✅ Environment file created
- ✅ Required React files created

## 🚀 Next Steps

### 1. Install and Start MongoDB

The server requires MongoDB to be running. Choose one option:

#### Option A: Install MongoDB Locally
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. MongoDB will run on default port: `mongodb://localhost:27017`

#### Option B: Use MongoDB Atlas (Cloud)
1. Create free account at: https://www.mongodb.com/atlas
2. Create a cluster and get connection string
3. Update `server/.env` file with your Atlas connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shambil-academy
   ```

### 2. Start the Application

#### Method 1: Start Both Servers Together (Recommended)
```bash
npm run dev
```

#### Method 2: Start Servers Separately
```bash
# Terminal 1 - Start Backend Server
cd server
npm run dev

# Terminal 2 - Start Frontend Server  
cd client
npm start
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Homepage**: http://localhost:3000/homepage

### 4. Demo Login Accounts

Use these accounts to test the system:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shambil.edu.ng | admin123 |
| Student | student@shambil.edu.ng | student123 |
| Teacher | teacher@shambil.edu.ng | teacher123 |
| Accountant | accountant@shambil.edu.ng | accountant123 |
| Exam Officer | exam@shambil.edu.ng | exam123 |
| Parent | parent@shambil.edu.ng | parent123 |

## 🔧 Troubleshooting

### Server Won't Start
- **Issue**: MongoDB connection error
- **Solution**: Ensure MongoDB is running on port 27017 or update connection string in `.env`

### Client Won't Start  
- **Issue**: Port 3000 already in use
- **Solution**: Kill process on port 3000 or set different port:
  ```bash
  set PORT=3001 && npm start
  ```

### TypeScript Errors
- **Issue**: Type conflicts
- **Solution**: Dependencies installed with `--legacy-peer-deps` to resolve conflicts

### CORS Errors
- **Issue**: Frontend can't connect to backend
- **Solution**: Backend configured for `http://localhost:3000` - ensure both servers are running

## 📁 Project Structure

```
shambil-pride-academy/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── pages/          # Page components
│   │   └── dashboards/     # Role-specific dashboards
│   └── public/            # Static files
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Custom middleware
│   │   └── config/        # Configuration
│   └── .env              # Environment variables
└── package.json          # Root package.json
```

## 🎯 Key Features Available

### Dashboards
- **Admin**: Complete system oversight, analytics, student management
- **Accountant**: Financial tracking, payment confirmations
- **Exam Officer**: Result entry, academic analytics
- **Student**: Personal results, payment receipts, transcripts
- **Parent**: Children's progress monitoring
- **Teacher**: Class management, grade entry

### Core Features
- Student management with admission numbers and house system
- Academic session support (2020/2021 to 2149/2150)
- Term-based result management (First, Second, Third)
- Payment tracking and receipt generation
- Complaint system for students and parents
- Daily report submission by office holders
- Search functionality by admission number
- Professional transcript and receipt downloads

## 🆘 Need Help?

If you encounter any issues:
1. Check that MongoDB is running
2. Verify both servers are started
3. Check browser console for errors
4. Review server logs for API errors
5. Ensure all environment variables are set correctly

The system is now ready to use! 🎉