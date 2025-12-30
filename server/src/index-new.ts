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
// import sqliteStudentsRoutes from './routes/sqlite-students';

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
// app.use('/api/students', sqliteStudentsRoutes);

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

// Exam Officer Dashboard Stats
app.get('/api/dashboard/exam-officer-stats', async (req, res) => {
  try {
    // Get total results entered
    const [totalResults] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Results',
      { type: 'SELECT' }
    ) as any[];

    // Get results entered this month
    const [thisMonthResults] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Results WHERE strftime("%Y-%m", enteredAt) = strftime("%Y-%m", "now")',
      { type: 'SELECT' }
    ) as any[];

    // Get pending results (unpublished)
    const [pendingResults] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Results WHERE published = 0',
      { type: 'SELECT' }
    ) as any[];

    // Get total subjects
    const [totalSubjects] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Subjects',
      { type: 'SELECT' }
    ) as any[];

    // Get average score across all results
    const [avgScore] = await sequelize.query(
      'SELECT AVG(averageScore) as average FROM Results WHERE averageScore > 0',
      { type: 'SELECT' }
    ) as any[];

    res.json({
      totalResults: totalResults.count || 0,
      thisMonthResults: thisMonthResults.count || 0,
      pendingResults: pendingResults.count || 0,
      totalSubjects: totalSubjects.count || 0,
      averageScore: avgScore.average ? parseFloat(avgScore.average.toFixed(1)) : 0
    });
  } catch (error) {
    console.error('Error fetching exam officer stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Get recent results for exam officer dashboard
app.get('/api/results', async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '10');
    const page = parseInt((req.query.page as string) || '1');
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const academicYear = (req.query.academicYear as string) || '';
    const term = (req.query.term as string) || '';
    const className = (req.query.class as string) || '';

    // Build WHERE clause dynamically
    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];

    if (search) {
      whereClause += ' AND (u.firstName LIKE ? OR u.lastName LIKE ? OR s.admissionNumber LIKE ?)';
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm, searchTerm);
    }

    if (academicYear) {
      whereClause += ' AND r.academicYear = ?';
      replacements.push(academicYear);
    }

    if (term) {
      whereClause += ' AND r.term = ?';
      replacements.push(term);
    }

    if (className) {
      whereClause += ' AND c.name = ?';
      replacements.push(className);
    }

    const results = await sequelize.query(`
      SELECT 
        r.id, r.academicYear, r.term, r.totalScore, r.averageScore, 
        r.overallGrade, r.published, r.enteredAt, r.updatedAt,
        u.firstName || ' ' || u.lastName as studentName,
        s.admissionNumber,
        c.name as className
      FROM Results r
      JOIN Students s ON r.studentId = s.id
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON r.classId = c.id
      ${whereClause}
      ORDER BY r.updatedAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, limit, offset],
      type: 'SELECT'
    }) as any[];

    // Get total count for pagination with same filters
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM Results r
      JOIN Students s ON r.studentId = s.id
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON r.classId = c.id
      ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    res.json({
      results: results.map((result: any) => ({
        id: result.id,
        student: {
          name: result.studentName,
          admissionNumber: result.admissionNumber,
          class: result.className
        },
        academicYear: result.academicYear,
        term: result.term,
        totalScore: result.totalScore,
        averageScore: result.averageScore,
        grade: result.overallGrade,
        published: result.published,
        enteredAt: result.enteredAt,
        updatedAt: result.updatedAt
      })),
      pagination: {
        total: totalCount.count,
        page,
        limit,
        offset,
        totalPages: Math.ceil(totalCount.count / limit),
        hasMore: (offset + limit) < totalCount.count
      }
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
});

// Comments/Complaints Management for Exam Officer

// Get comments for exam officer
app.get('/api/comments', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = 'WHERE toRole = "exam_officer"';
    let replacements: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      replacements.push(status);
    }

    if (priority) {
      whereClause += ' AND priority = ?';
      replacements.push(priority);
    }

    if (category) {
      whereClause += ' AND category = ?';
      replacements.push(category);
    }

    const comments = await sequelize.query(`
      SELECT 
        c.id, c.subject as title, c.message, c.category, c.priority, c.status,
        c.reply as response, c.createdAt, c.updatedAt, c.repliedAt as respondedAt,
        c.fromUser as senderName,
        '' as senderEmail,
        c.fromRole as senderRole,
        c.repliedBy as respondedByName
      FROM Comments c
      ${whereClause}
      ORDER BY c.createdAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, parseInt(limit as string), offset],
      type: 'SELECT'
    }) as any[];

    // Get total count
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Comments c ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    res.json({
      comments: comments.map((comment: any) => ({
        id: comment.id,
        title: comment.title,
        content: comment.message,
        category: comment.category,
        priority: comment.priority,
        status: comment.status,
        response: comment.response,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        respondedAt: comment.respondedAt,
        submittedBy: {
          name: comment.senderName,
          role: comment.senderRole
        },
        submittedAt: comment.createdAt
      })),
      pagination: {
        current: parseInt(page as string),
        pages: Math.ceil(totalCount.count / parseInt(limit as string)),
        total: totalCount.count
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update comment status
app.patch('/api/comments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await sequelize.query(`
      UPDATE Comments 
      SET status = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND toRole = "exam_officer"
    `, {
      replacements: [status, id],
      type: 'UPDATE'
    });

    // Get updated comment
    const [updatedComment] = await sequelize.query(`
      SELECT 
        c.id, c.subject as title, c.message, c.category, c.priority, c.status,
        c.reply as response, c.createdAt, c.updatedAt, c.repliedAt as respondedAt,
        c.fromUser as senderName,
        '' as senderEmail,
        c.fromRole as senderRole
      FROM Comments c
      WHERE c.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (!updatedComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json({
      id: updatedComment.id,
      title: updatedComment.title,
      content: updatedComment.message,
      category: updatedComment.category,
      priority: updatedComment.priority,
      status: updatedComment.status,
      response: updatedComment.response,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
      respondedAt: updatedComment.respondedAt,
      submittedBy: {
        name: updatedComment.senderName,
        role: updatedComment.senderRole
      },
      submittedAt: updatedComment.createdAt
    });
  } catch (error) {
    console.error('Update comment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to comment
app.patch('/api/comments/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({ message: 'Response is required' });
    }

    await sequelize.query(`
      UPDATE Comments 
      SET reply = ?, status = "read", repliedAt = CURRENT_TIMESTAMP, repliedBy = "Exam Officer", updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND toRole = "exam_officer"
    `, {
      replacements: [response, id],
      type: 'UPDATE'
    });

    // Get updated comment
    const [updatedComment] = await sequelize.query(`
      SELECT 
        c.id, c.subject as title, c.message, c.category, c.priority, c.status,
        c.reply as response, c.createdAt, c.updatedAt, c.repliedAt as respondedAt,
        c.fromUser as senderName,
        '' as senderEmail,
        c.fromRole as senderRole,
        c.repliedBy as respondedByName
      FROM Comments c
      WHERE c.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (!updatedComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json({
      id: updatedComment.id,
      title: updatedComment.title,
      content: updatedComment.message,
      category: updatedComment.category,
      priority: updatedComment.priority,
      status: updatedComment.status,
      response: updatedComment.response,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
      respondedAt: updatedComment.respondedAt,
      submittedBy: {
        name: updatedComment.senderName,
        role: updatedComment.senderRole
      },
      submittedAt: updatedComment.createdAt,
      respondedBy: updatedComment.respondedByName
    });
  } catch (error) {
    console.error('Respond to comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments statistics for exam officer
app.get('/api/comments/stats', async (req, res) => {
  try {
    // Total comments for exam officer
    const [totalComments] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Comments WHERE toRole = "exam_officer"
    `, { type: 'SELECT' }) as any[];

    // Unread comments
    const [unreadComments] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Comments WHERE toRole = "exam_officer" AND status = "unread"
    `, { type: 'SELECT' }) as any[];

    // Pending response
    const [pendingComments] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Comments WHERE toRole = "exam_officer" AND status IN ("unread", "read")
    `, { type: 'SELECT' }) as any[];

    // High priority comments
    const [highPriorityComments] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Comments WHERE toRole = "exam_officer" AND priority = "high"
    `, { type: 'SELECT' }) as any[];

    // Comments by category
    const commentsByCategory = await sequelize.query(`
      SELECT category, COUNT(*) as count 
      FROM Comments 
      WHERE toRole = "exam_officer"
      GROUP BY category
      ORDER BY count DESC
    `, { type: 'SELECT' }) as any[];

    // Recent comments (last 7 days)
    const [recentComments] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM Comments 
      WHERE toRole = "exam_officer" 
      AND date(createdAt) >= date('now', '-7 days')
    `, { type: 'SELECT' }) as any[];

    res.json({
      totalComments: totalComments.count,
      unreadComments: unreadComments.count,
      pendingComments: pendingComments.count,
      highPriorityComments: highPriorityComments.count,
      recentComments: recentComments.count,
      commentsByCategory: commentsByCategory
    });
  } catch (error) {
    console.error('Get comments stats error:', error);
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

// Students by class distribution (real data)
app.get('/api/dashboard/students-by-class', async (req, res) => {
  try {
    const classDistribution = await sequelize.query(`
      SELECT 
        c.name as className,
        c.level,
        c.capacity,
        COUNT(s.id) as count,
        u.firstName || ' ' || u.lastName as classTeacher
      FROM Classes c
      LEFT JOIN Students s ON c.id = s.classId AND s.isActive = 1
      LEFT JOIN Users u ON c.classTeacher = u.id
      GROUP BY c.id, c.name, c.level, c.capacity
      ORDER BY c.level, c.name
    `, { type: 'SELECT' }) as any[];

    const formattedData = classDistribution.map((cls: any) => ({
      _id: cls.className,
      className: cls.className,
      level: cls.level,
      count: cls.count,
      capacity: cls.capacity,
      classTeacher: cls.classTeacher,
      utilization: cls.capacity > 0 ? ((cls.count / cls.capacity) * 100).toFixed(1) : 0
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching class distribution:', error);
    res.status(500).json({ message: 'Failed to fetch class distribution' });
  }
});

// Financial summary (real data)
app.get('/api/dashboard/financial-summary', async (req, res) => {
  try {
    // Overall financial summary
    const [overallSummary] = await sequelize.query(`
      SELECT 
        SUM(amount) as totalAmount,
        SUM(amountPaid) as totalPaid,
        SUM(balance) as totalBalance,
        COUNT(*) as totalPayments,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as confirmedPayments,
        COUNT(CASE WHEN status = 'pending' OR status = 'overdue' THEN 1 END) as pendingPayments
      FROM Payments
    `, { type: 'SELECT' }) as any[];

    // Monthly revenue breakdown
    const monthlyRevenue = await sequelize.query(`
      SELECT 
        strftime('%Y-%m', paymentDate) as yearMonth,
        strftime('%m', paymentDate) as month,
        SUM(amountPaid) as amount,
        COUNT(*) as transactions
      FROM Payments 
      WHERE amountPaid > 0
      GROUP BY strftime('%Y-%m', paymentDate)
      ORDER BY yearMonth DESC
      LIMIT 12
    `, { type: 'SELECT' }) as any[];

    // Payment type breakdown
    const paymentTypes = await sequelize.query(`
      SELECT 
        paymentType,
        SUM(amount) as totalAmount,
        SUM(amountPaid) as totalPaid,
        COUNT(*) as count
      FROM Payments
      GROUP BY paymentType
      ORDER BY totalAmount DESC
    `, { type: 'SELECT' }) as any[];

    // Calculate payment rate
    const paymentRate = overallSummary.totalAmount > 0 ? 
      ((overallSummary.totalPaid / overallSummary.totalAmount) * 100).toFixed(1) : '0';

    // Calculate net balance (income minus any expenses - for now just showing income)
    const netBalance = overallSummary.totalPaid || 0;

    // Format monthly data
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formattedMonthlyRevenue = monthlyRevenue.map((month: any) => ({
      month: monthNames[parseInt(month.month)],
      yearMonth: month.yearMonth,
      amount: month.amount,
      transactions: month.transactions
    }));

    res.json({
      totalAmount: overallSummary.totalAmount || 0,
      totalPaid: overallSummary.totalPaid || 0,
      totalBalance: overallSummary.totalBalance || 0,
      netBalance: netBalance,
      totalExpenditure: 0, // To be implemented when expense tracking is added
      confirmedPayments: overallSummary.confirmedPayments || 0,
      pendingPayments: overallSummary.pendingPayments || 0,
      paymentRate: parseFloat(paymentRate),
      monthlyRevenue: formattedMonthlyRevenue,
      paymentTypes: paymentTypes
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ message: 'Failed to fetch financial summary' });
  }
});

// Academic summary (real data)
app.get('/api/dashboard/academic-summary', async (req, res) => {
  try {
    // Overall academic statistics
    const [overallStats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT r.id) as totalResults,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.published = 1 THEN 1 END) as publishedResults,
        COUNT(CASE WHEN r.published = 0 THEN 1 END) as pendingResults,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) as passedResults,
        COUNT(CASE WHEN r.averageScore >= 80 THEN 1 END) as excellentResults
      FROM Results r
    `, { type: 'SELECT' }) as any[];

    // Subject performance breakdown
    const subjectPerformance = await sequelize.query(`
      SELECT 
        s.name as subject,
        s.code,
        AVG(sr.total) as averageScore,
        COUNT(*) as totalEntries,
        COUNT(CASE WHEN sr.total >= 50 THEN 1 END) as passedEntries,
        COUNT(CASE WHEN sr.total >= 80 THEN 1 END) as excellentEntries
      FROM SubjectResults sr
      JOIN Subjects s ON sr.subjectId = s.id
      JOIN Results r ON sr.resultId = r.id
      WHERE r.published = 1
      GROUP BY s.id, s.name, s.code
      ORDER BY averageScore DESC
    `, { type: 'SELECT' }) as any[];

    // Calculate rates
    const passRate = overallStats.totalResults > 0 ? 
      ((overallStats.passedResults / overallStats.totalResults) * 100).toFixed(1) : '0';
    
    const excellenceRate = overallStats.totalResults > 0 ? 
      ((overallStats.excellentResults / overallStats.totalResults) * 100).toFixed(1) : '0';

    // Format subject performance
    const formattedSubjectPerformance = subjectPerformance.map((subject: any) => ({
      subject: subject.subject,
      code: subject.code,
      averageScore: parseFloat(subject.averageScore?.toFixed(1) || '0'),
      totalEntries: subject.totalEntries,
      passRate: subject.totalEntries > 0 ? 
        ((subject.passedEntries / subject.totalEntries) * 100).toFixed(1) : '0',
      excellenceRate: subject.totalEntries > 0 ? 
        ((subject.excellentEntries / subject.totalEntries) * 100).toFixed(1) : '0'
    }));

    // Get total subjects count
    const [subjectCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Subjects',
      { type: 'SELECT' }
    ) as any[];

    res.json({
      totalSubjects: subjectCount.count || 0,
      totalResults: overallStats.totalResults || 0,
      publishedResults: overallStats.publishedResults || 0,
      pendingResults: overallStats.pendingResults || 0,
      averageScore: parseFloat(overallStats.averageScore?.toFixed(1) || '0'),
      passRate: parseFloat(passRate),
      excellenceRate: parseFloat(excellenceRate),
      subjectPerformance: formattedSubjectPerformance
    });
  } catch (error) {
    console.error('Error fetching academic summary:', error);
    res.status(500).json({ message: 'Failed to fetch academic summary' });
  }
});

// Reports summary (real data from comments/complaints)
app.get('/api/dashboard/reports-summary', async (req, res) => {
  try {
    // Get comments/complaints summary
    const [commentsSummary] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalReports,
        COUNT(CASE WHEN status = 'unread' THEN 1 END) as pendingReports,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as resolvedReports
      FROM Comments
    `, { type: 'SELECT' }) as any[];

    // Get reports by recipient (category)
    const reportsByType = await sequelize.query(`
      SELECT 
        toRole as category,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'unread' THEN 1 END) as pending
      FROM Comments
      GROUP BY toRole
      ORDER BY count DESC
    `, { type: 'SELECT' }) as any[];

    // Get reports by priority
    const reportsByPriority = await sequelize.query(`
      SELECT 
        priority,
        COUNT(*) as count
      FROM Comments
      WHERE priority IS NOT NULL
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'normal' THEN 2 
          WHEN 'low' THEN 3 
        END
    `, { type: 'SELECT' }) as any[];

    // Format category data
    const formattedCategories = reportsByType.map((type: any) => ({
      category: type.category === 'admin' ? 'Administrative' : 
                type.category === 'exam_officer' ? 'Academic' : 
                type.category,
      count: type.count,
      pending: type.pending
    }));

    res.json({
      totalReports: commentsSummary.totalReports || 0,
      pendingReports: commentsSummary.pendingReports || 0,
      resolvedReports: commentsSummary.resolvedReports || 0,
      byType: formattedCategories,
      byPriority: reportsByPriority,
      total: {
        totalReports: commentsSummary.totalReports || 0,
        pendingReports: commentsSummary.pendingReports || 0,
        resolvedReports: commentsSummary.resolvedReports || 0
      }
    });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ message: 'Failed to fetch reports summary' });
  }
});

// ==================== REPORT GENERATION ENDPOINTS ====================

// Generate term report
app.get('/api/reports/term-report', async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    
    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    // Get overall statistics for the term
    const [overallStats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT r.studentId) as totalStudents,
        COUNT(r.id) as totalResults,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate
      FROM Results r
      WHERE r.academicYear = ? AND r.term = ?
    `, { 
      replacements: [academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    // Return simple mock data for term report
    const reportData = {
      academicYear,
      term,
      totalStudents: overallStats.totalStudents || 0,
      totalResults: overallStats.totalResults || 0,
      averageScore: parseFloat((overallStats.averageScore || 0).toFixed(2)),
      passRate: parseFloat((overallStats.passRate || 0).toFixed(2)),
      subjectPerformance: [
        {
          subject: 'Mathematics',
          averageScore: 78.5,
          passRate: 82.0,
          totalEntries: 120
        },
        {
          subject: 'English Language',
          averageScore: 76.2,
          passRate: 88.5,
          totalEntries: 120
        }
      ],
      classPerformance: [
        {
          class: 'JSS 1A',
          averageScore: 77.8,
          passRate: 90.0,
          totalStudents: 30
        }
      ],
      gradeDistribution: [
        { grade: 'A', count: 25, percentage: 20.8 },
        { grade: 'B', count: 35, percentage: 29.2 },
        { grade: 'C', count: 40, percentage: 33.3 }
      ]
    };

    res.json(reportData);
  } catch (error) {
    console.error('Error generating term report:', error);
    res.status(500).json({ message: 'Failed to generate term report' });
  }
});

// Classes CRUD endpoints (real database implementation)
app.get('/api/classes', async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const level = (req.query.level as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];
    
    // Add search filter
    if (search) {
      whereClause += ' AND (c.name LIKE ? OR c.level LIKE ?)';
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm);
    }
    
    // Add level filter
    if (level) {
      whereClause += ' AND c.level = ?';
      replacements.push(level);
    }
    
    // Get classes with teacher information
    const classesQuery = `
      SELECT 
        c.id, c.name, c.level, c.capacity, c.createdAt, c.updatedAt,
        u.firstName || ' ' || u.lastName as classTeacherName,
        u.id as classTeacherId,
        COUNT(s.id) as studentCount
      FROM Classes c
      LEFT JOIN Users u ON c.classTeacher = u.id
      LEFT JOIN Students s ON c.id = s.classId AND s.isActive = 1
      ${whereClause}
      GROUP BY c.id, c.name, c.level, c.capacity, c.createdAt, c.updatedAt, u.firstName, u.lastName, u.id
      ORDER BY c.level, c.name
      LIMIT ? OFFSET ?
    `;
    
    const classes = await sequelize.query(classesQuery, {
      replacements: [...replacements, limit, offset],
      type: 'SELECT'
    }) as any[];
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Classes c
      ${whereClause}
    `;
    
    const [countResult] = await sequelize.query(countQuery, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];
    
    // Format class data
    const formattedClasses = classes.map((cls: any) => ({
      id: cls.id,
      name: cls.name,
      level: cls.level,
      capacity: cls.capacity,
      studentCount: cls.studentCount,
      classTeacher: cls.classTeacherName ? {
        id: cls.classTeacherId,
        name: cls.classTeacherName
      } : null,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt
    }));
    
    res.json({
      classes: formattedClasses,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// Add new class
app.post('/api/classes', async (req, res) => {
  try {
    const { name, level, capacity, classTeacher } = req.body;
    
    // Validate required fields
    if (!name || !level) {
      return res.status(400).json({ message: 'Name and level are required' });
    }
    
    // Check if class name already exists
    const [existingClass] = await sequelize.query(
      'SELECT id FROM Classes WHERE name = ?',
      { replacements: [name], type: 'SELECT' }
    ) as any[];
    
    if (existingClass) {
      return res.status(400).json({ message: 'Class name already exists' });
    }
    
    // Create class record
    const [classResult] = await sequelize.query(`
      INSERT INTO Classes (name, level, capacity, classTeacher)
      VALUES (?, ?, ?, ?)
    `, { 
      replacements: [name, level, capacity || 30, classTeacher || null],
      type: 'INSERT'
    }) as any[];
    
    // Get the complete class data with teacher info
    const [newClass] = await sequelize.query(`
      SELECT 
        c.id, c.name, c.level, c.capacity, c.createdAt, c.updatedAt,
        u.firstName || ' ' || u.lastName as classTeacherName,
        u.id as classTeacherId
      FROM Classes c
      LEFT JOIN Users u ON c.classTeacher = u.id
      WHERE c.id = ?
    `, { replacements: [classResult], type: 'SELECT' }) as any[];
    
    res.status(201).json({
      message: 'Class added successfully',
      class: {
        id: newClass.id,
        name: newClass.name,
        level: newClass.level,
        capacity: newClass.capacity,
        studentCount: 0,
        classTeacher: newClass.classTeacherName ? {
          id: newClass.classTeacherId,
          name: newClass.classTeacherName
        } : null,
        createdAt: newClass.createdAt,
        updatedAt: newClass.updatedAt
      }
    });
  } catch (error) {
    console.error('Error adding class:', error);
    res.status(500).json({ message: 'Failed to add class' });
  }
});

// Update class
app.put('/api/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, level, capacity, classTeacher } = req.body;
    
    // Check if class exists
    const [existingClass] = await sequelize.query(
      'SELECT id FROM Classes WHERE id = ?',
      { replacements: [id], type: 'SELECT' }
    ) as any[];
    
    if (!existingClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if new name conflicts with existing class (excluding current class)
    if (name) {
      const [nameConflict] = await sequelize.query(
        'SELECT id FROM Classes WHERE name = ? AND id != ?',
        { replacements: [name, id], type: 'SELECT' }
      ) as any[];
      
      if (nameConflict) {
        return res.status(400).json({ message: 'Class name already exists' });
      }
    }
    
    // Update class information
    await sequelize.query(`
      UPDATE Classes 
      SET name = ?, level = ?, capacity = ?, classTeacher = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { 
      replacements: [name, level, capacity || 30, classTeacher || null, id],
      type: 'UPDATE'
    });
    
    // Get updated class data
    const [updatedClass] = await sequelize.query(`
      SELECT 
        c.id, c.name, c.level, c.capacity, c.createdAt, c.updatedAt,
        u.firstName || ' ' || u.lastName as classTeacherName,
        u.id as classTeacherId,
        COUNT(s.id) as studentCount
      FROM Classes c
      LEFT JOIN Users u ON c.classTeacher = u.id
      LEFT JOIN Students s ON c.id = s.classId AND s.isActive = 1
      WHERE c.id = ?
      GROUP BY c.id, c.name, c.level, c.capacity, c.createdAt, c.updatedAt, u.firstName, u.lastName, u.id
    `, { replacements: [id], type: 'SELECT' }) as any[];
    
    res.json({
      message: 'Class updated successfully',
      class: {
        id: updatedClass.id,
        name: updatedClass.name,
        level: updatedClass.level,
        capacity: updatedClass.capacity,
        studentCount: updatedClass.studentCount,
        classTeacher: updatedClass.classTeacherName ? {
          id: updatedClass.classTeacherId,
          name: updatedClass.classTeacherName
        } : null,
        createdAt: updatedClass.createdAt,
        updatedAt: updatedClass.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: 'Failed to update class' });
  }
});

// Delete class
app.delete('/api/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if class exists
    const [existingClass] = await sequelize.query(
      'SELECT name FROM Classes WHERE id = ?',
      { replacements: [id], type: 'SELECT' }
    ) as any[];
    
    if (!existingClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if class has active students
    const [studentCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Students WHERE classId = ? AND isActive = 1',
      { replacements: [id], type: 'SELECT' }
    ) as any[];
    
    if (studentCount.count > 0) {
      return res.status(400).json({ 
        message: `Cannot delete class. It has ${studentCount.count} active student(s). Please move students to other classes first.` 
      });
    }
    
    // Delete the class
    await sequelize.query(`
      DELETE FROM Classes WHERE id = ?
    `, { replacements: [id], type: 'DELETE' });
    
    res.json({
      message: 'Class deleted successfully',
      classId: id,
      className: existingClass.name
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Failed to delete class' });
  }
});

// Get individual student details
app.get('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [student] = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.house, s.dateOfBirth, s.guardianName, s.guardianPhone,
        s.address, s.bloodGroup, s.medicalConditions, s.isActive, s.createdAt,
        u.firstName, u.lastName, u.email, u.phone,
        c.id as classId, c.name as className, c.level
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      WHERE s.id = ? AND s.isActive = 1
    `, { replacements: [id], type: 'SELECT' }) as any[];
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      class: {
        id: student.classId,
        name: student.className,
        level: student.level
      },
      house: student.house,
      dateOfBirth: student.dateOfBirth,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      address: student.address,
      bloodGroup: student.bloodGroup,
      medicalConditions: student.medicalConditions,
      isActive: student.isActive,
      createdAt: student.createdAt
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Failed to fetch student' });
  }
});

// Students endpoint (real database implementation)
app.get('/api/students', async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const classId = (req.query.classId as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE s.isActive = 1';
    let replacements: any[] = [];
    
    // Add search filter
    if (search) {
      whereClause += ' AND (u.firstName LIKE ? OR u.lastName LIKE ? OR s.admissionNumber LIKE ?)';
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add class filter
    if (classId) {
      whereClause += ' AND s.classId = ?';
      replacements.push(classId);
    }
    
    // Get students with pagination
    const studentsQuery = `
      SELECT 
        s.id, s.admissionNumber, s.house, s.dateOfBirth, s.guardianName, s.guardianPhone,
        s.address, s.bloodGroup, s.medicalConditions, s.isActive, s.createdAt,
        u.firstName, u.lastName, u.email, u.phone,
        c.id as classId, c.name as className, c.level
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      ${whereClause}
      ORDER BY s.admissionNumber
      LIMIT ? OFFSET ?
    `;
    
    const students = await sequelize.query(studentsQuery, {
      replacements: [...replacements, limit, offset],
      type: 'SELECT'
    }) as any[];
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      ${whereClause}
    `;
    
    const [countResult] = await sequelize.query(countQuery, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];
    
    // Format student data
    const formattedStudents = students.map((student: any) => ({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      class: {
        id: student.classId,
        name: student.className,
        level: student.level
      },
      house: student.house,
      dateOfBirth: student.dateOfBirth,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      address: student.address,
      bloodGroup: student.bloodGroup,
      medicalConditions: student.medicalConditions,
      isActive: student.isActive,
      createdAt: student.createdAt
    }));
    
    res.json({
      students: formattedStudents,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

// Student search by admission number
app.get('/api/students/search/admission/:admissionNum', (req, res) => {
  const { admissionNum } = req.params;
  
  // Mock students data (same as in /api/students endpoint)
  const students = [
    {
      id: 1,
      admissionNumber: 'SHA/2023/001',
      firstName: 'John',
      lastName: 'Student',
      class: 'JSS 2A',
      house: 'Blue House',
      email: 'john.student@example.com',
      phone: '08012345678'
    },
    {
      id: 2,
      admissionNumber: 'SHA/2023/002',
      firstName: 'Jane',
      lastName: 'Doe',
      class: 'JSS 2A',
      house: 'Red House',
      email: 'jane.doe@example.com',
      phone: '08087654321'
    },
    {
      id: 3,
      admissionNumber: 'SHA/2023/003',
      firstName: 'Mike',
      lastName: 'Johnson',
      class: 'JSS 1A',
      house: 'Green House',
      email: 'mike.johnson@example.com',
      phone: '08098765432'
    }
  ];
  
  // Search for student by admission number
  const student = students.find(s => s.admissionNumber === admissionNum);
  
  if (student) {
    res.json(student);
  } else {
    res.status(404).json({ message: 'Student not found' });
  }
});



// Results endpoints
app.get('/api/results/student/current', async (req, res) => {
  try {
    const academicYear = (req.query.academicYear as string) || '2024/2025';
    const term = (req.query.term as string) || 'second';
    
    // Get student ID (in real app, from authenticated user)
    const studentId = 1; // For demo, using first student
    
    // First get the student results summary
    const studentResultsQuery = `
      SELECT 
        sr.id, sr.academicYear, sr.term, sr.totalSubjects, sr.totalScore, 
        sr.averageScore, sr.grade, sr.position, sr.totalStudents, sr.remarks,
        sr.nextTermBegins, sr.published, sr.publishedAt
      FROM StudentResults sr
      WHERE sr.studentId = ? AND sr.academicYear = ? AND sr.term = ? AND sr.published = 1
    `;
    
    const studentResults = await sequelize.query(studentResultsQuery, {
      replacements: [studentId, academicYear, term],
      type: 'SELECT'
    }) as any[];
    
    if (studentResults.length === 0) {
      return res.json([]);
    }
    
    // Get individual subject results
    const subjectResultsQuery = `
      SELECT 
        r.ca1, r.ca2, r.exam, r.total, r.grade,
        s.name as subjectName, s.code as subjectCode
      FROM Results r
      JOIN Subjects s ON r.subjectId = s.id
      WHERE r.studentId = ? AND r.academicYear = ? AND r.term = ?
      ORDER BY s.name
    `;
    
    const subjectResults = await sequelize.query(subjectResultsQuery, {
      replacements: [studentId, academicYear, term],
      type: 'SELECT'
    }) as any[];
    
    // Format the response
    const result = studentResults[0] as any;
    const formattedResult = {
      _id: result.id,
      academicYear: result.academicYear,
      term: result.term,
      totalScore: result.totalScore,
      averageScore: result.averageScore,
      grade: result.grade,
      position: result.position,
      totalStudents: result.totalStudents,
      remarks: result.remarks,
      nextTermBegins: result.nextTermBegins,
      publishedAt: result.publishedAt,
      subjects: subjectResults.map((subject: any) => ({
        subject: subject.subjectName,
        name: subject.subjectName,
        code: subject.subjectCode,
        ca1: subject.ca1,
        ca2: subject.ca2,
        exam: subject.exam,
        score: subject.total,
        total: subject.total,
        grade: subject.grade,
        remark: subject.grade === 'A' ? 'Excellent' : 
                subject.grade === 'B' ? 'Very Good' : 
                subject.grade === 'C' ? 'Good' : 
                subject.grade === 'D' ? 'Fair' : 
                subject.grade === 'E' ? 'Pass' : 'Fail'
      }))
    };
    
    res.json([formattedResult]);
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
});



app.get('/api/results/:id/transcript', (req, res) => {
  res.json({
    message: 'Transcript generated successfully',
    downloadUrl: '/downloads/transcript_' + req.params.id + '.pdf'
  });
});

// Attendance endpoints
app.get('/api/attendance/student/current', async (req, res) => {
  try {
    const academicYear = (req.query.academicYear as string) || '2024/2025';
    const term = (req.query.term as string) || 'second';
    
    // Get student ID (in real app, from authenticated user)
    const studentId = 1; // For demo, using first student
    
    // Get attendance summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as totalDays,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentDays,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as lateDays,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excusedDays
      FROM Attendance 
      WHERE studentId = ? AND academicYear = ? AND term = ?
    `;
    
    const [summary] = await sequelize.query(summaryQuery, {
      replacements: [studentId, academicYear, term],
      type: 'SELECT'
    }) as any[];
    
    // Get monthly breakdown
    const monthlyQuery = `
      SELECT 
        strftime('%m', attendanceDate) as month,
        strftime('%Y-%m', attendanceDate) as yearMonth,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
      FROM Attendance 
      WHERE studentId = ? AND academicYear = ? AND term = ?
      GROUP BY strftime('%Y-%m', attendanceDate)
      ORDER BY yearMonth
    `;
    
    const monthlyData = await sequelize.query(monthlyQuery, {
      replacements: [studentId, academicYear, term],
      type: 'SELECT'
    }) as any[];
    
    // Convert month numbers to names
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const formattedMonthlyData = monthlyData.map((month: any) => ({
      month: monthNames[parseInt(month.month)],
      present: month.present,
      absent: month.absent,
      total: month.total,
      percentage: month.total > 0 ? ((month.present / month.total) * 100).toFixed(1) : 0
    }));
    
    const percentage = summary.totalDays > 0 ? 
      ((summary.presentDays / summary.totalDays) * 100).toFixed(1) : '0';
    
    res.json({
      academicYear,
      term,
      presentDays: summary.presentDays || 0,
      absentDays: summary.absentDays || 0,
      lateDays: summary.lateDays || 0,
      excusedDays: summary.excusedDays || 0,
      totalDays: summary.totalDays || 0,
      percentage: parseFloat(percentage),
      monthlyData: formattedMonthlyData
    });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    res.status(500).json({ message: 'Failed to fetch attendance data' });
  }
});

// Payments endpoints
app.get('/api/payments/student/current', async (req, res) => {
  try {
    const academicYear = (req.query.academicYear as string) || '2024/2025';
    const term = (req.query.term as string) || 'second';
    
    // Get student ID (in real app, from authenticated user)
    const studentId = 1; // For demo, using first student
    
    const paymentsQuery = `
      SELECT 
        p.id, p.academicYear, p.term, p.paymentType, p.amount, p.amountPaid, 
        p.balance, p.paymentDate, p.dueDate, p.status, p.paymentMethod, 
        p.receiptNumber, p.description, p.confirmedAt,
        u.firstName || ' ' || u.lastName as confirmedByName
      FROM Payments p
      LEFT JOIN Users u ON p.confirmedBy = u.id
      WHERE p.studentId = ? AND p.academicYear = ? AND p.term = ?
      ORDER BY p.dueDate DESC
    `;
    
    const payments = await sequelize.query(paymentsQuery, {
      replacements: [studentId, academicYear, term],
      type: 'SELECT'
    }) as any[];
    
    const formattedPayments = payments.map((payment: any) => ({
      _id: payment.id,
      id: payment.id,
      academicYear: payment.academicYear,
      term: payment.term,
      paymentType: payment.paymentType,
      amount: payment.amount,
      amountPaid: payment.amountPaid,
      balance: payment.balance,
      paymentDate: payment.paymentDate,
      dueDate: payment.dueDate,
      paidDate: payment.confirmedAt,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      receiptNumber: payment.receiptNumber,
      description: payment.description,
      confirmedBy: payment.confirmedByName
    }));
    
    res.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payment data:', error);
    res.status(500).json({ message: 'Failed to fetch payment data' });
  }
});

app.get('/api/payments/:id/receipt', (req, res) => {
  res.json({
    message: 'Receipt generated successfully',
    downloadUrl: '/downloads/receipt_' + req.params.id + '.pdf'
  });
});

// Complaints endpoint
app.post('/api/complaints', (req, res) => {
  res.json({
    message: 'Complaint submitted successfully',
    complaintId: 'complaint_' + Date.now()
  });
});

// School content for homepage
app.get('/school-content', (req, res) => {
  res.json({
    schoolName: 'Shambil Pride Academy Birnin Gwari',
    motto: 'Excellence in Education, Character Building, and Academic Achievement',
    about: {
      title: 'About Us',
      content: `Shambil Pride Academy Birnin Gwari is a premier educational institution committed to providing quality education and character development for students in Kaduna State, Nigeria.

Our school was established with the vision of creating a nurturing environment where students can excel academically while developing strong moral values and leadership skills.

We offer comprehensive education from primary to secondary levels, with experienced teachers and modern facilities to support our students' learning journey.`
    },
    history: {
      title: 'Our History',
      content: `Founded in 2010, Shambil Pride Academy has grown from a small community school to one of the most respected educational institutions in Birnin Gwari.

Our journey began with just 50 students and 5 teachers. Today, we proudly serve over 500 students with a dedicated team of 40+ qualified educators.

Throughout our history, we have maintained our commitment to academic excellence and character development, producing graduates who excel in higher education and contribute positively to society.`
    },
    aims_objectives: {
      title: 'Aims & Objectives',
      content: `Our primary aims and objectives include:

• To provide quality education that meets international standards
• To develop students' intellectual, physical, and moral capabilities
• To foster critical thinking and problem-solving skills
• To prepare students for higher education and future careers
• To instill values of integrity, respect, and social responsibility
• To create a supportive learning environment for all students
• To promote innovation and creativity in teaching and learning`
    },
    gallery: {
      title: 'Gallery',
      content: `Explore our beautiful campus and vibrant school life through our photo gallery.

Our modern facilities include:
- Well-equipped classrooms with smart boards
- Science and computer laboratories
- Library with extensive book collection
- Sports facilities and playground
- Auditorium for events and assemblies
- Cafeteria serving nutritious meals

Visit our school to see these facilities in person and experience our welcoming atmosphere.`
    },
    news: {
      title: 'News & Events',
      content: `Stay updated with the latest news and events at Shambil Pride Academy:

📅 Upcoming Events:
• Parent-Teacher Conference - January 15, 2024
• Inter-House Sports Competition - February 10-12, 2024
• Science Fair - March 5, 2024
• Graduation Ceremony - June 20, 2024

📰 Recent News:
• New Computer Laboratory Opened
• Outstanding Performance in State Examinations
• Community Service Project Launched
• New Teaching Staff Welcomed`
    },
    achievements: {
      title: 'Achievements',
      content: `We are proud of our students' outstanding achievements:

🏆 Academic Excellence:
• 98% pass rate in WAEC examinations
• 95% pass rate in NECO examinations
• Multiple scholarship recipients to universities
• State-level competition winners

🏅 Sports & Extra-curricular:
• Regional football champions 2023
• State debate competition winners
• Science quiz competition finalists
• Cultural dance festival participants

🌟 Recognition:
• Best Private School Award - Kaduna State 2022
• Excellence in Education Award 2023
• Community Impact Recognition 2023`
    }
  });
});

// Update school content (Admin only)
app.put('/api/school-content', async (req, res) => {
  try {
    // In a real app, you'd verify admin authentication here
    const updatedContent = req.body;
    
    // For now, we'll just return success
    // In a real implementation, you'd save to database
    res.json({
      message: 'Content updated successfully',
      content: updatedContent
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update content' });
  }
});

// Add new student (real database implementation)
app.post('/api/students', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      classId, 
      house, 
      admissionNumber,
      dateOfBirth,
      guardianName,
      guardianPhone,
      address,
      bloodGroup,
      medicalConditions
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !admissionNumber || !classId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if admission number already exists
    const [existingStudent] = await sequelize.query(
      'SELECT id FROM Students WHERE admissionNumber = ?',
      { replacements: [admissionNumber], type: 'SELECT' }
    ) as any[];
    
    if (existingStudent) {
      return res.status(400).json({ message: 'Admission number already exists' });
    }
    
    // Check if email already exists
    const [existingUser] = await sequelize.query(
      'SELECT id FROM Users WHERE email = ?',
      { replacements: [email], type: 'SELECT' }
    ) as any[];
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Create user account first
    const [userResult] = await sequelize.query(`
      INSERT INTO Users (firstName, lastName, email, password, role, phone, isActive)
      VALUES (?, ?, ?, ?, 'student', ?, 1)
    `, { 
      replacements: [firstName, lastName, email, 'student123', phone || ''],
      type: 'INSERT'
    }) as any[];
    
    const userId = userResult;
    
    // Create student record
    const [studentResult] = await sequelize.query(`
      INSERT INTO Students (
        userId, admissionNumber, classId, house, dateOfBirth, 
        guardianName, guardianPhone, address, bloodGroup, medicalConditions, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, { 
      replacements: [
        userId, admissionNumber, classId, house || '', dateOfBirth || null,
        guardianName || '', guardianPhone || '', address || '', 
        bloodGroup || '', medicalConditions || ''
      ],
      type: 'INSERT'
    }) as any[];
    
    // Get the complete student data with class info
    const [newStudent] = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.house, s.dateOfBirth, s.guardianName, s.guardianPhone,
        s.address, s.bloodGroup, s.medicalConditions, s.isActive,
        u.firstName, u.lastName, u.email, u.phone,
        c.name as className, c.level
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      WHERE s.id = ?
    `, { replacements: [studentResult], type: 'SELECT' }) as any[];
    
    res.status(201).json({
      message: 'Student added successfully',
      student: {
        id: newStudent.id,
        admissionNumber: newStudent.admissionNumber,
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        email: newStudent.email,
        phone: newStudent.phone,
        class: {
          id: classId,
          name: newStudent.className,
          level: newStudent.level
        },
        house: newStudent.house,
        dateOfBirth: newStudent.dateOfBirth,
        guardianName: newStudent.guardianName,
        guardianPhone: newStudent.guardianPhone,
        address: newStudent.address,
        bloodGroup: newStudent.bloodGroup,
        medicalConditions: newStudent.medicalConditions,
        isActive: newStudent.isActive
      }
    });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ message: 'Failed to add student' });
  }
});

// Add new staff/teacher (real database implementation)
app.post('/api/teachers', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      role, 
      office,
      employeeId,
      dateOfBirth,
      address,
      qualification,
      experience,
      subjects,
      salary
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if email already exists
    const [existingUser] = await sequelize.query(
      'SELECT id FROM Users WHERE email = ?',
      { replacements: [email], type: 'SELECT' }
    ) as any[];
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Check if employee ID already exists (if provided)
    if (employeeId) {
      const [existingStaff] = await sequelize.query(
        'SELECT id FROM Staff WHERE employeeId = ?',
        { replacements: [employeeId], type: 'SELECT' }
      ) as any[];
      
      if (existingStaff) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }
    
    // Create user account first
    const [userResult] = await sequelize.query(`
      INSERT INTO Users (firstName, lastName, email, password, role, office, phone, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, { 
      replacements: [firstName, lastName, email, 'staff123', role, office || '', phone || ''],
      type: 'INSERT'
    }) as any[];
    
    const userId = userResult;
    
    // Create staff record
    const [staffResult] = await sequelize.query(`
      INSERT INTO Staff (
        userId, employeeId, dateOfBirth, address, qualification, 
        experience, subjects, salary, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, { 
      replacements: [
        userId, employeeId || `EMP${Date.now()}`, dateOfBirth || null, address || '',
        qualification || '', experience || 0, subjects || '', salary || 0
      ],
      type: 'INSERT'
    }) as any[];
    
    // Get the complete staff data
    const [newStaff] = await sequelize.query(`
      SELECT 
        s.id, s.employeeId, s.dateOfBirth, s.address, s.qualification, 
        s.experience, s.subjects, s.salary, s.isActive,
        u.firstName, u.lastName, u.email, u.phone, u.role, u.office
      FROM Staff s
      JOIN Users u ON s.userId = u.id
      WHERE s.id = ?
    `, { replacements: [staffResult], type: 'SELECT' }) as any[];
    
    res.status(201).json({
      message: 'Staff member added successfully',
      staff: {
        id: newStaff.id,
        employeeId: newStaff.employeeId,
        firstName: newStaff.firstName,
        lastName: newStaff.lastName,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
        office: newStaff.office,
        dateOfBirth: newStaff.dateOfBirth,
        address: newStaff.address,
        qualification: newStaff.qualification,
        experience: newStaff.experience,
        subjects: newStaff.subjects || '',
        salary: newStaff.salary,
        isActive: newStaff.isActive
      }
    });
  } catch (error) {
    console.error('Error adding staff:', error);
    res.status(500).json({ message: 'Failed to add staff member' });
  }
});

// Teachers/Staff endpoint (real database implementation)
app.get('/api/teachers', async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE u.role IN ("teacher", "exam_officer", "accountant", "principal", "director") AND u.isActive = 1';
    let replacements: any[] = [];
    
    // Add search filter
    if (search) {
      whereClause += ' AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR u.office LIKE ?)';
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add role filter
    if (role) {
      whereClause += ' AND u.role = ?';
      replacements.push(role);
    }
    
    // Get staff with pagination
    const staffQuery = `
      SELECT 
        s.id, s.employeeId, s.dateOfBirth, s.address, s.qualification, 
        s.experience, s.subjects, s.salary, s.isActive, s.createdAt,
        u.firstName, u.lastName, u.email, u.phone, u.role, u.office
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      ${whereClause}
      ORDER BY u.firstName, u.lastName
      LIMIT ? OFFSET ?
    `;
    
    const staff = await sequelize.query(staffQuery, {
      replacements: [...replacements, limit, offset],
      type: 'SELECT'
    }) as any[];
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      ${whereClause}
    `;
    
    const [countResult] = await sequelize.query(countQuery, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];
    
    // Format staff data
    const formattedStaff = staff.map((member: any) => ({
      id: member.id,
      employeeId: member.employeeId,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      office: member.office,
      dateOfBirth: member.dateOfBirth,
      address: member.address,
      qualification: member.qualification,
      experience: member.experience,
      subjects: member.subjects || '',
      salary: member.salary,
      isActive: member.isActive,
      createdAt: member.createdAt
    }));
    
    res.json({
      staff: formattedStaff,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Failed to fetch staff' });
  }
});

// Admin management endpoints
// Update student (real database implementation)
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      classId, 
      house, 
      dateOfBirth,
      guardianName,
      guardianPhone,
      address,
      bloodGroup,
      medicalConditions
    } = req.body;
    
    // Check if student exists
    const [existingStudent] = await sequelize.query(
      'SELECT userId FROM Students WHERE id = ? AND isActive = 1',
      { replacements: [id], type: 'SELECT' }
    ) as any[];
    
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update user information
    await sequelize.query(`
      UPDATE Users 
      SET firstName = ?, lastName = ?, email = ?, phone = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { 
      replacements: [firstName, lastName, email, phone || '', existingStudent.userId],
      type: 'UPDATE'
    });
    
    // Update student information
    await sequelize.query(`
      UPDATE Students 
      SET classId = ?, house = ?, dateOfBirth = ?, guardianName = ?, guardianPhone = ?,
          address = ?, bloodGroup = ?, medicalConditions = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { 
      replacements: [
        classId, house || '', dateOfBirth || null, guardianName || '', 
        guardianPhone || '', address || '', bloodGroup || '', medicalConditions || '', id
      ],
      type: 'UPDATE'
    });
    
    // Get updated student data
    const [updatedStudent] = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.house, s.dateOfBirth, s.guardianName, s.guardianPhone,
        s.address, s.bloodGroup, s.medicalConditions, s.isActive,
        u.firstName, u.lastName, u.email, u.phone,
        c.name as className, c.level
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      WHERE s.id = ?
    `, { replacements: [id], type: 'SELECT' }) as any[];
    
    res.json({
      message: 'Student updated successfully',
      student: {
        id: updatedStudent.id,
        admissionNumber: updatedStudent.admissionNumber,
        firstName: updatedStudent.firstName,
        lastName: updatedStudent.lastName,
        email: updatedStudent.email,
        phone: updatedStudent.phone,
        class: {
          id: classId,
          name: updatedStudent.className,
          level: updatedStudent.level
        },
        house: updatedStudent.house,
        dateOfBirth: updatedStudent.dateOfBirth,
        guardianName: updatedStudent.guardianName,
        guardianPhone: updatedStudent.guardianPhone,
        address: updatedStudent.address,
        bloodGroup: updatedStudent.bloodGroup,
        medicalConditions: updatedStudent.medicalConditions,
        isActive: updatedStudent.isActive
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Failed to update student' });
  }
});

// Delete student (soft delete - real database implementation)
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if student exists
    const [existingStudent] = await sequelize.query(
      'SELECT userId, admissionNumber FROM Students WHERE id = ? AND isActive = 1',
      { replacements: [id], type: 'SELECT' }
    ) as any[];
    
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Soft delete student (set isActive to 0)
    await sequelize.query(`
      UPDATE Students 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { replacements: [id], type: 'UPDATE' });
    
    // Also deactivate the user account
    await sequelize.query(`
      UPDATE Users 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { replacements: [existingStudent.userId], type: 'UPDATE' });
    
    res.json({
      message: 'Student deleted successfully',
      studentId: id,
      admissionNumber: existingStudent.admissionNumber
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Failed to delete student' });
  }
});

// Update teacher/staff (real database implementation)
app.put('/api/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      role, 
      office,
      dateOfBirth,
      address,
      qualification,
      experience,
      subjects,
      salary
    } = req.body;
    
    // Check if staff exists
    const [existingStaff] = await sequelize.query(
      'SELECT userId FROM Staff WHERE id = ? AND isActive = 1',
      { replacements: [id], type: 'SELECT' }
    ) as any[];
    
    if (!existingStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Update user information
    await sequelize.query(`
      UPDATE Users 
      SET firstName = ?, lastName = ?, email = ?, phone = ?, role = ?, office = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { 
      replacements: [firstName, lastName, email, phone || '', role, office || '', existingStaff.userId],
      type: 'UPDATE'
    });
    
    // Update staff information
    await sequelize.query(`
      UPDATE Staff 
      SET dateOfBirth = ?, address = ?, qualification = ?, experience = ?, 
          subjects = ?, salary = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { 
      replacements: [
        dateOfBirth || null, address || '', qualification || '', experience || 0,
        subjects || '', salary || 0, id
      ],
      type: 'UPDATE'
    });
    
    // Get updated staff data
    const [updatedStaff] = await sequelize.query(`
      SELECT 
        s.id, s.employeeId, s.dateOfBirth, s.address, s.qualification, 
        s.experience, s.subjects, s.salary, s.isActive,
        u.firstName, u.lastName, u.email, u.phone, u.role, u.office
      FROM Staff s
      JOIN Users u ON s.userId = u.id
      WHERE s.id = ?
    `, { replacements: [id], type: 'SELECT' }) as any[];
    
    res.json({
      message: 'Staff member updated successfully',
      staff: {
        id: updatedStaff.id,
        employeeId: updatedStaff.employeeId,
        firstName: updatedStaff.firstName,
        lastName: updatedStaff.lastName,
        email: updatedStaff.email,
        phone: updatedStaff.phone,
        role: updatedStaff.role,
        office: updatedStaff.office,
        dateOfBirth: updatedStaff.dateOfBirth,
        address: updatedStaff.address,
        qualification: updatedStaff.qualification,
        experience: updatedStaff.experience,
        subjects: updatedStaff.subjects || '',
        salary: updatedStaff.salary,
        isActive: updatedStaff.isActive
      }
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Failed to update staff member' });
  }
});

// Delete teacher/staff (soft delete - real database implementation)
app.delete('/api/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if staff exists
    const [existingStaff] = await sequelize.query(
      'SELECT userId, employeeId FROM Staff WHERE id = ? AND isActive = 1',
      { replacements: [id], type: 'SELECT' }
    ) as any[];
    
    if (!existingStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Soft delete staff (set isActive to 0)
    await sequelize.query(`
      UPDATE Staff 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { replacements: [id], type: 'UPDATE' });
    
    // Also deactivate the user account
    await sequelize.query(`
      UPDATE Users 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { replacements: [existingStaff.userId], type: 'UPDATE' });
    
    res.json({
      message: 'Staff member deleted successfully',
      staffId: id,
      employeeId: existingStaff.employeeId
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Failed to delete staff member' });
  }
});

// Parents management
app.get('/api/parents', (req, res) => {
  const parents = [
    {
      id: 1,
      firstName: 'Sarah',
      lastName: 'Parent',
      email: 'sarah.parent@example.com',
      phone: '+234-xxx-xxx-xxxx',
      children: ['SHA/2024/001', 'SHA/2024/002'],
      status: 'active'
    },
    {
      id: 2,
      firstName: 'David',
      lastName: 'Guardian',
      email: 'david.guardian@example.com',
      phone: '+234-xxx-xxx-xxxx',
      children: ['SHA/2024/003'],
      status: 'active'
    }
  ];
  
  res.json(parents);
});

app.post('/api/parents', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, children } = req.body;
    
    const newParent = {
      id: Date.now(),
      firstName,
      lastName,
      email,
      phone,
      children: children || [],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      message: 'Parent added successfully',
      parent: newParent
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add parent' });
  }
});

app.put('/api/parents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    res.json({
      message: 'Parent updated successfully',
      parent: { id, ...updateData }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update parent' });
  }
});

app.delete('/api/parents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      message: 'Parent deleted successfully',
      parentId: id
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete parent' });
  }
});

// Student search by admission number
app.get('/api/students/admission/:admissionNumber', (req, res) => {
  const { admissionNumber } = req.params;
  
  // Mock student data
  const students = {
    'SHA/2024/001': {
      id: 1,
      admissionNumber: 'SHA/2024/001',
      firstName: 'John',
      lastName: 'Student',
      class: 'JSS2A',
      house: 'Blue House',
      email: 'john.student@example.com',
      phone: '08012345678',
      parentInfo: {
        name: 'Sarah Parent',
        phone: '+234-xxx-xxx-xxxx',
        email: 'sarah.parent@example.com'
      },
      academicInfo: {
        currentSession: '2024/2025',
        currentTerm: 'Second Term',
        results: [
          {
            session: '2024/2025',
            term: 'First Term',
            subjects: [
              { name: 'Mathematics', score: 85, grade: 'A' },
              { name: 'English', score: 78, grade: 'B' },
              { name: 'Physics', score: 82, grade: 'A' }
            ],
            totalScore: 245,
            averageScore: 81.7,
            position: 3
          }
        ]
      },
      paymentInfo: {
        totalFees: 150000,
        paidAmount: 100000,
        balance: 50000,
        status: 'partial'
      }
    },
    'SHA/2024/002': {
      id: 2,
      admissionNumber: 'SHA/2024/002',
      firstName: 'Jane',
      lastName: 'Doe',
      class: 'SS1SCIENCE',
      house: 'Red House',
      email: 'jane.doe@example.com',
      phone: '08087654321',
      parentInfo: {
        name: 'Sarah Parent',
        phone: '+234-xxx-xxx-xxxx',
        email: 'sarah.parent@example.com'
      },
      academicInfo: {
        currentSession: '2024/2025',
        currentTerm: 'Second Term',
        results: [
          {
            session: '2024/2025',
            term: 'First Term',
            subjects: [
              { name: 'Mathematics', score: 92, grade: 'A' },
              { name: 'Physics', score: 88, grade: 'A' },
              { name: 'Chemistry', score: 85, grade: 'A' }
            ],
            totalScore: 265,
            averageScore: 88.3,
            position: 1
          }
        ]
      },
      paymentInfo: {
        totalFees: 150000,
        paidAmount: 150000,
        balance: 0,
        status: 'paid'
      }
    }
  };
  
  const student = (students as any)[admissionNumber];
  
  if (student) {
    res.json(student);
  } else {
    res.status(404).json({ message: 'Student not found' });
  }
});

// Comments system (real database implementation)
app.get('/api/comments', async (req, res) => {
  try {
    const { role } = req.query;
    
    let whereClause = '';
    let replacements: any[] = [];
    
    if (role === 'admin') {
      whereClause = 'WHERE toRole = ?';
      replacements = ['admin'];
    } else if (role === 'exam_officer') {
      whereClause = 'WHERE toRole = ?';
      replacements = ['exam_officer'];
    }
    
    const commentsQuery = `
      SELECT 
        id, fromUser as "from", fromRole, toUser as "to", toRole, 
        subject, message, priority, studentAdmission, academicSession, 
        term, status, reply, repliedAt, repliedBy, timestamp
      FROM Comments
      ${whereClause}
      ORDER BY timestamp DESC
    `;
    
    const comments = await sequelize.query(commentsQuery, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { 
      from, 
      fromRole, 
      to, 
      toRole, 
      subject, 
      message, 
      priority, 
      studentAdmission, 
      academicSession, 
      term 
    } = req.body;
    
    // Insert comment into database
    const [commentResult] = await sequelize.query(`
      INSERT INTO Comments (
        fromUser, fromRole, toUser, toRole, subject, message, 
        priority, studentAdmission, academicSession, term, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread')
    `, { 
      replacements: [
        from, fromRole, to, toRole, subject, message,
        priority || 'normal', studentAdmission || null, 
        academicSession || null, term || null
      ],
      type: 'INSERT'
    }) as any[];
    
    // Get the created comment
    const [newComment] = await sequelize.query(`
      SELECT 
        id, fromUser as "from", fromRole, toUser as "to", toRole, 
        subject, message, priority, studentAdmission, academicSession, 
        term, status, timestamp
      FROM Comments
      WHERE id = ?
    `, { replacements: [commentResult], type: 'SELECT' }) as any[];
    
    res.status(201).json({
      message: 'Comment sent successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Failed to send comment' });
  }
});

// Mark comment as read
app.put('/api/comments/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update comment status to read
    await sequelize.query(`
      UPDATE Comments 
      SET status = 'read', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { replacements: [id], type: 'UPDATE' });
    
    res.json({
      message: 'Comment marked as read successfully'
    });
  } catch (error) {
    console.error('Error marking comment as read:', error);
    res.status(500).json({ message: 'Failed to mark comment as read' });
  }
});

// Reply to comment
app.post('/api/comments/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }
    
    // Update comment with reply
    await sequelize.query(`
      UPDATE Comments 
      SET reply = ?, repliedAt = CURRENT_TIMESTAMP, repliedBy = 'Admin', 
          status = 'read', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, { replacements: [reply.trim(), id], type: 'UPDATE' });
    
    // Get the updated comment
    const [updatedComment] = await sequelize.query(`
      SELECT 
        id, fromUser as "from", fromRole, toUser as "to", toRole, 
        subject, message, priority, studentAdmission, academicSession, 
        term, status, reply, repliedAt, repliedBy, timestamp
      FROM Comments
      WHERE id = ?
    `, { replacements: [id], type: 'SELECT' }) as any[];
    
    res.json({
      message: 'Reply sent successfully',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
});

// Accountant reports
app.post('/api/reports/financial', async (req, res) => {
  try {
    const { reportType, academicYear, term, data, summary } = req.body;
    
    const report = {
      id: Date.now(),
      reportType,
      academicYear,
      term,
      data,
      summary,
      generatedBy: 'accountant@shambil.edu.ng',
      generatedAt: new Date().toISOString(),
      status: 'sent'
    };
    
    res.status(201).json({
      message: 'Financial report sent to admin successfully',
      report
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send report' });
  }
});

// Send report to admin endpoint for exam officer
app.post('/api/reports/send-to-admin', async (req, res) => {
  try {
    const { reportType, reportTitle, reportDescription, reportData, parameters } = req.body;
    
    if (!reportType || !reportTitle || !reportData) {
      return res.status(400).json({ message: 'Report type, title, and data are required' });
    }

    // Extract academic year and term from parameters for easier querying
    const academicYear = parameters?.academicYear || null;
    const term = parameters?.term || null;
    const startYear = parameters?.startYear || null;
    const endYear = parameters?.endYear || null;

    // Save the report to the Reports table
    const [reportResult] = await sequelize.query(`
      INSERT INTO Reports (
        title, description, reportType, status, generatedBy, generatedByRole,
        sentToAdmin, sentToAdminAt, parameters, reportData, academicYear, term, startYear, endYear
      ) VALUES (?, ?, ?, 'sent_to_admin', 5, 'exam_officer', 1, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        reportTitle,
        reportDescription || null,
        reportType,
        JSON.stringify(parameters),
        JSON.stringify(reportData),
        academicYear,
        term,
        startYear,
        endYear
      ],
      type: 'INSERT'
    }) as any[];

    // Get the created report with user information
    const [createdReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.sentToAdminAt,
        r.academicYear, r.term, r.startYear, r.endYear, r.createdAt,
        u.firstName || ' ' || u.lastName as generatedByName
      FROM Reports r
      JOIN Users u ON r.generatedBy = u.id
      WHERE r.id = ?
    `, {
      replacements: [reportResult],
      type: 'SELECT'
    }) as any[];
    
    console.log('📊 Report saved and sent to admin:', {
      id: createdReport.id,
      type: reportType,
      title: reportTitle,
      generatedBy: createdReport.generatedByName,
      timestamp: createdReport.sentToAdminAt
    });
    
    res.status(201).json({
      message: 'Report sent to admin successfully',
      report: {
        id: createdReport.id,
        title: createdReport.title,
        type: createdReport.reportType,
        status: createdReport.status,
        sentAt: createdReport.sentToAdminAt,
        academicYear: createdReport.academicYear,
        term: createdReport.term,
        generatedBy: createdReport.generatedByName
      }
    });
  } catch (error) {
    console.error('Error sending report to admin:', error);
    res.status(500).json({ message: 'Failed to send report to admin' });
  }
});

// Range report endpoint for exam officer
app.get('/api/reports/range-report', async (req, res) => {
  try {
    const { startYear, endYear } = req.query;
    
    if (!startYear || !endYear) {
      return res.status(400).json({ message: 'Start year and end year are required' });
    }

    // Get overall statistics for the year range
    const [overallStats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT r.studentId) as totalStudents,
        COUNT(r.id) as totalResults,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate
      FROM Results r
      WHERE r.academicYear BETWEEN ? AND ?
    `, { 
      replacements: [startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    // Get subject performance across the range
    const subjectPerformance = await sequelize.query(`
      SELECT 
        s.name as subject,
        s.code,
        AVG(sr.total) as averageScore,
        COUNT(CASE WHEN sr.total >= 50 THEN 1 END) * 100.0 / COUNT(sr.id) as passRate,
        COUNT(sr.id) as totalEntries
      FROM SubjectResults sr
      JOIN Subjects s ON sr.subjectId = s.id
      JOIN Results r ON sr.resultId = r.id
      WHERE r.academicYear BETWEEN ? AND ?
      GROUP BY s.id, s.name, s.code
      ORDER BY averageScore DESC
    `, { 
      replacements: [startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    // Get class performance across the range
    const classPerformance = await sequelize.query(`
      SELECT 
        c.name as class,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate,
        COUNT(DISTINCT r.studentId) as totalStudents
      FROM Results r
      JOIN Students st ON r.studentId = st.id
      JOIN Classes c ON st.classId = c.id
      WHERE r.academicYear BETWEEN ? AND ?
      GROUP BY c.id, c.name
      ORDER BY averageScore DESC
    `, { 
      replacements: [startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    // Get grade distribution across the range
    const gradeDistribution = await sequelize.query(`
      SELECT 
        r.overallGrade as grade,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Results WHERE academicYear BETWEEN ? AND ?) as percentage
      FROM Results r
      WHERE r.academicYear BETWEEN ? AND ?
      GROUP BY r.overallGrade
      ORDER BY 
        CASE r.overallGrade 
          WHEN 'A' THEN 1 
          WHEN 'B' THEN 2 
          WHEN 'C' THEN 3 
          WHEN 'D' THEN 4 
          WHEN 'E' THEN 5 
          WHEN 'F' THEN 6 
          ELSE 7 
        END
    `, { 
      replacements: [startYear, endYear, startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    const reportData = {
      academicYear: `${startYear} - ${endYear}`,
      term: 'All Terms',
      totalStudents: overallStats.totalStudents || 0,
      totalResults: overallStats.totalResults || 0,
      averageScore: parseFloat((overallStats.averageScore || 0).toFixed(2)),
      passRate: parseFloat((overallStats.passRate || 0).toFixed(2)),
      subjectPerformance: subjectPerformance.map((subject: any) => ({
        subject: subject.subject,
        averageScore: parseFloat((subject.averageScore || 0).toFixed(2)),
        passRate: parseFloat((subject.passRate || 0).toFixed(2)),
        totalEntries: subject.totalEntries || 0
      })),
      classPerformance: classPerformance.map((cls: any) => ({
        class: cls.class,
        averageScore: parseFloat((cls.averageScore || 0).toFixed(2)),
        passRate: parseFloat((cls.passRate || 0).toFixed(2)),
        totalStudents: cls.totalStudents || 0
      })),
      gradeDistribution: gradeDistribution.map((grade: any) => ({
        grade: grade.grade,
        count: grade.count || 0,
        percentage: parseFloat((grade.percentage || 0).toFixed(2))
      }))
    };

    res.json(reportData);
  } catch (error) {
    console.error('Error generating range report:', error);
    res.status(500).json({ message: 'Failed to generate range report' });
  }
});

// Term report endpoint for exam officer
app.get('/api/reports/term-report', async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    
    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    // Get overall statistics for the term
    const [overallStats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT r.studentId) as totalStudents,
        COUNT(r.id) as totalResults,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate
      FROM Results r
      WHERE r.academicYear = ? AND r.term = ?
    `, { 
      replacements: [academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    // Get subject performance for the term
    const subjectPerformance = await sequelize.query(`
      SELECT 
        s.name as subject,
        s.code,
        AVG(sr.total) as averageScore,
        COUNT(CASE WHEN sr.total >= 50 THEN 1 END) * 100.0 / COUNT(sr.id) as passRate,
        COUNT(sr.id) as totalEntries
      FROM SubjectResults sr
      JOIN Subjects s ON sr.subjectId = s.id
      JOIN Results r ON sr.resultId = r.id
      WHERE r.academicYear = ? AND r.term = ?
      GROUP BY s.id, s.name, s.code
      ORDER BY averageScore DESC
    `, { 
      replacements: [academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    // Get class performance for the term
    const classPerformance = await sequelize.query(`
      SELECT 
        c.name as class,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate,
        COUNT(DISTINCT r.studentId) as totalStudents
      FROM Results r
      JOIN Students st ON r.studentId = st.id
      JOIN Classes c ON st.classId = c.id
      WHERE r.academicYear = ? AND r.term = ?
      GROUP BY c.id, c.name
      ORDER BY averageScore DESC
    `, { 
      replacements: [academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    // Get grade distribution for the term
    const gradeDistribution = await sequelize.query(`
      SELECT 
        r.overallGrade as grade,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Results WHERE academicYear = ? AND term = ?) as percentage
      FROM Results r
      WHERE r.academicYear = ? AND r.term = ?
      GROUP BY r.overallGrade
      ORDER BY 
        CASE r.overallGrade 
          WHEN 'A' THEN 1 
          WHEN 'B' THEN 2 
          WHEN 'C' THEN 3 
          WHEN 'D' THEN 4 
          WHEN 'E' THEN 5 
          WHEN 'F' THEN 6 
          ELSE 7 
        END
    `, { 
      replacements: [academicYear, term, academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    const reportData = {
      academicYear,
      term,
      totalStudents: overallStats.totalStudents || 0,
      totalResults: overallStats.totalResults || 0,
      averageScore: parseFloat((overallStats.averageScore || 0).toFixed(2)),
      passRate: parseFloat((overallStats.passRate || 0).toFixed(2)),
      subjectPerformance: subjectPerformance.map((subject: any) => ({
        subject: subject.subject,
        averageScore: parseFloat((subject.averageScore || 0).toFixed(2)),
        passRate: parseFloat((subject.passRate || 0).toFixed(2)),
        totalEntries: subject.totalEntries || 0
      })),
      classPerformance: classPerformance.map((cls: any) => ({
        class: cls.class,
        averageScore: parseFloat((cls.averageScore || 0).toFixed(2)),
        passRate: parseFloat((cls.passRate || 0).toFixed(2)),
        totalStudents: cls.totalStudents || 0
      })),
      gradeDistribution: gradeDistribution.map((grade: any) => ({
        grade: grade.grade,
        count: grade.count || 0,
        percentage: parseFloat((grade.percentage || 0).toFixed(2))
      }))
    };

    res.json(reportData);
  } catch (error) {
    console.error('Error generating term report:', error);
    res.status(500).json({ message: 'Failed to generate term report' });
  }
});

// Range report endpoint for exam officer
app.get('/api/reports/range-report', async (req, res) => {
  try {
    const { startYear, endYear } = req.query;
    
    if (!startYear || !endYear) {
      return res.status(400).json({ message: 'Start year and end year are required' });
    }

    // Get overall statistics for the year range
    const [overallStats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT r.studentId) as totalStudents,
        COUNT(r.id) as totalResults,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate
      FROM Results r
      WHERE r.academicYear BETWEEN ? AND ?
    `, { 
      replacements: [startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    // Get subject performance across the range
    const subjectPerformance = await sequelize.query(`
      SELECT 
        s.name as subject,
        s.code,
        AVG(sr.total) as averageScore,
        COUNT(CASE WHEN sr.total >= 50 THEN 1 END) * 100.0 / COUNT(sr.id) as passRate,
        COUNT(sr.id) as totalEntries
      FROM SubjectResults sr
      JOIN Subjects s ON sr.subjectId = s.id
      JOIN Results r ON sr.resultId = r.id
      WHERE r.academicYear BETWEEN ? AND ?
      GROUP BY s.id, s.name, s.code
      ORDER BY averageScore DESC
    `, { 
      replacements: [startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    // Get class performance across the range
    const classPerformance = await sequelize.query(`
      SELECT 
        c.name as class,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate,
        COUNT(DISTINCT r.studentId) as totalStudents
      FROM Results r
      JOIN Students st ON r.studentId = st.id
      JOIN Classes c ON st.classId = c.id
      WHERE r.academicYear BETWEEN ? AND ?
      GROUP BY c.id, c.name
      ORDER BY averageScore DESC
    `, { 
      replacements: [startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    // Get grade distribution across the range
    const gradeDistribution = await sequelize.query(`
      SELECT 
        r.overallGrade as grade,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Results WHERE academicYear BETWEEN ? AND ?) as percentage
      FROM Results r
      WHERE r.academicYear BETWEEN ? AND ?
      GROUP BY r.overallGrade
      ORDER BY 
        CASE r.overallGrade 
          WHEN 'A' THEN 1 
          WHEN 'B' THEN 2 
          WHEN 'C' THEN 3 
          WHEN 'D' THEN 4 
          WHEN 'E' THEN 5 
          WHEN 'F' THEN 6 
          ELSE 7 
        END
    `, { 
      replacements: [startYear, endYear, startYear, endYear], 
      type: 'SELECT' 
    }) as any[];

    const reportData = {
      academicYear: `${startYear} - ${endYear}`,
      term: 'All Terms',
      totalStudents: overallStats.totalStudents || 0,
      totalResults: overallStats.totalResults || 0,
      averageScore: parseFloat((overallStats.averageScore || 0).toFixed(2)),
      passRate: parseFloat((overallStats.passRate || 0).toFixed(2)),
      subjectPerformance: subjectPerformance.map((subject: any) => ({
        subject: subject.subject,
        averageScore: parseFloat((subject.averageScore || 0).toFixed(2)),
        passRate: parseFloat((subject.passRate || 0).toFixed(2)),
        totalEntries: subject.totalEntries || 0
      })),
      classPerformance: classPerformance.map((cls: any) => ({
        class: cls.class,
        averageScore: parseFloat((cls.averageScore || 0).toFixed(2)),
        passRate: parseFloat((cls.passRate || 0).toFixed(2)),
        totalStudents: cls.totalStudents || 0
      })),
      gradeDistribution: gradeDistribution.map((grade: any) => ({
        grade: grade.grade,
        count: grade.count || 0,
        percentage: parseFloat((grade.percentage || 0).toFixed(2))
      }))
    };

    res.json(reportData);
  } catch (error) {
    console.error('Error generating range report:', error);
    res.status(500).json({ message: 'Failed to generate range report' });
  }
});

// Term report endpoint for exam officer
app.get('/api/reports/term-report', async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    
    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    // Get overall statistics for the term
    const [overallStats] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT r.studentId) as totalStudents,
        COUNT(r.id) as totalResults,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate
      FROM Results r
      WHERE r.academicYear = ? AND r.term = ?
    `, { 
      replacements: [academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    // Get subject performance for the term
    const subjectPerformance = await sequelize.query(`
      SELECT 
        s.name as subject,
        s.code,
        AVG(sr.total) as averageScore,
        COUNT(CASE WHEN sr.total >= 50 THEN 1 END) * 100.0 / COUNT(sr.id) as passRate,
        COUNT(sr.id) as totalEntries
      FROM SubjectResults sr
      JOIN Subjects s ON sr.subjectId = s.id
      JOIN Results r ON sr.resultId = r.id
      WHERE r.academicYear = ? AND r.term = ?
      GROUP BY s.id, s.name, s.code
      ORDER BY averageScore DESC
    `, { 
      replacements: [academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    // Get class performance for the term
    const classPerformance = await sequelize.query(`
      SELECT 
        c.name as class,
        AVG(r.averageScore) as averageScore,
        COUNT(CASE WHEN r.averageScore >= 50 THEN 1 END) * 100.0 / COUNT(r.id) as passRate,
        COUNT(DISTINCT r.studentId) as totalStudents
      FROM Results r
      JOIN Students st ON r.studentId = st.id
      JOIN Classes c ON st.classId = c.id
      WHERE r.academicYear = ? AND r.term = ?
      GROUP BY c.id, c.name
      ORDER BY averageScore DESC
    `, { 
      replacements: [academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    // Get grade distribution for the term
    const gradeDistribution = await sequelize.query(`
      SELECT 
        r.overallGrade as grade,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Results WHERE academicYear = ? AND term = ?) as percentage
      FROM Results r
      WHERE r.academicYear = ? AND r.term = ?
      GROUP BY r.overallGrade
      ORDER BY 
        CASE r.overallGrade 
          WHEN 'A' THEN 1 
          WHEN 'B' THEN 2 
          WHEN 'C' THEN 3 
          WHEN 'D' THEN 4 
          WHEN 'E' THEN 5 
          WHEN 'F' THEN 6 
          ELSE 7 
        END
    `, { 
      replacements: [academicYear, term, academicYear, term], 
      type: 'SELECT' 
    }) as any[];

    const reportData = {
      academicYear,
      term,
      totalStudents: overallStats.totalStudents || 0,
      totalResults: overallStats.totalResults || 0,
      averageScore: parseFloat((overallStats.averageScore || 0).toFixed(2)),
      passRate: parseFloat((overallStats.passRate || 0).toFixed(2)),
      subjectPerformance: subjectPerformance.map((subject: any) => ({
        subject: subject.subject,
        averageScore: parseFloat((subject.averageScore || 0).toFixed(2)),
        passRate: parseFloat((subject.passRate || 0).toFixed(2)),
        totalEntries: subject.totalEntries || 0
      })),
      classPerformance: classPerformance.map((cls: any) => ({
        class: cls.class,
        averageScore: parseFloat((cls.averageScore || 0).toFixed(2)),
        passRate: parseFloat((cls.passRate || 0).toFixed(2)),
        totalStudents: cls.totalStudents || 0
      })),
      gradeDistribution: gradeDistribution.map((grade: any) => ({
        grade: grade.grade,
        count: grade.count || 0,
        percentage: parseFloat((grade.percentage || 0).toFixed(2))
      }))
    };

    res.json(reportData);
  } catch (error) {
    console.error('Error generating term report:', error);
    res.status(500).json({ message: 'Failed to generate term report' });
  }
});

// Save report as draft (for exam officer to save for later)
app.post('/api/reports/save-draft', async (req, res) => {
  try {
    const { reportType, reportTitle, reportDescription, reportData, parameters } = req.body;
    
    if (!reportType || !reportTitle || !reportData) {
      return res.status(400).json({ message: 'Report type, title, and data are required' });
    }

    // Extract academic year and term from parameters
    const academicYear = parameters?.academicYear || null;
    const term = parameters?.term || null;
    const startYear = parameters?.startYear || null;
    const endYear = parameters?.endYear || null;

    // Save the report as draft
    const [reportResult] = await sequelize.query(`
      INSERT INTO Reports (
        title, description, reportType, status, generatedBy, generatedByRole,
        parameters, reportData, academicYear, term, startYear, endYear
      ) VALUES (?, ?, ?, 'draft', 5, 'exam_officer', ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        reportTitle,
        reportDescription || null,
        reportType,
        JSON.stringify(parameters),
        JSON.stringify(reportData),
        academicYear,
        term,
        startYear,
        endYear
      ],
      type: 'INSERT'
    }) as any[];

    // Get the created report
    const [createdReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.createdAt,
        r.academicYear, r.term, r.startYear, r.endYear,
        u.firstName || ' ' || u.lastName as generatedByName
      FROM Reports r
      JOIN Users u ON r.generatedBy = u.id
      WHERE r.id = ?
    `, {
      replacements: [reportResult],
      type: 'SELECT'
    }) as any[];
    
    res.status(201).json({
      message: 'Report saved as draft successfully',
      report: {
        id: createdReport.id,
        title: createdReport.title,
        type: createdReport.reportType,
        status: createdReport.status,
        createdAt: createdReport.createdAt,
        academicYear: createdReport.academicYear,
        term: createdReport.term,
        generatedBy: createdReport.generatedByName
      }
    });
  } catch (error) {
    console.error('Error saving report draft:', error);
    res.status(500).json({ message: 'Failed to save report draft' });
  }
});

// Get all reports (for admin and exam officer)
app.get('/api/reports', async (req, res) => {
  try {
    const { role, status, reportType, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];

    // Filter by role - admin sees all, exam officer sees only their own
    if (role === 'exam_officer') {
      whereClause += ' AND r.generatedByRole = ?';
      replacements.push('exam_officer');
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClause += ' AND r.status = ?';
      replacements.push(status);
    }

    // Filter by report type
    if (reportType && reportType !== 'all') {
      whereClause += ' AND r.reportType = ?';
      replacements.push(reportType);
    }

    const reports = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.createdAt,
        r.sentToAdminAt, r.reviewedAt, r.approvedAt, r.academicYear, r.term,
        r.startYear, r.endYear, r.notes,
        gen.firstName || ' ' || gen.lastName as generatedByName,
        rev.firstName || ' ' || rev.lastName as reviewedByName,
        app.firstName || ' ' || app.lastName as approvedByName
      FROM Reports r
      JOIN Users gen ON r.generatedBy = gen.id
      LEFT JOIN Users rev ON r.reviewedBy = rev.id
      LEFT JOIN Users app ON r.approvedBy = app.id
      ${whereClause}
      ORDER BY r.createdAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, parseInt(limit as string), offset],
      type: 'SELECT'
    }) as any[];

    // Get total count
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports r ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    const formattedReports = reports.map((report: any) => ({
      id: report.id,
      title: report.title,
      description: report.description,
      reportType: report.reportType,
      status: report.status,
      createdAt: report.createdAt,
      sentToAdminAt: report.sentToAdminAt,
      reviewedAt: report.reviewedAt,
      approvedAt: report.approvedAt,
      academicYear: report.academicYear,
      term: report.term,
      startYear: report.startYear,
      endYear: report.endYear,
      notes: report.notes,
      generatedBy: report.generatedByName,
      reviewedBy: report.reviewedByName,
      approvedBy: report.approvedByName
    }));

    res.json({
      reports: formattedReports,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// Get single report with full data (for viewing)
app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [report] = await sequelize.query(`
      SELECT 
        r.*, 
        gen.firstName || ' ' || gen.lastName as generatedByName,
        rev.firstName || ' ' || rev.lastName as reviewedByName,
        app.firstName || ' ' || app.lastName as approvedByName
      FROM Reports r
      JOIN Users gen ON r.generatedBy = gen.id
      LEFT JOIN Users rev ON r.reviewedBy = rev.id
      LEFT JOIN Users app ON r.approvedBy = app.id
      WHERE r.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Parse JSON fields
    const reportData = JSON.parse(report.reportData);
    const parameters = report.parameters ? JSON.parse(report.parameters) : null;

    res.json({
      id: report.id,
      title: report.title,
      description: report.description,
      reportType: report.reportType,
      status: report.status,
      createdAt: report.createdAt,
      sentToAdminAt: report.sentToAdminAt,
      reviewedAt: report.reviewedAt,
      approvedAt: report.approvedAt,
      academicYear: report.academicYear,
      term: report.term,
      startYear: report.startYear,
      endYear: report.endYear,
      notes: report.notes,
      generatedBy: report.generatedByName,
      reviewedBy: report.reviewedByName,
      approvedBy: report.approvedByName,
      reportData: reportData,
      parameters: parameters
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Failed to fetch report' });
  }
});

// Admin endpoints for report management

// Update report status (admin only)
app.patch('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['draft', 'sent_to_admin', 'reviewed', 'approved', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Update report status
    let updateQuery = 'UPDATE Reports SET status = ?, updatedAt = CURRENT_TIMESTAMP';
    let replacements = [status];

    if (status === 'reviewed') {
      updateQuery += ', reviewedBy = 1, reviewedAt = CURRENT_TIMESTAMP';
    } else if (status === 'approved') {
      updateQuery += ', approvedBy = 1, approvedAt = CURRENT_TIMESTAMP';
    }

    if (notes) {
      updateQuery += ', notes = ?';
      replacements.push(notes);
    }

    updateQuery += ' WHERE id = ?';
    replacements.push(id);

    await sequelize.query(updateQuery, {
      replacements: replacements,
      type: 'UPDATE'
    });

    // Get updated report
    const [updatedReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.status, r.reviewedAt, r.approvedAt, r.notes,
        gen.firstName || ' ' || gen.lastName as generatedByName
      FROM Reports r
      JOIN Users gen ON r.generatedBy = gen.id
      WHERE r.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({
      message: 'Report status updated successfully',
      report: {
        id: updatedReport.id,
        title: updatedReport.title,
        status: updatedReport.status,
        reviewedAt: updatedReport.reviewedAt,
        approvedAt: updatedReport.approvedAt,
        notes: updatedReport.notes,
        generatedBy: updatedReport.generatedByName
      }
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ message: 'Failed to update report status' });
  }
});

// Get reports summary for admin dashboard
app.get('/api/reports/summary/admin', async (req, res) => {
  try {
    // Get total reports count
    const [totalReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports
    `, { type: 'SELECT' }) as any[];

    // Get pending reports (sent to admin but not reviewed)
    const [pendingReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports WHERE status = 'sent_to_admin'
    `, { type: 'SELECT' }) as any[];

    // Get reviewed reports
    const [reviewedReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports WHERE status = 'reviewed'
    `, { type: 'SELECT' }) as any[];

    // Get approved reports
    const [approvedReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports WHERE status = 'approved'
    `, { type: 'SELECT' }) as any[];

    // Get reports by type
    const reportsByType = await sequelize.query(`
      SELECT reportType, COUNT(*) as count 
      FROM Reports 
      GROUP BY reportType
      ORDER BY count DESC
    `, { type: 'SELECT' }) as any[];

    // Get recent reports (last 7 days)
    const [recentReports] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM Reports 
      WHERE date(createdAt) >= date('now', '-7 days')
    `, { type: 'SELECT' }) as any[];

    res.json({
      totalReports: totalReports.count,
      pendingReports: pendingReports.count,
      reviewedReports: reviewedReports.count,
      approvedReports: approvedReports.count,
      recentReports: recentReports.count,
      reportsByType: reportsByType
    });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ message: 'Failed to fetch reports summary' });
  }
});

// Delete report (admin only)
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if report exists
    const [existingReport] = await sequelize.query(`
      SELECT id, title FROM Reports WHERE id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (!existingReport) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Delete the report
    await sequelize.query(`
      DELETE FROM Reports WHERE id = ?
    `, {
      replacements: [id],
      type: 'DELETE'
    });

    res.json({
      message: 'Report deleted successfully',
      reportId: id,
      title: existingReport.title
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Failed to delete report' });
  }
});

// Get reports statistics
app.get('/api/reports/stats/summary', async (req, res) => {
  try {
    const { role } = req.query;

    let whereClause = '';
    if (role === 'exam_officer') {
      whereClause = "WHERE generatedByRole = 'exam_officer'";
    }

    // Total reports
    const [totalReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports ${whereClause}
    `, { type: 'SELECT' }) as any[];

    // Reports by status
    const reportsByStatus = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM Reports ${whereClause}
      GROUP BY status
    `, { type: 'SELECT' }) as any[];

    // Reports by type
    const reportsByType = await sequelize.query(`
      SELECT reportType, COUNT(*) as count 
      FROM Reports ${whereClause}
      GROUP BY reportType
    `, { type: 'SELECT' }) as any[];

    // Recent reports (last 30 days)
    const [recentReports] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM Reports 
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} date(createdAt) >= date('now', '-30 days')
    `, { type: 'SELECT' }) as any[];

    res.json({
      totalReports: totalReports.count,
      byStatus: reportsByStatus,
      byType: reportsByType,
      recentReports: recentReports.count
    });
  } catch (error) {
    console.error('Error fetching reports statistics:', error);
    res.status(500).json({ message: 'Failed to fetch reports statistics' });
  }
});

// ==================== REPORTS MANAGEMENT ENDPOINTS ====================

// Get single report with full data (for viewing)
app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.query;
    
    // Get report with full data
    const [report] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.sentToAdmin,
        r.sentToAdminAt, r.reviewedAt, r.approvedAt, r.academicYear, r.term,
        r.startYear, r.endYear, r.parameters, r.reportData, r.notes,
        r.createdAt, r.updatedAt, r.generatedBy, r.generatedByRole,
        u.firstName || ' ' || u.lastName as generatedByName,
        reviewer.firstName || ' ' || reviewer.lastName as reviewedByName,
        approver.firstName || ' ' || approver.lastName as approvedByName
      FROM Reports r
      JOIN Users u ON r.generatedBy = u.id
      LEFT JOIN Users reviewer ON r.reviewedBy = reviewer.id
      LEFT JOIN Users approver ON r.approvedBy = approver.id
      WHERE r.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Check permissions: admin can view all, others can only view their own reports
    if (role !== 'admin' && report.generatedBy !== parseInt(userId as string)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      id: report.id,
      title: report.title,
      description: report.description,
      reportType: report.reportType,
      status: report.status,
      sentToAdmin: report.sentToAdmin,
      sentToAdminAt: report.sentToAdminAt,
      reviewedAt: report.reviewedAt,
      approvedAt: report.approvedAt,
      academicYear: report.academicYear,
      term: report.term,
      startYear: report.startYear,
      endYear: report.endYear,
      parameters: report.parameters ? JSON.parse(report.parameters) : null,
      reportData: report.reportData ? JSON.parse(report.reportData) : null,
      notes: report.notes,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      generatedBy: {
        id: report.generatedBy,
        name: report.generatedByName,
        role: report.generatedByRole
      },
      reviewedBy: report.reviewedByName,
      approvedBy: report.approvedByName
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Failed to fetch report' });
  }
});

// Save report as draft (for exam officers)
app.post('/api/reports/save-draft', async (req, res) => {
  try {
    const { reportType, reportTitle, reportDescription, reportData, parameters, userId } = req.body;
    
    if (!reportType || !reportTitle || !reportData || !userId) {
      return res.status(400).json({ message: 'Report type, title, data, and user ID are required' });
    }

    // Extract academic year and term from parameters
    const academicYear = parameters?.academicYear || null;
    const term = parameters?.term || null;
    const startYear = parameters?.startYear || null;
    const endYear = parameters?.endYear || null;

    // Save the report as draft
    const [reportResult] = await sequelize.query(`
      INSERT INTO Reports (
        title, description, reportType, status, generatedBy, generatedByRole,
        sentToAdmin, parameters, reportData, academicYear, term, startYear, endYear
      ) VALUES (?, ?, ?, 'draft', ?, 'exam_officer', 0, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        reportTitle,
        reportDescription || null,
        reportType,
        userId,
        JSON.stringify(parameters),
        JSON.stringify(reportData),
        academicYear,
        term,
        startYear,
        endYear
      ],
      type: 'INSERT'
    }) as any[];

    // Get the created report
    const [createdReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.createdAt,
        r.academicYear, r.term, r.startYear, r.endYear,
        u.firstName || ' ' || u.lastName as generatedByName
      FROM Reports r
      JOIN Users u ON r.generatedBy = u.id
      WHERE r.id = ?
    `, {
      replacements: [reportResult],
      type: 'SELECT'
    }) as any[];
    
    res.status(201).json({
      message: 'Report saved as draft successfully',
      report: {
        id: createdReport.id,
        title: createdReport.title,
        description: createdReport.description,
        type: createdReport.reportType,
        status: createdReport.status,
        createdAt: createdReport.createdAt,
        academicYear: createdReport.academicYear,
        term: createdReport.term,
        generatedBy: createdReport.generatedByName
      }
    });
  } catch (error) {
    console.error('Error saving report draft:', error);
    res.status(500).json({ message: 'Failed to save report draft' });
  }
});

// Update report status (for admin)
app.patch('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, userId } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const validStatuses = ['draft', 'sent_to_admin', 'reviewed', 'approved', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Update report status
    let updateQuery = 'UPDATE Reports SET status = ?, updatedAt = CURRENT_TIMESTAMP';
    let replacements = [status];
    
    if (status === 'reviewed') {
      updateQuery += ', reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP';
      replacements.push(userId);
    } else if (status === 'approved') {
      updateQuery += ', approvedBy = ?, approvedAt = CURRENT_TIMESTAMP';
      replacements.push(userId);
    }
    
    if (notes) {
      updateQuery += ', notes = ?';
      replacements.push(notes);
    }
    
    updateQuery += ' WHERE id = ?';
    replacements.push(id);
    
    await sequelize.query(updateQuery, {
      replacements: replacements,
      type: 'UPDATE'
    });
    
    // Get updated report
    const [updatedReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.status, r.notes, r.updatedAt,
        u.firstName || ' ' || u.lastName as updatedByName
      FROM Reports r
      LEFT JOIN Users u ON (
        (r.status = 'reviewed' AND r.reviewedBy = u.id) OR
        (r.status = 'approved' AND r.approvedBy = u.id)
      )
      WHERE r.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];
    
    res.json({
      message: 'Report status updated successfully',
      report: {
        id: updatedReport.id,
        title: updatedReport.title,
        status: updatedReport.status,
        notes: updatedReport.notes,
        updatedAt: updatedReport.updatedAt,
        updatedBy: updatedReport.updatedByName
      }
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ message: 'Failed to update report status' });
  }
});

// Get reports summary for admin dashboard
app.get('/api/reports/summary/admin', async (req, res) => {
  try {
    // Get total reports count
    const [totalReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports
    `, { type: 'SELECT' }) as any[];
    
    // Get reports by status
    const reportsByStatus = await sequelize.query(`
      SELECT status, COUNT(*) as count FROM Reports GROUP BY status
    `, { type: 'SELECT' }) as any[];
    
    // Get reports by type
    const reportsByType = await sequelize.query(`
      SELECT reportType, COUNT(*) as count FROM Reports GROUP BY reportType
    `, { type: 'SELECT' }) as any[];
    
    // Get recent reports (last 7 days)
    const [recentReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports 
      WHERE date(createdAt) >= date('now', '-7 days')
    `, { type: 'SELECT' }) as any[];
    
    // Get pending reports (sent to admin but not reviewed)
    const [pendingReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports 
      WHERE status = 'sent_to_admin'
    `, { type: 'SELECT' }) as any[];
    
    res.json({
      totalReports: totalReports.count,
      pendingReports: pendingReports.count,
      recentReports: recentReports.count,
      reportsByStatus: reportsByStatus,
      reportsByType: reportsByType
    });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ message: 'Failed to fetch reports summary' });
  }
});

// ==================== REPORTS MANAGEMENT ENDPOINTS ====================

// Get all reports (for admin and exam officers)
app.get('/api/reports', async (req, res) => {
  try {
    const { role, status, reportType, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];
    
    // Filter by role (for exam officers, show only their reports)
    if (role === 'exam_officer') {
      whereClause += ' AND r.generatedByRole = ?';
      replacements.push('exam_officer');
    }
    
    // Filter by status
    if (status && status !== 'all') {
      whereClause += ' AND r.status = ?';
      replacements.push(status);
    }
    
    // Filter by report type
    if (reportType && reportType !== 'all') {
      whereClause += ' AND r.reportType = ?';
      replacements.push(reportType);
    }
    
    // Get reports with pagination
    const reports = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.generatedByRole,
        r.sentToAdmin, r.sentToAdminAt, r.reviewedAt, r.approvedAt,
        r.academicYear, r.term, r.startYear, r.endYear, r.createdAt, r.updatedAt,
        u.firstName || ' ' || u.lastName as generatedByName,
        reviewer.firstName || ' ' || reviewer.lastName as reviewedByName,
        approver.firstName || ' ' || approver.lastName as approvedByName
      FROM Reports r
      LEFT JOIN Users u ON r.generatedBy = u.id
      LEFT JOIN Users reviewer ON r.reviewedBy = reviewer.id
      LEFT JOIN Users approver ON r.approvedBy = approver.id
      ${whereClause}
      ORDER BY r.createdAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, parseInt(limit as string), offset],
      type: 'SELECT'
    }) as any[];
    
    // Get total count for pagination
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports r ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];
    
    res.json({
      reports: reports.map((report: any) => ({
        id: report.id,
        title: report.title,
        description: report.description,
        reportType: report.reportType,
        status: report.status,
        generatedByRole: report.generatedByRole,
        generatedByName: report.generatedByName,
        sentToAdmin: report.sentToAdmin,
        sentToAdminAt: report.sentToAdminAt,
        reviewedAt: report.reviewedAt,
        reviewedByName: report.reviewedByName,
        approvedAt: report.approvedAt,
        approvedByName: report.approvedByName,
        academicYear: report.academicYear,
        term: report.term,
        startYear: report.startYear,
        endYear: report.endYear,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// Get single report details
app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [report] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.generatedByRole,
        r.sentToAdmin, r.sentToAdminAt, r.reviewedAt, r.approvedAt, r.notes,
        r.parameters, r.reportData, r.academicYear, r.term, r.startYear, r.endYear,
        r.createdAt, r.updatedAt,
        u.firstName || ' ' || u.lastName as generatedByName,
        reviewer.firstName || ' ' || reviewer.lastName as reviewedByName,
        approver.firstName || ' ' || approver.lastName as approvedByName
      FROM Reports r
      LEFT JOIN Users u ON r.generatedBy = u.id
      LEFT JOIN Users reviewer ON r.reviewedBy = reviewer.id
      LEFT JOIN Users approver ON r.approvedBy = approver.id
      WHERE r.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Parse JSON fields
    let parameters = {};
    let reportData = {};
    
    try {
      parameters = JSON.parse(report.parameters || '{}');
      reportData = JSON.parse(report.reportData || '{}');
    } catch (error) {
      console.error('Error parsing report JSON fields:', error);
    }
    
    res.json({
      id: report.id,
      title: report.title,
      description: report.description,
      reportType: report.reportType,
      status: report.status,
      generatedByRole: report.generatedByRole,
      generatedByName: report.generatedByName,
      sentToAdmin: report.sentToAdmin,
      sentToAdminAt: report.sentToAdminAt,
      reviewedAt: report.reviewedAt,
      reviewedByName: report.reviewedByName,
      approvedAt: report.approvedAt,
      approvedByName: report.approvedByName,
      notes: report.notes,
      parameters,
      reportData,
      academicYear: report.academicYear,
      term: report.term,
      startYear: report.startYear,
      endYear: report.endYear,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({ message: 'Failed to fetch report details' });
  }
});

// Update report status (for admin)
app.patch('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    // Update report status
    await sequelize.query(`
      UPDATE Reports 
      SET status = ?, notes = ?, 
          reviewedBy = CASE WHEN ? = 'reviewed' THEN 1 ELSE reviewedBy END,
          reviewedAt = CASE WHEN ? = 'reviewed' THEN CURRENT_TIMESTAMP ELSE reviewedAt END,
          approvedBy = CASE WHEN ? = 'approved' THEN 1 ELSE approvedBy END,
          approvedAt = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE approvedAt END,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [status, notes || null, status, status, status, status, id],
      type: 'UPDATE'
    });
    
    // Get updated report
    const [updatedReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.status, r.notes, r.reviewedAt, r.approvedAt,
        u.firstName || ' ' || u.lastName as generatedByName
      FROM Reports r
      LEFT JOIN Users u ON r.generatedBy = u.id
      WHERE r.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];
    
    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    console.log('📊 Report status updated:', {
      id: updatedReport.id,
      title: updatedReport.title,
      status: updatedReport.status,
      updatedBy: 'Admin'
    });
    
    res.json({
      message: 'Report status updated successfully',
      report: {
        id: updatedReport.id,
        title: updatedReport.title,
        status: updatedReport.status,
        notes: updatedReport.notes,
        reviewedAt: updatedReport.reviewedAt,
        approvedAt: updatedReport.approvedAt
      }
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ message: 'Failed to update report status' });
  }
});

// Save report as draft (for exam officers)
app.post('/api/reports/save-draft', async (req, res) => {
  try {
    const { reportType, reportTitle, reportDescription, reportData, parameters } = req.body;
    
    if (!reportType || !reportTitle || !reportData) {
      return res.status(400).json({ message: 'Report type, title, and data are required' });
    }

    // Extract academic year and term from parameters
    const academicYear = parameters?.academicYear || null;
    const term = parameters?.term || null;
    const startYear = parameters?.startYear || null;
    const endYear = parameters?.endYear || null;

    // Save the report as draft
    const [reportResult] = await sequelize.query(`
      INSERT INTO Reports (
        title, description, reportType, status, generatedBy, generatedByRole,
        sentToAdmin, parameters, reportData, academicYear, term, startYear, endYear
      ) VALUES (?, ?, ?, 'draft', 5, 'exam_officer', 0, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        reportTitle,
        reportDescription || '',
        reportType,
        JSON.stringify(parameters || {}),
        JSON.stringify(reportData),
        academicYear,
        term,
        startYear,
        endYear
      ],
      type: 'INSERT'
    }) as any[];

    // Get the created report
    const [savedReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.createdAt,
        r.academicYear, r.term, r.startYear, r.endYear,
        u.firstName || ' ' || u.lastName as generatedByName
      FROM Reports r
      LEFT JOIN Users u ON r.generatedBy = u.id
      WHERE r.id = ?
    `, {
      replacements: [reportResult],
      type: 'SELECT'
    }) as any[];
    
    console.log('📊 Report saved as draft:', {
      id: savedReport.id,
      type: reportType,
      title: reportTitle,
      generatedBy: savedReport.generatedByName
    });
    
    res.status(201).json({
      message: 'Report saved as draft successfully',
      report: {
        id: savedReport.id,
        title: savedReport.title,
        type: savedReport.reportType,
        status: savedReport.status,
        createdAt: savedReport.createdAt,
        academicYear: savedReport.academicYear,
        term: savedReport.term,
        generatedBy: savedReport.generatedByName
      }
    });
  } catch (error) {
    console.error('Error saving report draft:', error);
    res.status(500).json({ message: 'Failed to save report draft' });
  }
});

// Get reports summary for admin dashboard
app.get('/api/reports-summary', async (req, res) => {
  try {
    // Get total reports count
    const [totalReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports
    `, { type: 'SELECT' }) as any[];

    // Get pending reports (sent to admin but not reviewed)
    const [pendingReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports WHERE status = 'sent_to_admin'
    `, { type: 'SELECT' }) as any[];

    // Get reviewed reports
    const [reviewedReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports WHERE status = 'reviewed'
    `, { type: 'SELECT' }) as any[];

    // Get approved reports
    const [approvedReports] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Reports WHERE status = 'approved'
    `, { type: 'SELECT' }) as any[];

    // Get reports by type
    const reportsByType = await sequelize.query(`
      SELECT reportType, COUNT(*) as count 
      FROM Reports 
      GROUP BY reportType
      ORDER BY count DESC
    `, { type: 'SELECT' }) as any[];

    // Get recent reports (last 7 days)
    const [recentReports] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM Reports 
      WHERE date(createdAt) >= date('now', '-7 days')
    `, { type: 'SELECT' }) as any[];

    res.json({
      totalReports: totalReports.count,
      pendingReports: pendingReports.count,
      reviewedReports: reviewedReports.count,
      approvedReports: approvedReports.count,
      recentReports: recentReports.count,
      reportsByType: reportsByType
    });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ message: 'Failed to fetch reports summary' });
  }
});

// ==================== USER MANAGEMENT ENDPOINTS (ADMIN ONLY) ====================

// Create new user (Admin only)
app.post('/api/admin/users', async (req, res) => {
  try {
    const { 
      firstName, lastName, email, password, role, phone, office,
      // Student specific fields
      admissionNumber, classId, house, dateOfBirth, guardianName, guardianPhone, address,
      // Staff specific fields
      employeeId, qualification, experience, subjects, salary, assignedOffice
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
        INSERT INTO Students (userId, admissionNumber, classId, house, dateOfBirth, guardianName, guardianPhone, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        INSERT INTO Staff (userId, employeeId, qualification, experience, subjects, salary)
        VALUES (?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          userId, employeeId, qualification || null, experience || 0, subjects || null, salary || 0
        ],
        type: 'INSERT'
      });
    }

    // Get the complete user data
    const [newUser] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.role, u.phone, u.office, u.isActive, u.createdAt,
        s.admissionNumber, s.house, c.name as className,
        st.employeeId, st.qualification
      FROM Users u
      LEFT JOIN Students s ON u.id = s.userId
      LEFT JOIN Classes c ON s.classId = c.id
      LEFT JOIN Staff st ON u.id = st.userId
      WHERE u.id = ?
    `, {
      replacements: [userId],
      type: 'SELECT'
    }) as any[];

    console.log('👤 New user created:', {
      id: newUser.id,
      name: `${newUser.firstName} ${newUser.lastName}`,
      role: newUser.role,
      email: newUser.email
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        office: newUser.office,
        admissionNumber: newUser.admissionNumber,
        className: newUser.className,
        employeeId: newUser.employeeId,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Get all users with filtering (Admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];

    if (role && role !== 'all') {
      whereClause += ' AND u.role = ?';
      replacements.push(role);
    }

    if (status === 'active') {
      whereClause += ' AND u.isActive = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND u.isActive = 0';
    }

    if (search) {
      whereClause += ' AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR s.admissionNumber LIKE ? OR st.employeeId LIKE ?)';
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const users = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.role, u.phone, u.office, u.isActive, u.createdAt, u.lastLogin,
        s.admissionNumber, s.house, c.name as className,
        st.employeeId, st.qualification, st.salary
      FROM Users u
      LEFT JOIN Students s ON u.id = s.userId
      LEFT JOIN Classes c ON s.classId = c.id
      LEFT JOIN Staff st ON u.id = st.userId
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, parseInt(limit as string), offset],
      type: 'SELECT'
    }) as any[];

    // Get total count
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Users u
      LEFT JOIN Students s ON u.id = s.userId
      LEFT JOIN Staff st ON u.id = st.userId
      ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    res.json({
      users: users.map((user: any) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        phone: user.phone,
        office: user.office,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        // Student specific
        admissionNumber: user.admissionNumber,
        className: user.className,
        house: user.house,
        // Staff specific
        employeeId: user.employeeId,
        qualification: user.qualification,
        salary: user.salary
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / parseInt(limit as string))
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

    // Check if user exists
    const [existingUser] = await sequelize.query(
      'SELECT id, role FROM Users WHERE id = ?',
      { replacements: [id], type: 'SELECT' }
    ) as any[];

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user basic info
    const userFields = ['firstName', 'lastName', 'email', 'phone', 'office', 'isActive'];
    const userUpdates = [];
    const userValues = [];

    for (const field of userFields) {
      if (updateData[field] !== undefined) {
        userUpdates.push(`${field} = ?`);
        userValues.push(updateData[field]);
      }
    }

    if (userUpdates.length > 0) {
      userValues.push(id);
      await sequelize.query(`
        UPDATE Users SET ${userUpdates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
      `, {
        replacements: userValues,
        type: 'UPDATE'
      });
    }

    // Update role-specific data
    if (existingUser.role === 'student' && updateData.classId) {
      await sequelize.query(`
        UPDATE Students SET classId = ?, house = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?
      `, {
        replacements: [updateData.classId, updateData.house || null, id],
        type: 'UPDATE'
      });
    } else if (['teacher', 'exam_officer', 'accountant'].includes(existingUser.role)) {
      const staffFields = ['qualification', 'experience', 'subjects', 'salary'];
      const staffUpdates = [];
      const staffValues = [];

      for (const field of staffFields) {
        if (updateData[field] !== undefined) {
          staffUpdates.push(`${field} = ?`);
          staffValues.push(updateData[field]);
        }
      }

      // Office assignment functionality temporarily disabled

      if (staffUpdates.length > 0) {
        staffValues.push(id);
        await sequelize.query(`
          UPDATE Staff SET ${staffUpdates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?
        `, {
          replacements: staffValues,
          type: 'UPDATE'
        });
      }
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete/Deactivate user (Admin only)
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [existingUser] = await sequelize.query(
      'SELECT id, firstName, lastName, role FROM Users WHERE id = ?',
      { replacements: [id], type: 'SELECT' }
    ) as any[];

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete - deactivate user instead of hard delete
    await sequelize.query(`
      UPDATE Users SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `, {
      replacements: [id],
      type: 'UPDATE'
    });

    // Also deactivate related records
    if (existingUser.role === 'student') {
      await sequelize.query(`
        UPDATE Students SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?
      `, {
        replacements: [id],
        type: 'UPDATE'
      });
    } else if (['teacher', 'exam_officer', 'accountant'].includes(existingUser.role)) {
      await sequelize.query(`
        UPDATE Staff SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?
      `, {
        replacements: [id],
        type: 'UPDATE'
      });
    }

    console.log('👤 User deactivated:', {
      id: existingUser.id,
      name: `${existingUser.firstName} ${existingUser.lastName}`,
      role: existingUser.role
    });

    res.json({
      message: 'User deactivated successfully',
      user: {
        id: existingUser.id,
        name: `${existingUser.firstName} ${existingUser.lastName}`,
        role: existingUser.role
      }
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

// Get available offices for assignment
app.get('/api/admin/offices', (req, res) => {
  const offices = [
    { id: 'head_teacher', name: 'Head Teacher', description: 'Overall academic leadership' },
    { id: 'deputy_head', name: 'Deputy Head Teacher', description: 'Assistant to head teacher' },
    { id: 'discipline_master', name: 'Discipline Master', description: 'Student discipline and behavior' },
    { id: 'sports_coordinator', name: 'Sports Coordinator', description: 'Sports and physical activities' },
    { id: 'library_coordinator', name: 'Library Coordinator', description: 'Library management' },
    { id: 'lab_coordinator', name: 'Laboratory Coordinator', description: 'Science laboratory management' },
    { id: 'hostel_master', name: 'Hostel Master', description: 'Hostel and boarding facilities' },
    { id: 'guidance_counselor', name: 'Guidance Counselor', description: 'Student counseling and guidance' },
    { id: 'exam_coordinator', name: 'Examination Coordinator', description: 'Examination management' },
    { id: 'ict_coordinator', name: 'ICT Coordinator', description: 'Information and communication technology' }
  ];

  res.json({ offices });
});

// Enhanced reports endpoint to accept reports from all office holders
app.post('/api/reports/send-to-admin', async (req, res) => {
  try {
    const { reportType, reportTitle, reportDescription, reportData, parameters, senderRole, senderOffice } = req.body;
    
    if (!reportType || !reportTitle || !reportData) {
      return res.status(400).json({ message: 'Report type, title, and data are required' });
    }

    // Determine sender based on role and office
    const generatedByRole = senderRole || 'exam_officer';
    const generatedBy = 5; // For now, using exam officer ID - in real app, get from auth

    // Extract academic year and term from parameters
    const academicYear = parameters?.academicYear || null;
    const term = parameters?.term || null;
    const startYear = parameters?.startYear || null;
    const endYear = parameters?.endYear || null;

    // Save the report to the Reports table
    const [reportResult] = await sequelize.query(`
      INSERT INTO Reports (
        title, description, reportType, status, generatedBy, generatedByRole,
        sentToAdmin, sentToAdminAt, parameters, reportData, academicYear, term, startYear, endYear
      ) VALUES (?, ?, ?, 'sent_to_admin', ?, ?, 1, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        reportTitle,
        reportDescription || '',
        reportType,
        generatedBy,
        generatedByRole,
        JSON.stringify(parameters || {}),
        JSON.stringify(reportData),
        academicYear,
        term,
        startYear,
        endYear
      ],
      type: 'INSERT'
    }) as any[];

    // Get the created report
    const [savedReport] = await sequelize.query(`
      SELECT 
        r.id, r.title, r.description, r.reportType, r.status, r.sentToAdminAt,
        r.academicYear, r.term, r.startYear, r.endYear,
        u.firstName || ' ' || u.lastName as generatedByName
      FROM Reports r
      LEFT JOIN Users u ON r.generatedBy = u.id
      WHERE r.id = ?
    `, {
      replacements: [reportResult],
      type: 'SELECT'
    }) as any[];
    
    console.log('📊 Report sent to admin:', {
      id: savedReport.id,
      type: reportType,
      title: reportTitle,
      generatedBy: savedReport.generatedByName,
      role: generatedByRole,
      office: senderOffice,
      timestamp: savedReport.sentToAdminAt
    });
    
    res.status(201).json({
      message: 'Report sent to admin successfully',
      report: {
        id: savedReport.id,
        title: savedReport.title,
        type: savedReport.reportType,
        status: savedReport.status,
        sentAt: savedReport.sentToAdminAt,
        academicYear: savedReport.academicYear,
        term: savedReport.term,
        generatedBy: savedReport.generatedByName
      }
    });
  } catch (error) {
    console.error('Error sending report to admin:', error);
    res.status(500).json({ message: 'Failed to send report to admin' });
  }
});

// Student Dashboard Endpoints

// Get current student's dashboard data
app.get('/api/dashboard/student/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get student data with user info and class info
    const [studentData] = await sequelize.query(`
      SELECT 
        s.id as studentId, s.admissionNumber, s.house, s.dateOfBirth,
        u.firstName, u.lastName, u.email, u.phone,
        c.name as className, c.level as classLevel, c.id as classId
      FROM Students s
      JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE s.userId = ? AND s.isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!studentData) {
      return res.status(404).json({ message: 'Student data not found' });
    }

    res.json({
      student: {
        id: studentData.studentId,
        admissionNumber: studentData.admissionNumber,
        house: studentData.house,
        dateOfBirth: studentData.dateOfBirth,
        user: {
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          email: studentData.email,
          phone: studentData.phone
        },
        class: {
          id: studentData.classId,
          name: studentData.className,
          level: studentData.classLevel
        }
      }
    });
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current student's results
app.get('/api/results/student/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const { academicYear, term } = req.query;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get student ID from user ID
    const [student] = await sequelize.query(`
      SELECT id FROM Students WHERE userId = ? AND isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!student) {
      return res.json({ hasResults: false, results: null, subjects: [] });
    }

    // Get the main result record
    const [resultRecord] = await sequelize.query(`
      SELECT * FROM Results 
      WHERE studentId = ? AND academicYear = ? AND term = ? AND published = 1
    `, {
      replacements: [student.id, academicYear, term],
      type: 'SELECT'
    }) as any[];

    if (!resultRecord) {
      return res.json({ hasResults: false, results: null, subjects: [] });
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
        position: resultRecord.position,
        totalStudents: resultRecord.totalStudents,
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
    console.error('Error fetching student results:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current student's attendance
app.get('/api/attendance/student/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const { academicYear, term } = req.query;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get student ID from user ID
    const [student] = await sequelize.query(`
      SELECT id FROM Students WHERE userId = ? AND isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!student) {
      return res.json({ attendanceRecords: [], summary: { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 } });
    }

    // Get attendance records
    const attendanceRecords = await sequelize.query(`
      SELECT 
        attendanceDate, status, remarks
      FROM Attendance 
      WHERE studentId = ? AND academicYear = ? AND term = ?
      ORDER BY attendanceDate DESC
    `, {
      replacements: [student.id, academicYear, term],
      type: 'SELECT'
    }) as any[];

    // Calculate summary
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((record: any) => record.status === 'present').length;
    const absentDays = totalDays - presentDays;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0';

    res.json({
      attendanceRecords,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        percentage: parseFloat(percentage)
      }
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current student's payment history
app.get('/api/payments/student/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const { academicYear, term } = req.query;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get student ID from user ID
    const [student] = await sequelize.query(`
      SELECT id FROM Students WHERE userId = ? AND isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!student) {
      return res.json({ payments: [], summary: { totalAmount: 0, totalPaid: 0, totalBalance: 0 } });
    }

    // Get payment records
    const payments = await sequelize.query(`
      SELECT 
        id, paymentType, amount, amountPaid, balance, paymentDate, dueDate, 
        status, paymentMethod, receiptNumber, description
      FROM Payments 
      WHERE studentId = ? AND academicYear = ? AND term = ?
      ORDER BY paymentDate DESC
    `, {
      replacements: [student.id, academicYear, term],
      type: 'SELECT'
    }) as any[];

    // Calculate summary
    const totalAmount = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    const totalPaid = payments.reduce((sum: number, payment: any) => sum + payment.amountPaid, 0);
    const totalBalance = payments.reduce((sum: number, payment: any) => sum + payment.balance, 0);

    res.json({
      payments,
      summary: {
        totalAmount,
        totalPaid,
        totalBalance
      }
    });
  } catch (error) {
    console.error('Error fetching student payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher Dashboard Endpoints

// Get current teacher's dashboard data
app.get('/api/dashboard/teacher/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get teacher data with staff info
    const [teacherData] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.office, u.role,
        s.employeeId, s.qualification, s.experience, s.subjects, s.salary, s.assignedOffice
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      WHERE u.id = ? AND u.isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!teacherData) {
      return res.status(404).json({ message: 'Teacher data not found' });
    }

    // Get classes assigned to this teacher
    const assignedClasses = await sequelize.query(`
      SELECT id, name, level, capacity FROM Classes WHERE classTeacher = ?
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    res.json({
      teacher: {
        id: teacherData.id,
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        email: teacherData.email,
        phone: teacherData.phone,
        office: teacherData.office,
        role: teacherData.role,
        employeeId: teacherData.employeeId,
        qualification: teacherData.qualification,
        experience: teacherData.experience,
        subjects: teacherData.subjects ? teacherData.subjects.split(',') : [],
        salary: teacherData.salary,
        assignedOffice: teacherData.assignedOffice
      },
      assignedClasses: assignedClasses
    });
  } catch (error) {
    console.error('Error fetching teacher data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Parent Dashboard Endpoints

// Get current parent's dashboard data
app.get('/api/dashboard/parent/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get parent data
    const [parentData] = await sequelize.query(`
      SELECT id, firstName, lastName, email, phone FROM Users WHERE id = ? AND isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!parentData) {
      return res.status(404).json({ message: 'Parent data not found' });
    }

    // Get children (students) associated with this parent
    const children = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.house, s.dateOfBirth,
        u.firstName, u.lastName, u.email,
        c.name as className, c.level as classLevel
      FROM Students s
      JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE s.parentId = ? AND s.isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    res.json({
      parent: {
        id: parentData.id,
        firstName: parentData.firstName,
        lastName: parentData.lastName,
        email: parentData.email,
        phone: parentData.phone
      },
      children: children.map((child: any) => ({
        id: child.id,
        admissionNumber: child.admissionNumber,
        firstName: child.firstName,
        lastName: child.lastName,
        house: child.house,
        dateOfBirth: child.dateOfBirth,
        class: {
          name: child.className,
          level: child.classLevel
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching parent data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Dashboard - Get current admin data
app.get('/api/dashboard/admin/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get admin data
    const [adminData] = await sequelize.query(`
      SELECT id, firstName, lastName, email, phone, office, role FROM Users WHERE id = ? AND isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!adminData) {
      return res.status(404).json({ message: 'Admin data not found' });
    }

    res.json({
      admin: {
        id: adminData.id,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        phone: adminData.phone,
        office: adminData.office,
        role: adminData.role
      }
    });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Exam Officer Dashboard - Get current exam officer data
app.get('/api/dashboard/exam-officer/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get exam officer data with staff info
    const [examOfficerData] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.office, u.role,
        s.employeeId, s.qualification, s.experience, s.salary, s.assignedOffice
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      WHERE u.id = ? AND u.isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!examOfficerData) {
      return res.status(404).json({ message: 'Exam officer data not found' });
    }

    res.json({
      examOfficer: {
        id: examOfficerData.id,
        firstName: examOfficerData.firstName,
        lastName: examOfficerData.lastName,
        email: examOfficerData.email,
        phone: examOfficerData.phone,
        office: examOfficerData.office,
        role: examOfficerData.role,
        employeeId: examOfficerData.employeeId,
        qualification: examOfficerData.qualification,
        experience: examOfficerData.experience,
        salary: examOfficerData.salary,
        assignedOffice: examOfficerData.assignedOffice
      }
    });
  } catch (error) {
    console.error('Error fetching exam officer data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accountant Dashboard Endpoints

// Get current accountant's dashboard data
app.get('/api/dashboard/accountant/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get accountant data
    const [accountantData] = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.phone, u.office, u.role,
        s.employeeId, s.qualification, s.experience, s.salary, s.assignedOffice
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      WHERE u.id = ? AND u.isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!accountantData) {
      return res.status(404).json({ message: 'Accountant data not found' });
    }

    res.json({
      accountant: {
        id: accountantData.id,
        firstName: accountantData.firstName,
        lastName: accountantData.lastName,
        email: accountantData.email,
        phone: accountantData.phone,
        office: accountantData.office,
        role: accountantData.role,
        employeeId: accountantData.employeeId,
        qualification: accountantData.qualification,
        experience: accountantData.experience,
        salary: accountantData.salary,
        assignedOffice: accountantData.assignedOffice
      }
    });
  } catch (error) {
    console.error('Error fetching accountant data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get accountant financial statistics
app.get('/api/dashboard/accountant/stats', async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    
    // Build WHERE clause for filtering
    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];
    
    if (academicYear) {
      whereClause += ' AND academicYear = ?';
      replacements.push(academicYear);
    }
    
    if (term) {
      whereClause += ' AND term = ?';
      replacements.push(term);
    }

    // Get payment statistics
    const [paymentStats] = await sequelize.query(`
      SELECT 
        SUM(amount) as totalAmount,
        SUM(amountPaid) as totalPaid,
        SUM(balance) as totalBalance,
        COUNT(*) as totalPayments,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as confirmedPayments,
        COUNT(CASE WHEN status = 'pending' OR status = 'overdue' THEN 1 END) as pendingPayments
      FROM Payments ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    // Get expenditure statistics
    const [expenditureStats] = await sequelize.query(`
      SELECT 
        SUM(amount) as totalExpenditure,
        COUNT(*) as totalExpenses
      FROM Expenditures ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    // Calculate net balance (income - expenses)
    const totalIncome = paymentStats.totalPaid || 0;
    const totalExpenses = expenditureStats.totalExpenditure || 0;
    const netBalance = totalIncome - totalExpenses;

    // Get payment breakdown by type
    const paymentBreakdown = await sequelize.query(`
      SELECT 
        paymentType,
        SUM(amountPaid) as totalPaid,
        COUNT(*) as count
      FROM Payments ${whereClause} AND amountPaid > 0
      GROUP BY paymentType
      ORDER BY totalPaid DESC
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    // Get expenditure breakdown by category
    const expenditureBreakdown = await sequelize.query(`
      SELECT 
        category,
        SUM(amount) as totalAmount,
        COUNT(*) as count
      FROM Expenditures ${whereClause}
      GROUP BY category
      ORDER BY totalAmount DESC
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    res.json({
      payments: {
        totalAmount: paymentStats.totalAmount || 0,
        totalPaid: paymentStats.totalPaid || 0,
        totalBalance: paymentStats.totalBalance || 0,
        totalPayments: paymentStats.totalPayments || 0,
        confirmedPayments: paymentStats.confirmedPayments || 0,
        pendingPayments: paymentStats.pendingPayments || 0,
        breakdown: paymentBreakdown
      },
      expenditures: {
        totalExpenditure: expenditureStats.totalExpenditure || 0,
        totalExpenses: expenditureStats.totalExpenses || 0,
        breakdown: expenditureBreakdown
      },
      financial: {
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        netBalance: netBalance,
        profitMargin: totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching accountant stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search students for payment confirmation (Accountant)
app.get('/api/accountant/students/search', async (req, res) => {
  try {
    const { search, academicYear, term } = req.query;
    
    if (!search) {
      return res.status(400).json({ message: 'Search term is required' });
    }

    const students = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.house,
        u.firstName, u.lastName, u.email, u.phone,
        c.name as className, c.level as classLevel, c.id as classId,
        p.id as paymentId, p.amount, p.amountPaid, p.balance, p.status, p.paymentType, p.dueDate
      FROM Students s
      JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      LEFT JOIN Payments p ON s.id = p.studentId AND p.academicYear = ? AND p.term = ?
      WHERE s.isActive = 1 AND (
        s.admissionNumber LIKE ? OR 
        u.firstName LIKE ? OR 
        u.lastName LIKE ? OR
        CONCAT(u.firstName, ' ', u.lastName) LIKE ?
      )
      ORDER BY u.firstName, u.lastName
    `, {
      replacements: [
        academicYear || '2024/2025', 
        term || 'second',
        `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`
      ],
      type: 'SELECT'
    }) as any[];

    const formattedStudents = students.map((student: any) => ({
      id: student.id,
      admissionNumber: student.admissionNumber,
      house: student.house,
      user: {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone
      },
      class: {
        id: student.classId,
        name: student.className,
        level: student.classLevel
      },
      payment: student.paymentId ? {
        id: student.paymentId,
        amount: student.amount,
        amountPaid: student.amountPaid,
        balance: student.balance,
        status: student.status,
        paymentType: student.paymentType,
        dueDate: student.dueDate
      } : null
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error('Error searching students for payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm payment for student (Accountant)
app.post('/api/accountant/payments/confirm', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const { 
      studentId, academicYear, term, paymentType, amount, amountPaid, 
      paymentMethod, receiptNumber, description 
    } = req.body;

    // Calculate balance
    const balance = amount - amountPaid;
    const status = balance <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';

    // Insert or update payment record
    const [paymentId] = await sequelize.query(`
      INSERT OR REPLACE INTO Payments 
      (studentId, academicYear, term, paymentType, amount, amountPaid, balance, 
       paymentMethod, receiptNumber, status, confirmedBy, confirmedAt, description, dueDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, date('now', '+30 days'))
    `, {
      replacements: [
        studentId, academicYear, term, paymentType, amount, amountPaid, balance,
        paymentMethod, receiptNumber, status, decoded.userId, description
      ],
      type: 'INSERT'
    }) as any[];

    console.log('💰 Payment confirmed:', {
      studentId,
      amount,
      amountPaid,
      balance,
      status,
      confirmedBy: decoded.userId
    });

    res.json({
      message: 'Payment confirmed successfully',
      payment: {
        id: paymentId,
        studentId,
        academicYear,
        term,
        paymentType,
        amount,
        amountPaid,
        balance,
        status,
        paymentMethod,
        receiptNumber
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add expenditure (Accountant)
app.post('/api/accountant/expenditures', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const { 
      description, category, amount, expenditureDate, academicYear, term,
      receiptNumber, vendor, paymentMethod, notes 
    } = req.body;

    const [expenditureId] = await sequelize.query(`
      INSERT INTO Expenditures 
      (description, category, amount, expenditureDate, academicYear, term,
       approvedBy, recordedBy, receiptNumber, vendor, paymentMethod, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        description, category, amount, expenditureDate, academicYear, term,
        decoded.userId, decoded.userId, receiptNumber, vendor, paymentMethod, notes
      ],
      type: 'INSERT'
    }) as any[];

    console.log('💸 Expenditure recorded:', {
      id: expenditureId,
      description,
      category,
      amount,
      recordedBy: decoded.userId
    });

    res.json({
      message: 'Expenditure recorded successfully',
      expenditure: {
        id: expenditureId,
        description,
        category,
        amount,
        expenditureDate,
        academicYear,
        term
      }
    });
  } catch (error) {
    console.error('Error recording expenditure:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expenditures list (Accountant)
app.get('/api/accountant/expenditures', async (req, res) => {
  try {
    const { academicYear, term, category, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];

    if (academicYear) {
      whereClause += ' AND academicYear = ?';
      replacements.push(academicYear);
    }

    if (term) {
      whereClause += ' AND term = ?';
      replacements.push(term);
    }

    if (category) {
      whereClause += ' AND category = ?';
      replacements.push(category);
    }

    const expenditures = await sequelize.query(`
      SELECT 
        e.*, 
        u1.firstName || ' ' || u1.lastName as approvedByName,
        u2.firstName || ' ' || u2.lastName as recordedByName
      FROM Expenditures e
      LEFT JOIN Users u1 ON e.approvedBy = u1.id
      LEFT JOIN Users u2 ON e.recordedBy = u2.id
      ${whereClause}
      ORDER BY e.expenditureDate DESC, e.createdAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, parseInt(limit as string), offset],
      type: 'SELECT'
    }) as any[];

    // Get total count
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Expenditures e ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    res.json({
      expenditures,
      pagination: {
        current: parseInt(page as string),
        pages: Math.ceil(totalCount.count / parseInt(limit as string)),
        total: totalCount.count
      }
    });
  } catch (error) {
    console.error('Error fetching expenditures:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate payment receipt for student
app.post('/api/accountant/payments/generate-receipt', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const { paymentId, studentId, academicYear, term } = req.body;

    // Get payment details
    const [payment] = await sequelize.query(`
      SELECT 
        p.*, 
        s.admissionNumber,
        u.firstName, u.lastName, u.email,
        c.name as className
      FROM Payments p
      JOIN Students s ON p.studentId = s.id
      JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE p.id = ?
    `, {
      replacements: [paymentId],
      type: 'SELECT'
    }) as any[];

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Generate receipt data
    const receiptData = {
      receiptNumber: payment.receiptNumber || `RCP/${academicYear.replace('/', '')}/${term.toUpperCase()}/${Date.now()}`,
      studentName: `${payment.firstName} ${payment.lastName}`,
      admissionNumber: payment.admissionNumber,
      className: payment.className,
      academicYear: academicYear,
      term: term,
      paymentType: payment.paymentType,
      amount: payment.amount,
      amountPaid: payment.amountPaid,
      balance: payment.balance,
      paymentDate: payment.paymentDate || new Date().toISOString(),
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      description: payment.description,
      confirmedBy: 'School Accountant',
      schoolName: 'Shambil Pride Academy',
      schoolAddress: 'Birnin Gwari, Kaduna State',
      generatedAt: new Date().toISOString()
    };

    // Update payment with receipt number if not exists
    if (!payment.receiptNumber) {
      await sequelize.query(`
        UPDATE Payments SET receiptNumber = ? WHERE id = ?
      `, {
        replacements: [receiptData.receiptNumber, paymentId],
        type: 'UPDATE'
      });
    }

    console.log('🧾 Receipt generated for student:', receiptData.studentName, '- Receipt:', receiptData.receiptNumber);

    res.json({
      message: 'Receipt generated successfully',
      receipt: receiptData
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add money to school account (Manual addition by accountant)
app.post('/api/accountant/add-money', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const { 
      amount, description, source, academicYear, term, 
      paymentMethod, referenceNumber 
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Create a manual money addition record in the Expenditures table with special category 'income'
    const [additionId] = await sequelize.query(`
      INSERT INTO Expenditures 
      (description, category, amount, expenditureDate, academicYear, term, 
       approvedBy, recordedBy, receiptNumber, paymentMethod, status, notes)
      VALUES (?, 'income', ?, date('now'), ?, ?, ?, ?, ?, ?, 'approved', ?)
    `, {
      replacements: [
        `Manual Money Addition: ${description}`,
        Math.abs(amount), // Positive amount, but category 'income' indicates it's income
        academicYear, term,
        decoded.userId, decoded.userId,
        referenceNumber || `MAN/${Date.now()}`,
        paymentMethod,
        `Source: ${source}. Added by accountant.`
      ],
      type: 'INSERT'
    }) as any[];

    console.log('💰 Manual money addition:', {
      amount,
      description,
      source,
      addedBy: decoded.userId,
      referenceNumber
    });

    res.json({
      message: 'Money added successfully',
      addition: {
        id: additionId,
        amount,
        description,
        source,
        referenceNumber,
        academicYear,
        term
      }
    });
  } catch (error) {
    console.error('Error adding money:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student receipts (for student dashboard)
app.get('/api/students/receipts/current', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const { academicYear, term } = req.query;
    
    // Get student ID from user ID
    const [student] = await sequelize.query(`
      SELECT id FROM Students WHERE userId = ? AND isActive = 1
    `, {
      replacements: [decoded.userId],
      type: 'SELECT'
    }) as any[];

    if (!student) {
      return res.json({ receipts: [] });
    }

    // Get payment receipts for the student
    const receipts = await sequelize.query(`
      SELECT 
        id, paymentType, amount, amountPaid, balance, paymentDate, 
        paymentMethod, receiptNumber, status, description, academicYear, term
      FROM Payments 
      WHERE studentId = ? AND receiptNumber IS NOT NULL
      ${academicYear ? 'AND academicYear = ?' : ''}
      ${term ? 'AND term = ?' : ''}
      ORDER BY paymentDate DESC
    `, {
      replacements: [
        student.id,
        ...(academicYear ? [academicYear] : []),
        ...(term ? [term] : [])
      ],
      type: 'SELECT'
    }) as any[];

    res.json({
      receipts: receipts.map((receipt: any) => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        paymentType: receipt.paymentType,
        amount: receipt.amount,
        amountPaid: receipt.amountPaid,
        balance: receipt.balance,
        paymentDate: receipt.paymentDate,
        paymentMethod: receipt.paymentMethod,
        status: receipt.status,
        description: receipt.description,
        academicYear: receipt.academicYear,
        term: receipt.term
      }))
    });
  } catch (error) {
    console.error('Error fetching student receipts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate and send financial report to admin (Accountant)
app.post('/api/accountant/reports/financial', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
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
        SUM(amount) as totalExpenditure,
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
        totalIncome: paymentData.totalPaid || 0,
        totalExpenses: expenditureData.totalExpenditure || 0,
        netBalance: (paymentData.totalPaid || 0) - (expenditureData.totalExpenditure || 0)
      },
      generatedAt: new Date().toISOString()
    };

    // Save report to database
    const [reportId] = await sequelize.query(`
      INSERT INTO Reports 
      (title, description, reportType, status, generatedBy, generatedByRole, 
       sentToAdmin, sentToAdminAt, academicYear, term, reportData, parameters)
      VALUES (?, ?, 'financial', 'sent_to_admin', ?, 'accountant', 1, CURRENT_TIMESTAMP, ?, ?, ?, ?)
    `, {
      replacements: [
        title || `Financial Report - ${academicYear} ${term} Term`,
        description || `Comprehensive financial report for ${academicYear} academic year, ${term} term`,
        decoded.userId,
        academicYear,
        term,
        JSON.stringify(reportData),
        JSON.stringify({ academicYear, term })
      ],
      type: 'INSERT'
    }) as any[];

    console.log('📊 Financial report sent to admin:', {
      id: reportId,
      academicYear,
      term,
      totalIncome: reportData.summary.totalIncome,
      totalExpenses: reportData.summary.totalExpenses,
      netBalance: reportData.summary.netBalance
    });

    res.json({
      message: 'Financial report sent to admin successfully',
      report: {
        id: reportId,
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

// User Management Endpoints for Admin

// Get all users with filtering
app.get('/api/admin/users', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = 'WHERE 1=1';
    let replacements: any[] = [];

    if (role && role !== 'all') {
      whereClause += ' AND u.role = ?';
      replacements.push(role);
    }

    if (search) {
      whereClause += ' AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm, searchTerm);
    }

    const users = await sequelize.query(`
      SELECT 
        u.id, u.firstName, u.lastName, u.email, u.role, u.office, u.phone, 
        u.isActive, u.lastLogin, u.createdAt,
        s.employeeId, s.assignedOffice, s.officeAssignedAt,
        st.admissionNumber, st.classId,
        c.name as className
      FROM Users u
      LEFT JOIN Staff s ON u.id = s.userId
      LEFT JOIN Students st ON u.id = st.userId
      LEFT JOIN Classes c ON st.classId = c.id
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...replacements, parseInt(limit as string), offset],
      type: 'SELECT'
    }) as any[];

    // Get total count
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Users u ${whereClause}
    `, {
      replacements: replacements,
      type: 'SELECT'
    }) as any[];

    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      office: user.office,
      phone: user.phone,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      employeeId: user.employeeId,
      assignedOffice: user.assignedOffice,
      officeAssignedAt: user.officeAssignedAt,
      admissionNumber: user.admissionNumber,
      classId: user.classId,
      className: user.className
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        current: parseInt(page as string),
        pages: Math.ceil(totalCount.count / parseInt(limit as string)),
        total: totalCount.count
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Create new user
app.post('/api/admin/users', async (req, res) => {
  try {
    const { 
      firstName, lastName, email, password, role, office, phone,
      employeeId, admissionNumber, classId, assignedOffice 
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if email already exists
    const [existingUser] = await sequelize.query(
      'SELECT id FROM Users WHERE email = ?',
      { replacements: [email], type: 'SELECT' }
    ) as any[];

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create user
    const [userId] = await sequelize.query(`
      INSERT INTO Users (firstName, lastName, email, password, role, office, phone, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, {
      replacements: [firstName, lastName, email, password, role, office, phone],
      type: 'INSERT'
    }) as any[];

    console.log('👤 New user created:', {
      id: userId,
      name: `${firstName} ${lastName}`,
      role,
      email
    });

    // Create additional records based on role
    if (role === 'student' && admissionNumber && classId) {
      await sequelize.query(`
        INSERT INTO Students (userId, admissionNumber, classId, isActive)
        VALUES (?, ?, ?, 1)
      `, {
        replacements: [userId, admissionNumber, classId],
        type: 'INSERT'
      });
    }

    if ((role === 'teacher' || role === 'exam_officer') && employeeId) {
      await sequelize.query(`
        INSERT INTO Staff (userId, employeeId, assignedOffice, isActive)
        VALUES (?, ?, ?, 1)
      `, {
        replacements: [userId, employeeId, assignedOffice],
        type: 'INSERT'
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        firstName,
        lastName,
        email,
        role,
        office,
        phone
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      firstName, lastName, email, role, office, phone, isActive,
      employeeId, admissionNumber, classId, assignedOffice 
    } = req.body;

    // Update user
    await sequelize.query(`
      UPDATE Users 
      SET firstName = ?, lastName = ?, email = ?, role = ?, office = ?, phone = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [firstName, lastName, email, role, office, phone, isActive, id],
      type: 'UPDATE'
    });

    // Update related records
    if (role === 'student' && admissionNumber && classId) {
      await sequelize.query(`
        INSERT OR REPLACE INTO Students (userId, admissionNumber, classId, isActive)
        VALUES (?, ?, ?, ?)
      `, {
        replacements: [id, admissionNumber, classId, isActive],
        type: 'INSERT'
      });
    }

    if ((role === 'teacher' || role === 'exam_officer') && employeeId) {
      await sequelize.query(`
        INSERT OR REPLACE INTO Staff (userId, employeeId, assignedOffice, isActive)
        VALUES (?, ?, ?, ?)
      `, {
        replacements: [id, employeeId, assignedOffice, isActive],
        type: 'INSERT'
      });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete user
    await sequelize.query(`
      UPDATE Users SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `, {
      replacements: [id],
      type: 'UPDATE'
    });

    // Also soft delete related records
    await sequelize.query(`
      UPDATE Students SET isActive = 0 WHERE userId = ?
    `, {
      replacements: [id],
      type: 'UPDATE'
    });

    await sequelize.query(`
      UPDATE Staff SET isActive = 0 WHERE userId = ?
    `, {
      replacements: [id],
      type: 'UPDATE'
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default app;

// Simple range report endpoint
app.get('/api/reports/range-report', (req, res) => {
  const { startYear, endYear } = req.query;
  
  if (!startYear || !endYear) {
    return res.status(400).json({ message: 'Start year and end year are required' });
  }

  const reportData = {
    academicYear: `${startYear} - ${endYear}`,
    term: 'All Terms',
    totalStudents: 150,
    totalResults: 120,
    averageScore: 75.5,
    passRate: 85.2,
    subjectPerformance: [
      {
        subject: 'Mathematics',
        averageScore: 78.5,
        passRate: 82.0,
        totalEntries: 120
      },
      {
        subject: 'English Language',
        averageScore: 76.2,
        passRate: 88.5,
        totalEntries: 120
      }
    ],
    classPerformance: [
      {
        class: 'JSS 1A',
        averageScore: 77.8,
        passRate: 90.0,
        totalStudents: 30
      }
    ],
    gradeDistribution: [
      { grade: 'A', count: 25, percentage: 20.8 },
      { grade: 'B', count: 35, percentage: 29.2 },
      { grade: 'C', count: 40, percentage: 33.3 }
    ]
  };

  res.json(reportData);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Shambil Pride Academy Birnin Gwari Management Server running on port ${PORT} - Restarted`);
  console.log(`� Usaing SQLite Database (No MongoDB required!)`);
  console.log(`🌐 Frontend: http://localhost:3001`);
  console.log(`🔗 Backend: http://localhost:${PORT}`);
  console.log(`🏫 This is SHAMBIL PRIDE ACADEMY - NOT Kowa High School!`);
});