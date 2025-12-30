import express, { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/sqlite-database';

const router = express.Router();

// Get current parent data with children
router.get('/current', async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    // Get parent user data
    const [parentUser] = await sequelize.query(`
      SELECT id, firstName, lastName, email, phone
      FROM Users 
      WHERE id = ? AND role = 'parent' AND isActive = 1
    `, {
      replacements: [decoded.userId],
      type: QueryTypes.SELECT
    }) as any[];

    if (!parentUser) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    // Get children linked to this parent
    const children = await sequelize.query(`
      SELECT 
        s.id,
        s.admissionNumber,
        s.house,
        s.userId,
        u.firstName,
        u.lastName,
        c.name as className,
        c.level as classLevel
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      WHERE s.parentId = ? AND s.isActive = 1
      ORDER BY u.firstName, u.lastName
    `, {
      replacements: [decoded.userId],
      type: QueryTypes.SELECT
    }) as any[];

    res.json({
      id: parentUser.id,
      firstName: parentUser.firstName,
      lastName: parentUser.lastName,
      email: parentUser.email,
      phone: parentUser.phone,
      children: children.map((child: any) => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        admissionNumber: child.admissionNumber,
        className: child.className,
        classLevel: child.classLevel,
        house: child.house,
        userId: child.userId
      }))
    });
  } catch (error) {
    console.error('Error fetching parent data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific child's dashboard data
router.get('/child/:userId/dashboard', async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const { userId } = req.params;

    // Verify that this child belongs to the requesting parent
    const [childVerification] = await sequelize.query(`
      SELECT s.id, s.userId, s.parentId
      FROM Students s
      WHERE s.userId = ? AND s.parentId = ? AND s.isActive = 1
    `, {
      replacements: [userId, decoded.userId],
      type: QueryTypes.SELECT
    }) as any[];

    if (!childVerification) {
      return res.status(403).json({ message: 'Access denied. Child not linked to your account.' });
    }

    // Get child's attendance data
    const [attendanceData] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalDays,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as presentDays,
        ROUND(
          (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / COUNT(*)), 1
        ) as percentage
      FROM Attendance 
      WHERE studentId = ? AND academicYear = '2024/2025' AND term = 'second'
    `, {
      replacements: [childVerification.id],
      type: QueryTypes.SELECT
    }) as any[];

    // Get child's recent results
    const recentResults = await sequelize.query(`
      SELECT 
        r.id,
        r.academicYear,
        r.term,
        r.totalScore,
        r.averageScore,
        r.overallGrade,
        r.published,
        sr.subjectId,
        s.name as subjectName,
        sr.total as subjectTotal,
        sr.grade as subjectGrade
      FROM Results r
      LEFT JOIN SubjectResults sr ON r.id = sr.resultId
      LEFT JOIN Subjects s ON sr.subjectId = s.id
      WHERE r.studentId = ? AND r.published = 1
      ORDER BY r.updatedAt DESC
      LIMIT 10
    `, {
      replacements: [childVerification.id],
      type: QueryTypes.SELECT
    }) as any[];

    // Get child's payment records
    const payments = await sequelize.query(`
      SELECT 
        p.id,
        p.paymentType,
        p.amount,
        p.amountPaid,
        p.balance,
        p.status,
        p.paymentDate,
        p.receiptNumber,
        p.academicYear,
        p.term
      FROM Payments p
      WHERE p.studentId = ?
      ORDER BY p.paymentDate DESC
      LIMIT 5
    `, {
      replacements: [childVerification.id],
      type: QueryTypes.SELECT
    }) as any[];

    res.json({
      attendance: {
        percentage: attendanceData?.percentage || 0,
        present: attendanceData?.presentDays || 0,
        totalDays: attendanceData?.totalDays || 0
      },
      recentResults: recentResults.map((result: any) => ({
        id: result.id,
        academicYear: result.academicYear,
        term: result.term,
        subject: result.subjectName,
        total: result.subjectTotal,
        grade: result.subjectGrade,
        overallGrade: result.overallGrade,
        averageScore: result.averageScore
      })),
      payments: payments,
      nextExams: [] // Placeholder for upcoming exams
    });
  } catch (error) {
    console.error('Error fetching child dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get child's detailed information
router.get('/child/:userId/details', async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const { userId } = req.params;

    // Verify that this child belongs to the requesting parent
    const [childDetails] = await sequelize.query(`
      SELECT 
        s.id,
        s.admissionNumber,
        s.house,
        s.dateOfBirth,
        s.guardianName,
        s.guardianPhone,
        s.address,
        s.bloodGroup,
        s.medicalConditions,
        s.emergencyContact,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        c.name as className,
        c.level as classLevel,
        c.capacity as classCapacity
      FROM Students s
      JOIN Users u ON s.userId = u.id
      JOIN Classes c ON s.classId = c.id
      WHERE s.userId = ? AND s.parentId = ? AND s.isActive = 1
    `, {
      replacements: [userId, decoded.userId],
      type: QueryTypes.SELECT
    }) as any[];

    if (!childDetails) {
      return res.status(403).json({ message: 'Access denied. Child not linked to your account.' });
    }

    res.json(childDetails);
  } catch (error) {
    console.error('Error fetching child details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;