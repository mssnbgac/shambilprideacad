import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import sequelize, { connectSQLiteDB } from './config/sqlite-database';
import sqliteAuthRoutes from './routes/sqlite-auth';
import classesRoutes from './routes/classes';
import subjectsRoutes from './routes/subjects';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to SQLite Database
connectSQLiteDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));

// Rate limiting (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', sqliteAuthRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/subjects', subjectsRoutes);

// ==================== STUDENT SEARCH ENDPOINTS ====================

// Student search endpoint
app.get('/api/students/search/admission/:admissionNumber', async (req, res) => {
  try {
    const { admissionNumber } = req.params;
    
    const students = await sequelize.query(`
      SELECT 
        s.id,
        s.admissionNumber,
        s.house,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        c.name as className,
        c.level as classLevel,
        c.id as classId
      FROM Students s
      LEFT JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE s.admissionNumber = ?
    `, {
      replacements: [admissionNumber],
      type: 'SELECT'
    });

    if (!students || (students as any[]).length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = students[0] as any;

    res.json({
      _id: student.id,
      admissionNumber: student.admissionNumber,
      studentId: student.admissionNumber, // Use admission number as student ID
      house: student.house,
      user: {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone
      },
      class: {
        _id: student.classId,
        name: student.className,
        level: student.classLevel
      }
    });
  } catch (error) {
    console.error('Search student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== RESULTS MANAGEMENT ENDPOINTS ====================

// Create result
app.post('/api/results', async (req, res) => {
  try {
    const { student, class: classId, academicYear, term, subjects, remarks, nextTermBegins } = req.body;

    console.log('Processing result submission for student:', student);

    // First, create or get the main Results record
    let [resultRecord] = await sequelize.query(`
      SELECT id FROM Results 
      WHERE studentId = ? AND academicYear = ? AND term = ?
    `, {
      replacements: [student, academicYear, term],
      type: 'SELECT'
    }) as any[];

    let resultId;
    if (!resultRecord) {
      // Create new Results record
      const [newResultId] = await sequelize.query(`
        INSERT INTO Results 
        (studentId, classId, academicYear, term, enteredBy)
        VALUES (?, ?, ?, ?, 1)
      `, {
        replacements: [student, classId, academicYear, term],
        type: 'INSERT'
      }) as any[];
      resultId = newResultId;
    } else {
      resultId = resultRecord.id;
    }

    // Process each subject result
    let totalScore = 0;
    let subjectCount = 0;

    for (const subjectResult of subjects) {
      const { subject: subjectId, ca1, ca2, exam } = subjectResult;
      
      // Calculate grade based on total score
      const total = ca1 + ca2 + exam;
      totalScore += total;
      subjectCount++;
      
      let grade = 'F';
      if (total >= 80) grade = 'A';
      else if (total >= 70) grade = 'B';
      else if (total >= 60) grade = 'C';
      else if (total >= 50) grade = 'D';
      else if (total >= 40) grade = 'E';

      // Insert or update individual subject result
      await sequelize.query(`
        INSERT OR REPLACE INTO SubjectResults 
        (resultId, subjectId, ca1, ca2, exam, total, grade)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [resultId, subjectId, ca1, ca2, exam, total, grade],
        type: 'INSERT'
      });
    }

    // Calculate overall performance
    const averageScore = subjectCount > 0 ? totalScore / subjectCount : 0;
    const overallGrade = averageScore >= 80 ? 'A' : 
                        averageScore >= 70 ? 'B' : 
                        averageScore >= 60 ? 'C' : 
                        averageScore >= 50 ? 'D' : 
                        averageScore >= 40 ? 'E' : 'F';

    // Update the main Results record with calculated totals
    await sequelize.query(`
      UPDATE Results 
      SET totalScore = ?, averageScore = ?, overallGrade = ?, remarks = ?, published = 1, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [totalScore, averageScore, overallGrade, remarks, resultId],
      type: 'UPDATE'
    });

    console.log('✅ Results processed successfully for student:', student);

    res.json({
      message: 'Results submitted and processed successfully',
      student,
      academicYear,
      term,
      subjectsCount: subjects.length,
      averageScore: averageScore,
      grade: overallGrade
    });
  } catch (error) {
    console.error('Create result error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get existing results for a student
app.get('/api/results/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;

    // Get the main result record
    const [resultRecord] = await sequelize.query(`
      SELECT * FROM Results 
      WHERE studentId = ? AND academicYear = ? AND term = ?
    `, {
      replacements: [studentId, academicYear, term],
      type: 'SELECT'
    }) as any[];

    if (!resultRecord) {
      return res.json({
        hasResults: false,
        results: null,
        subjects: []
      });
    }

    // Get individual subject results
    const subjectResults = await sequelize.query(`
      SELECT 
        sr.id, sr.ca1, sr.ca2, sr.exam, sr.total, sr.grade,
        s.id as subjectId, s.name as subjectName, s.code as subjectCode
      FROM SubjectResults sr
      JOIN Subjects s ON sr.subjectId = s.id
      WHERE sr.resultId = ?
      ORDER BY s.name
    `, {
      replacements: [resultRecord.id],
      type: 'SELECT'
    }) as any[];

    res.json({
      hasResults: true,
      results: {
        id: resultRecord.id,
        studentId: resultRecord.studentId,
        classId: resultRecord.classId,
        academicYear: resultRecord.academicYear,
        term: resultRecord.term,
        totalScore: resultRecord.totalScore,
        averageScore: resultRecord.averageScore,
        overallGrade: resultRecord.overallGrade,
        remarks: resultRecord.remarks,
        published: resultRecord.published,
        enteredAt: resultRecord.enteredAt,
        updatedAt: resultRecord.updatedAt
      },
      subjects: subjectResults.map((sr: any) => ({
        id: sr.id,
        subject: {
          _id: sr.subjectId,
          name: sr.subjectName,
          code: sr.subjectCode
        },
        ca1: sr.ca1,
        ca2: sr.ca2,
        exam: sr.exam,
        total: sr.total,
        grade: sr.grade
      }))
    });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Shambil Pride Academy Birnin Gwari Management API is running with SQLite!',
    database: 'SQLite',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Shambil Pride Academy Birnin Gwari Management Server running on port ${PORT} - Unified Server`);
  console.log(`📊 Using SQLite Database (No MongoDB required!)`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
});
// ==================== DASHBOARD ENDPOINTS ====================

// Dashboard stats (real data from database)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // Get total students
    const [studentCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Students WHERE isActive = 1',
      { type: 'SELECT' }
    ) as any[];

    // Get total teachers
    const [teacherCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Users WHERE role IN ("teacher", "exam_officer") AND isActive = 1',
      { type: 'SELECT' }
    ) as any[];

    // Get total classes
    const [classCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Classes',
      { type: 'SELECT' }
    ) as any[];

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const [todayAttendance] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Attendance WHERE attendanceDate = ? AND status = "present"',
      { replacements: [today], type: 'SELECT' }
    ) as any[];

    // Get financial summary
    const [financialSummary] = await sequelize.query(`
      SELECT 
        SUM(amount) as totalRevenue,
        SUM(amountPaid) as totalPaid,
        SUM(balance) as totalBalance,
        COUNT(CASE WHEN status = 'pending' OR status = 'overdue' THEN 1 END) as pendingPayments
      FROM Payments
    `, { type: 'SELECT' }) as any[];

    // Get academic summary
    const [academicSummary] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalResults,
        AVG(averageScore) as overallAverage,
        COUNT(CASE WHEN published = 1 THEN 1 END) as publishedResults,
        COUNT(CASE WHEN published = 0 THEN 1 END) as pendingResults
      FROM Results
    `, { type: 'SELECT' }) as any[];

    res.json({
      totalStudents: studentCount.count || 0,
      totalTeachers: teacherCount.count || 0,
      totalClasses: classCount.count || 0,
      todayAttendance: todayAttendance.count || 0,
      totalRevenue: financialSummary.totalRevenue || 0,
      totalPaid: financialSummary.totalPaid || 0,
      totalBalance: financialSummary.totalBalance || 0,
      pendingPayments: financialSummary.pendingPayments || 0,
      totalResults: academicSummary.totalResults || 0,
      overallAverage: academicSummary.overallAverage || 0,
      publishedResults: academicSummary.publishedResults || 0,
      pendingResults: academicSummary.pendingResults || 0,
      message: 'Real data from SQLite database! 🎉'
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// ==================== USER DASHBOARD ENDPOINTS ====================

// Student Dashboard
app.get('/api/dashboard/student/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ No authorization header provided');
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('❌ No token found in authorization header');
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;
    
    console.log('🔍 Looking for student with userId:', userId);

    // First check if user exists and is a student
    const [user] = await sequelize.query(`
      SELECT id, firstName, lastName, email, role FROM Users WHERE id = ? AND isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!user) {
      console.log('❌ User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'student') {
      console.log('❌ User is not a student, role:', user.role);
      return res.status(403).json({ message: 'User is not a student' });
    }

    console.log('✅ Found user:', user.firstName, user.lastName, 'Role:', user.role);

    // Get student information with LEFT JOIN to handle missing class
    const [student] = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.house, s.dateOfBirth, s.guardianName, s.guardianPhone,
        s.address, s.bloodGroup, s.medicalConditions, s.classId,
        u.firstName, u.lastName, u.email, u.phone,
        c.name as className, c.level as classLevel
      FROM Students s
      JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE s.userId = ? AND s.isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!student) {
      console.log('❌ Student record not found for userId:', userId);
      return res.status(404).json({ message: 'Student record not found' });
    }

    console.log('✅ Found student:', {
      id: student.id,
      admissionNumber: student.admissionNumber,
      classId: student.classId,
      className: student.className
    });

    res.json({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      class: {
        name: student.className || 'No Class Assigned',
        level: student.classLevel || 'N/A'
      },
      house: student.house,
      dateOfBirth: student.dateOfBirth,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      address: student.address,
      bloodGroup: student.bloodGroup,
      medicalConditions: student.medicalConditions
    });
  } catch (error) {
    console.error('❌ Error fetching student dashboard:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Failed to fetch student information', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Teacher Dashboard
app.get('/api/dashboard/teacher/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Get teacher information
    const [teacher] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.office,
        s.employeeId, s.qualification, s.experience, s.subjects, s.salary
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      WHERE u.id = ? AND u.isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      role: teacher.role,
      office: teacher.office,
      employeeId: teacher.employeeId,
      qualification: teacher.qualification,
      experience: teacher.experience,
      subjects: teacher.subjects,
      salary: teacher.salary
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch teacher information' });
  }
});

// Parent Dashboard
app.get('/api/dashboard/parent/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Get parent information
    const [parent] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone
      FROM Users u
      WHERE u.id = ? AND u.role = 'parent' AND u.isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    res.json({
      id: parent.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      phone: parent.phone,
      role: 'parent'
    });
  } catch (error) {
    console.error('Error fetching parent dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch parent information' });
  }
});

// Admin Dashboard
app.get('/api/dashboard/admin/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Get admin information
    const [admin] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.office
      FROM Users u
      WHERE u.id = ? AND u.role = 'admin' AND u.isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      office: admin.office
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch admin information' });
  }
});

// Exam Officer Dashboard
app.get('/api/dashboard/exam-officer/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Get exam officer information
    const [examOfficer] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.office,
        s.employeeId, s.qualification, s.experience
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      WHERE u.id = ? AND u.role = 'exam_officer' AND u.isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!examOfficer) {
      return res.status(404).json({ message: 'Exam Officer not found' });
    }

    res.json({
      id: examOfficer.id,
      firstName: examOfficer.firstName,
      lastName: examOfficer.lastName,
      email: examOfficer.email,
      phone: examOfficer.phone,
      role: examOfficer.role,
      office: examOfficer.office,
      employeeId: examOfficer.employeeId,
      qualification: examOfficer.qualification,
      experience: examOfficer.experience
    });
  } catch (error) {
    console.error('Error fetching exam officer dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch exam officer information' });
  }
});

// Accountant Dashboard
app.get('/api/dashboard/accountant/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Get accountant information
    const [accountant] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.office,
        s.employeeId, s.qualification, s.experience
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      WHERE u.id = ? AND u.role = 'accountant' AND u.isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!accountant) {
      return res.status(404).json({ message: 'Accountant not found' });
    }

    res.json({
      id: accountant.id,
      firstName: accountant.firstName,
      lastName: accountant.lastName,
      email: accountant.email,
      phone: accountant.phone,
      role: accountant.role,
      office: accountant.office,
      employeeId: accountant.employeeId,
      qualification: accountant.qualification,
      experience: accountant.experience
    });
  } catch (error) {
    console.error('Error fetching accountant dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch accountant information' });
  }
});

// ==================== ACCOUNTANT ENDPOINTS ====================

// Get accountant dashboard stats
app.get('/api/dashboard/accountant/stats', async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    
    // Default to current academic year and term if not provided
    const currentAcademicYear = academicYear || '2024/2025';
    const currentTerm = term || 'second';

    console.log(`📊 Fetching accountant stats for ${currentAcademicYear} ${currentTerm} term`);

    // Get financial statistics filtered by academic year and term
    const [financialStats] = await sequelize.query(`
      SELECT 
        SUM(amount) as totalAmount,
        SUM(amountPaid) as totalPaid,
        SUM(balance) as totalBalance,
        COUNT(*) as totalPayments,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as confirmedPayments,
        COUNT(CASE WHEN status = 'pending' OR status = 'overdue' THEN 1 END) as pendingPayments
      FROM Payments
      WHERE academicYear = ? AND term = ?
    `, { 
      replacements: [currentAcademicYear, currentTerm],
      type: 'SELECT' 
    }) as any[];

    // Get expenditures and income separately filtered by academic year and term
    const [expenditureStats] = await sequelize.query(`
      SELECT 
        SUM(CASE WHEN category != 'income' THEN amount ELSE 0 END) as totalExpenditure,
        SUM(CASE WHEN category = 'income' THEN amount ELSE 0 END) as totalIncomeFromExpenditures,
        COUNT(*) as totalExpenditures
      FROM Expenditures
      WHERE academicYear = ? AND term = ?
    `, { 
      replacements: [currentAcademicYear, currentTerm],
      type: 'SELECT' 
    }) as any[];

    // Calculate net balance (payments + manual income - expenses)
    const totalPaymentIncome = financialStats.totalPaid || 0;
    const totalManualIncome = expenditureStats.totalIncomeFromExpenditures || 0;
    const totalIncome = totalPaymentIncome + totalManualIncome;
    const totalExpenditure = expenditureStats.totalExpenditure || 0;
    const netBalance = totalIncome - totalExpenditure;

    res.json({
      academicYear: currentAcademicYear,
      term: currentTerm,
      totalIncome: totalIncome,
      totalExpenditure: totalExpenditure,
      netBalance: netBalance,
      totalPayments: financialStats.totalPayments || 0,
      confirmedPayments: financialStats.confirmedPayments || 0,
      pendingPayments: financialStats.pendingPayments || 0,
      totalExpenditures: expenditureStats.totalExpenditures || 0,
      breakdown: {
        paymentIncome: totalPaymentIncome,
        manualIncome: totalManualIncome,
        totalExpenses: totalExpenditure
      }
    });
  } catch (error) {
    console.error('Error fetching accountant stats:', error);
    res.status(500).json({ message: 'Failed to fetch accountant statistics' });
  }
});

// Search students for payment confirmation
app.get('/api/accountant/students/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const students = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.house,
        u.firstName, u.lastName, u.email, u.phone,
        c.name as className, c.level as classLevel
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      WHERE s.isActive = 1 
      AND (s.admissionNumber LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ?)
      ORDER BY s.admissionNumber
      LIMIT 10
    `, {
      replacements: [`%${query}%`, `%${query}%`, `%${query}%`],
      type: 'SELECT'
    }) as any[];

    const formattedStudents = students.map((student: any) => ({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      class: {
        name: student.className,
        level: student.classLevel
      },
      house: student.house
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ message: 'Failed to search students' });
  }
});

// Confirm student payment
app.post('/api/accountant/payments/confirm', async (req, res) => {
  try {
    const { 
      studentId, 
      amount, 
      paymentType, 
      paymentMethod, 
      academicYear, 
      term, 
      description,
      receiptNumber 
    } = req.body;

    if (!studentId || !amount || !paymentType || !academicYear || !term) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create payment record
    const [paymentResult] = await sequelize.query(`
      INSERT INTO Payments (
        studentId, amount, amountPaid, balance, paymentType, paymentMethod,
        academicYear, term, description, status, paymentDate, confirmedAt,
        confirmedBy, receiptNumber
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 'paid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)
    `, {
      replacements: [
        studentId, amount, amount, paymentType, paymentMethod || 'cash',
        academicYear, term, description || '', receiptNumber || `RCP${Date.now()}`
      ],
      type: 'INSERT'
    }) as any[];

    // Generate receipt automatically
    const receiptId = `RCP${Date.now()}`;
    await sequelize.query(`
      INSERT INTO Receipts (
        paymentId, studentId, receiptNumber, amount, paymentType,
        academicYear, term, generatedAt, generatedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
    `, {
      replacements: [
        paymentResult, studentId, receiptId, amount, paymentType,
        academicYear, term
      ],
      type: 'INSERT'
    });

    res.json({
      message: 'Payment confirmed successfully',
      paymentId: paymentResult,
      receiptNumber: receiptId,
      amount: amount,
      status: 'paid'
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
});

// Add money to school account
app.post('/api/accountant/add-money', async (req, res) => {
  try {
    const { amount, description, source, paymentMethod, referenceNumber, academicYear, term } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    // Record as income in expenditures table (positive amount with 'income' category)
    const [expenditureResult] = await sequelize.query(`
      INSERT INTO Expenditures (
        description, category, amount, expenditureDate, academicYear, term, 
        approvedBy, recordedBy, paymentMethod, receiptNumber, status, notes
      ) VALUES (?, ?, ?, date('now'), ?, ?, 1, 1, ?, ?, 'approved', ?)
    `, {
      replacements: [
        description, 
        'income',
        Math.abs(amount), // Positive amount, but category is 'income'
        academicYear || '2024/2025',
        term || 'second',
        paymentMethod || 'cash',
        referenceNumber || '',
        `Manual money addition - Source: ${source || 'other'}`
      ],
      type: 'INSERT'
    }) as any[];

    console.log('💰 Money added to school account:', {
      amount: amount,
      description: description,
      source: source,
      academicYear: academicYear,
      term: term
    });

    res.json({
      message: 'Money added to school account successfully',
      expenditureId: expenditureResult,
      amount: amount,
      description: description,
      source: source
    });
  } catch (error) {
    console.error('Error adding money:', error);
    res.status(500).json({ message: 'Failed to add money to account' });
  }
});

// Generate and send financial report to admin (Accountant)
app.post('/api/accountant/reports/financial', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: number };
    const { academicYear, term, title, description } = req.body;

    // Get financial data for the report
    const [paymentData] = await sequelize.query(`
      SELECT 
        SUM(amount) as totalAmount,
        SUM(amountPaid) as totalPaid,
        SUM(balance) as totalBalance,
        COUNT(*) as totalPayments,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as confirmedPayments
      FROM Payments 
      WHERE academicYear = ? AND term = ?
    `, {
      replacements: [academicYear, term],
      type: 'SELECT'
    }) as any[];

    const [expenditureData] = await sequelize.query(`
      SELECT 
        SUM(CASE WHEN category != 'income' THEN amount ELSE 0 END) as totalExpenditure,
        SUM(CASE WHEN category = 'income' THEN amount ELSE 0 END) as totalIncomeFromExpenditures,
        COUNT(*) as totalExpenses
      FROM Expenditures 
      WHERE academicYear = ? AND term = ?
    `, {
      replacements: [academicYear, term],
      type: 'SELECT'
    }) as any[];

    // Get payment breakdown
    const paymentBreakdown = await sequelize.query(`
      SELECT paymentType, SUM(amountPaid) as amount, COUNT(*) as count
      FROM Payments 
      WHERE academicYear = ? AND term = ? AND amountPaid > 0
      GROUP BY paymentType
    `, {
      replacements: [academicYear, term],
      type: 'SELECT'
    }) as any[];

    // Get expenditure breakdown
    const expenditureBreakdown = await sequelize.query(`
      SELECT category, SUM(amount) as amount, COUNT(*) as count
      FROM Expenditures 
      WHERE academicYear = ? AND term = ?
      GROUP BY category
    `, {
      replacements: [academicYear, term],
      type: 'SELECT'
    }) as any[];

    const reportData = {
      academicYear,
      term,
      payments: {
        totalAmount: paymentData.totalAmount || 0,
        totalPaid: paymentData.totalPaid || 0,
        totalBalance: paymentData.totalBalance || 0,
        totalPayments: paymentData.totalPayments || 0,
        confirmedPayments: paymentData.confirmedPayments || 0,
        breakdown: paymentBreakdown
      },
      expenditures: {
        totalExpenditure: expenditureData.totalExpenditure || 0,
        totalExpenses: expenditureData.totalExpenses || 0,
        breakdown: expenditureBreakdown
      },
      summary: {
        totalIncome: (paymentData.totalPaid || 0) + (expenditureData.totalIncomeFromExpenditures || 0),
        totalExpenses: expenditureData.totalExpenditure || 0,
        netBalance: ((paymentData.totalPaid || 0) + (expenditureData.totalIncomeFromExpenditures || 0)) - (expenditureData.totalExpenditure || 0)
      },
      generatedAt: new Date().toISOString()
    };

    console.log('📊 Financial report sent to admin:', {
      academicYear,
      term,
      totalIncome: reportData.summary.totalIncome,
      totalExpenses: reportData.summary.totalExpenses,
      netBalance: reportData.summary.netBalance
    });

    res.json({
      message: 'Financial report sent to admin successfully',
      report: {
        title: title || `Financial Report - ${academicYear} ${term} Term`,
        academicYear,
        term,
        summary: reportData.summary
      }
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student receipts
app.get('/api/students/receipts/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const userId = decoded.userId;

    // Get student ID from user ID
    const [student] = await sequelize.query(`
      SELECT id FROM Students WHERE userId = ? AND isActive = 1
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get receipts for the student
    const receipts = await sequelize.query(`
      SELECT 
        r.id, r.receiptNumber, r.amount, r.paymentType,
        r.academicYear, r.term, r.generatedAt,
        p.paymentMethod, p.description
      FROM Receipts r
      LEFT JOIN Payments p ON r.paymentId = p.id
      WHERE r.studentId = ?
      ORDER BY r.generatedAt DESC
    `, {
      replacements: [student.id],
      type: 'SELECT'
    }) as any[];

    const formattedReceipts = receipts.map((receipt: any) => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      paymentType: receipt.paymentType,
      paymentMethod: receipt.paymentMethod,
      description: receipt.description,
      academicYear: receipt.academicYear,
      term: receipt.term,
      generatedAt: receipt.generatedAt
    }));

    res.json(formattedReceipts);
  } catch (error) {
    console.error('Error fetching student receipts:', error);
    res.status(500).json({ message: 'Failed to fetch receipts' });
  }
});

// ==================== USER MANAGEMENT ENDPOINTS ====================

// Create new user (Admin only)
app.post('/api/admin/users', async (req, res) => {
  try {
    const { 
      firstName, lastName, email, password, role, phone, office,
      // Student specific fields
      admissionNumber, classId, house, dateOfBirth, guardianName, guardianPhone, address,
      // Staff specific fields
      employeeId, qualification, experience, subjects, salary
    } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'Required fields: firstName, lastName, email, password, role' });
    }

    // Check if email already exists
    const [existingUser] = await sequelize.query(
      'SELECT id FROM Users WHERE email = ?',
      { replacements: [email], type: 'SELECT' }
    ) as any[];

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create user record
    const [userResult] = await sequelize.query(`
      INSERT INTO Users (firstName, lastName, email, password, role, phone, office, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, {
      replacements: [firstName, lastName, email, password, role, phone || null, office || null],
      type: 'INSERT'
    }) as any[];

    const userId = userResult;

    // Create role-specific records
    if (role === 'student') {
      if (!admissionNumber || !classId) {
        return res.status(400).json({ message: 'Students require admissionNumber and classId' });
      }

      // Check if admission number already exists
      const [existingStudent] = await sequelize.query(
        'SELECT id FROM Students WHERE admissionNumber = ?',
        { replacements: [admissionNumber], type: 'SELECT' }
      ) as any[];

      if (existingStudent) {
        return res.status(400).json({ message: 'Admission number already exists' });
      }

      await sequelize.query(`
        INSERT INTO Students (userId, admissionNumber, classId, house, dateOfBirth, guardianName, guardianPhone, address, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, {
        replacements: [userId, admissionNumber, classId, house || null, dateOfBirth || null, guardianName || null, guardianPhone || null, address || null],
        type: 'INSERT'
      });
    } else if (role === 'teacher' || role === 'exam_officer' || role === 'accountant') {
      if (!employeeId) {
        return res.status(400).json({ message: 'Staff members require employeeId' });
      }

      // Check if employee ID already exists
      const [existingStaff] = await sequelize.query(
        'SELECT id FROM Staff WHERE employeeId = ?',
        { replacements: [employeeId], type: 'SELECT' }
      ) as any[];

      if (existingStaff) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }

      await sequelize.query(`
        INSERT INTO Staff (userId, employeeId, qualification, experience, subjects, salary, isActive)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, {
        replacements: [
          userId, employeeId, qualification || null, experience || 0, subjects || null, salary || 0
        ],
        type: 'INSERT'
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      userId: userId,
      email: email,
      role: role
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Get all users (Admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = 'WHERE u.isActive = 1';
    let replacements: any[] = [];

    if (role && role !== 'all') {
      whereClause += ' AND u.role = ?';
      replacements.push(role);
    }

    const users = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.office, u.createdAt,
        s.admissionNumber, s.house, c.name as className,
        st.employeeId, st.qualification
      FROM Users u
      LEFT JOIN Students s ON u.id = s.userId AND s.isActive = 1
      LEFT JOIN Classes c ON s.classId = c.id
      LEFT JOIN Staff st ON u.id = st.userId AND st.isActive = 1
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, parseInt(limit as string), offset],
      type: 'SELECT'
    }) as any[];

    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      office: user.office,
      createdAt: user.createdAt,
      // Student specific fields
      admissionNumber: user.admissionNumber,
      house: user.house,
      className: user.className,
      // Staff specific fields
      employeeId: user.employeeId,
      qualification: user.qualification
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update user (Admin only)
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Update user record
    await sequelize.query(`
      UPDATE Users 
      SET firstName = ?, lastName = ?, email = ?, phone = ?, office = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [
        updateData.firstName, updateData.lastName, updateData.email,
        updateData.phone || null, updateData.office || null, id
      ],
      type: 'UPDATE'
    });

    res.json({
      message: 'User updated successfully',
      userId: id
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (Admin only)
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete user
    await sequelize.query(`
      UPDATE Users 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [id],
      type: 'UPDATE'
    });

    // Also soft delete related records
    await sequelize.query(`
      UPDATE Students 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ?
    `, {
      replacements: [id],
      type: 'UPDATE'
    });

    await sequelize.query(`
      UPDATE Staff 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ?
    `, {
      replacements: [id],
      type: 'UPDATE'
    });

    res.json({
      message: 'User deleted successfully',
      userId: id
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});