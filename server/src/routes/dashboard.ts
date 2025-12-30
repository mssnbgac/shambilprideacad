import express from 'express';
import { auth, authorize, AuthRequest } from '../middleware/auth';
import sequelize from '../config/sqlite-database';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    
    // Common stats for all roles
    const [studentCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Students WHERE isActive = 1',
      { type: QueryTypes.SELECT }
    ) as any[];

    const [teacherCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Users WHERE role IN ("teacher", "exam_officer") AND isActive = 1',
      { type: QueryTypes.SELECT }
    ) as any[];

    const [classCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Classes',
      { type: QueryTypes.SELECT }
    ) as any[];

    // Today's date for attendance
    const today = new Date().toISOString().split('T')[0];
    const [todayAttendance] = await sequelize.query(
      'SELECT COUNT(*) as count FROM Attendance WHERE attendanceDate = ? AND status = "present"',
      { replacements: [today], type: QueryTypes.SELECT }
    ) as any[];

    let roleSpecificStats = {};

    if (user?.role === 'admin' || user?.role === 'director') {
      // Admin specific stats
      const [financialSummary] = await sequelize.query(`
        SELECT 
          SUM(amount) as totalRevenue,
          SUM(amountPaid) as totalPaid,
          COUNT(CASE WHEN status = 'pending' OR status = 'overdue' THEN 1 END) as pendingPayments
        FROM Payments
      `, { type: QueryTypes.SELECT }) as any[];

      const [commentsSummary] = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN status = 'unread' THEN 1 END) as pendingReports,
          COUNT(*) as openComplaints
        FROM Comments
      `, { type: QueryTypes.SELECT }) as any[];

      roleSpecificStats = {
        totalRevenue: financialSummary?.totalRevenue || 0,
        totalPaid: financialSummary?.totalPaid || 0,
        pendingPayments: financialSummary?.pendingPayments || 0,
        pendingReports: commentsSummary?.pendingReports || 0,
        openComplaints: commentsSummary?.openComplaints || 0
      };
    }

    res.json({
      success: true,
      data: {
        totalStudents: studentCount?.count || 0,
        totalTeachers: teacherCount?.count || 0,
        totalClasses: classCount?.count || 0,
        todayAttendance: todayAttendance?.count || 0,
        ...roleSpecificStats
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// Get recent students (admin only)
router.get('/recent-students', auth, authorize('admin', 'director', 'principal'), async (req, res) => {
  try {
    const recentStudents = await sequelize.query(`
      SELECT 
        s.id, s.admissionNumber, s.createdAt,
        u.firstName, u.lastName
      FROM Students s
      JOIN Users u ON s.userId = u.id
      WHERE s.isActive = 1
      ORDER BY s.createdAt DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: recentStudents
    });

  } catch (error) {
    console.error('Recent students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent students'
    });
  }
});

// Get students by class distribution
router.get('/students-by-class', auth, authorize('admin', 'director', 'principal'), async (req, res) => {
  try {
    const classDistribution = await sequelize.query(`
      SELECT 
        c.name as className,
        c.level as classLevel,
        COUNT(s.id) as studentCount
      FROM Classes c
      LEFT JOIN Students s ON c.id = s.classId AND s.isActive = 1
      GROUP BY c.id, c.name, c.level
      ORDER BY c.level, c.name
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: classDistribution
    });

  } catch (error) {
    console.error('Class distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class distribution'
    });
  }
});

// Get financial overview (admin/accountant only)
router.get('/financial-overview', auth, authorize('admin', 'director', 'accountant'), async (req, res) => {
  try {
    const payments = await sequelize.query(`
      SELECT 
        SUM(amount) as totalAmount,
        SUM(amountPaid) as totalPaid,
        COUNT(*) as totalTransactions,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paidCount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdueCount
      FROM Payments
    `, { type: QueryTypes.SELECT });

    const expenditure = await sequelize.query(`
      SELECT 
        SUM(amount) as totalExpenditure,
        COUNT(*) as totalExpenses
      FROM Expenditures
      WHERE YEAR(createdAt) = YEAR(CURRENT_DATE)
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        payments: payments[0] || {},
        expenditure: expenditure[0] || {}
      }
    });

  } catch (error) {
    console.error('Financial overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial overview'
    });
  }
});

// Get academic performance overview (admin/exam_officer only)
router.get('/academic-overview', auth, authorize('admin', 'director', 'exam_officer'), async (req, res) => {
  try {
    const results = await sequelize.query(`
      SELECT 
        AVG(totalScore) as averageScore,
        COUNT(*) as totalResults,
        COUNT(CASE WHEN overallGrade IN ('A', 'B') THEN 1 END) as excellentGrades,
        COUNT(CASE WHEN overallGrade IN ('C', 'D') THEN 1 END) as goodGrades,
        COUNT(CASE WHEN overallGrade IN ('E', 'F') THEN 1 END) as poorGrades
      FROM Results
      WHERE published = 1
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: results[0] || {}
    });

  } catch (error) {
    console.error('Academic overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic overview'
    });
  }
});

// Get daily reports summary (admin only)
router.get('/daily-reports', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    const reports = await sequelize.query(`
      SELECT 
        COUNT(*) as totalReports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingReports,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolvedReports
      FROM DailyReports
      WHERE DATE(createdAt) = DATE('now')
    `, { type: QueryTypes.SELECT });

    const recentReports = await sequelize.query(`
      SELECT 
        id, title, description, status, createdAt
      FROM DailyReports
      ORDER BY createdAt DESC
      LIMIT 5
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        summary: reports[0] || {},
        recent: recentReports || []
      }
    });

  } catch (error) {
    console.error('Daily reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily reports'
    });
  }
});

// Get student dashboard data
router.get('/student', auth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const student = await sequelize.query(`
      SELECT s.*, c.name as className, c.level as classLevel
      FROM Students s
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE s.userId = ? AND s.isActive = 1
    `, { replacements: [user?.id], type: QueryTypes.SELECT });

    if (!student || (student as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const studentData = (student as any[])[0];

    // Get student results
    const results = await sequelize.query(`
      SELECT * FROM Results 
      WHERE studentId = ? AND published = 1
      ORDER BY createdAt DESC
      LIMIT 5
    `, { replacements: [studentData.admissionNumber], type: QueryTypes.SELECT });

    // Get student payments
    const payments = await sequelize.query(`
      SELECT * FROM Payments 
      WHERE studentId = ?
      ORDER BY createdAt DESC
      LIMIT 5
    `, { replacements: [studentData.admissionNumber], type: QueryTypes.SELECT });

    // Get attendance summary
    const attendance = await sequelize.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM Attendance 
      WHERE studentId = ?
      GROUP BY status
    `, { replacements: [studentData.admissionNumber], type: QueryTypes.SELECT });

    const attendanceSummary = { present: 0, absent: 0, late: 0 };
    (attendance as any[]).forEach((item: any) => {
      attendanceSummary[item.status as keyof typeof attendanceSummary] = item.count;
    });

    res.json({
      success: true,
      data: {
        student: studentData,
        results: results || [],
        payments: payments || [],
        attendance: attendanceSummary
      }
    });

  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student dashboard data'
    });
  }
});

// Get teacher dashboard data
router.get('/teacher', auth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const teacher = await sequelize.query(`
      SELECT * FROM Staff 
      WHERE userId = ?
    `, { replacements: [user?.id], type: QueryTypes.SELECT });

    if (!teacher || (teacher as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found'
      });
    }

    const teacherData = (teacher as any[])[0];

    // Get assigned classes
    const classes = await sequelize.query(`
      SELECT * FROM Classes 
      WHERE classTeacherId = ?
    `, { replacements: [teacherData.id], type: QueryTypes.SELECT });

    // Get recent grades entered
    const grades = await sequelize.query(`
      SELECT COUNT(*) as count FROM Results 
      WHERE enteredBy = ?
    `, { replacements: [user?.id], type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        teacher: teacherData,
        classes: classes || [],
        gradesEntered: ((grades as any[])[0])?.count || 0
      }
    });

  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher dashboard data'
    });
  }
});

// Get exam officer dashboard data
router.get('/exam-officer', auth, authorize('exam_officer'), async (req, res) => {
  try {
    // Get total students
    const students = await sequelize.query(`
      SELECT COUNT(*) as count FROM Students 
      WHERE isActive = 1
    `, { type: QueryTypes.SELECT });

    // Get results summary
    const results = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN published = 1 THEN 1 END) as published,
        COUNT(CASE WHEN published = 0 THEN 1 END) as unpublished
      FROM Results
    `, { type: QueryTypes.SELECT });

    // Get recent results
    const recentResults = await sequelize.query(`
      SELECT 
        r.*, s.admissionNumber, u.firstName, u.lastName
      FROM Results r
      LEFT JOIN Students s ON r.studentId = s.admissionNumber
      LEFT JOIN Users u ON s.userId = u.id
      ORDER BY r.createdAt DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        totalStudents: ((students as any[])[0])?.count || 0,
        results: (results as any[])[0] || {},
        recentResults: recentResults || []
      }
    });

  } catch (error) {
    console.error('Exam officer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam officer dashboard data'
    });
  }
});

// Get parent dashboard data
router.get('/parent', auth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    
    // Get children (students linked to this parent)
    const children = await sequelize.query(`
      SELECT s.*, c.name as className, c.level as classLevel,
             u.firstName, u.lastName
      FROM Students s
      LEFT JOIN Classes c ON s.classId = c.id
      LEFT JOIN Users u ON s.userId = u.id
      WHERE s.guardianName = ? OR s.guardianPhone = ? OR u.email = ?
    `, { 
      replacements: [user?.firstName + ' ' + user?.lastName, user?.phone, user?.email], 
      type: QueryTypes.SELECT 
    });

    const childrenData = [];
    
    for (const child of children as any[]) {
      // Get results for each child
      const results = await sequelize.query(`
        SELECT * FROM Results 
        WHERE studentId = ? AND published = 1
        ORDER BY createdAt DESC
        LIMIT 3
      `, { replacements: [child.admissionNumber], type: QueryTypes.SELECT });

      // Get payments for each child
      const payments = await sequelize.query(`
        SELECT * FROM Payments 
        WHERE studentId = ?
        ORDER BY createdAt DESC
        LIMIT 3
      `, { replacements: [child.admissionNumber], type: QueryTypes.SELECT });

      // Get attendance for each child
      const attendance = await sequelize.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM Attendance 
        WHERE studentId = ?
        GROUP BY status
      `, { replacements: [child.admissionNumber], type: QueryTypes.SELECT });

      const attendanceSummary = { present: 0, absent: 0, late: 0 };
      (attendance as any[]).forEach((item: any) => {
        attendanceSummary[item.status as keyof typeof attendanceSummary] = item.count;
      });

      childrenData.push({
        student: child,
        results: results || [],
        payments: payments || [],
        attendance: attendanceSummary
      });
    }

    res.json({
      success: true,
      data: {
        children: childrenData
      }
    });

  } catch (error) {
    console.error('Parent dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parent dashboard data'
    });
  }
});

export default router;
