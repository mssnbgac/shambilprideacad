import express, { Request, Response } from 'express';
import sequelize from '../config/sqlite-database';

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Get all students
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const students = await sequelize.query(`
      SELECT 
        s.id,
        s.admissionNumber,
        s.studentId,
        s.house,
        s.status,
        s.classId,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        c.name as className,
        c.level as classLevel
      FROM Students s
      LEFT JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE s.status = ?
      ORDER BY s.admissionNumber
      LIMIT ? OFFSET ?
    `, {
      replacements: [status, Number(limit), offset],
      type: 'SELECT'
    });

    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total FROM Students WHERE status = ?
    `, {
      replacements: [status],
      type: 'SELECT'
    });

    const total = (totalResult[0] as any).total;

    res.json({
      students: students.map((student: any) => ({
        id: student.id,
        admissionNumber: student.admissionNumber,
        studentId: student.studentId,
        house: student.house,
        status: student.status,
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
        }
      })),
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search students by admission number
router.get('/search/admission/:admissionNumber', async (req: AuthRequest, res: Response) => {
  try {
    const { admissionNumber } = req.params;
    
    const students = await sequelize.query(`
      SELECT 
        s.id,
        s.admissionNumber,
        s.studentId,
        s.house,
        s.status,
        s.classId,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        c.name as className,
        c.level as classLevel
      FROM Students s
      LEFT JOIN Users u ON s.userId = u.id
      LEFT JOIN Classes c ON s.classId = c.id
      WHERE s.admissionNumber = ?
    `, {
      replacements: [admissionNumber],
      type: 'SELECT'
    });

    if (!students || students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = students[0] as any;

    res.json({
      _id: student.id,
      admissionNumber: student.admissionNumber,
      studentId: student.studentId,
      house: student.house,
      status: student.status,
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
    res.status(500).json({ message: 'Server error', error });
  }
});

// Temporary endpoint to create demo students
router.post('/create-demo', async (req: Request, res: Response) => {
  try {
    // First, check if students already exist
    const existingStudents = await sequelize.query(`
      SELECT COUNT(*) as count FROM Students
    `, { type: 'SELECT' });

    if ((existingStudents[0] as any).count > 0) {
      return res.json({ message: 'Demo students already exist' });
    }

    // Get a user ID and class ID for demo students
    const userResult = await sequelize.query(`
      SELECT id FROM Users WHERE email = ? LIMIT 1
    `, {
      replacements: ['student@shambil.edu.ng'],
      type: 'SELECT'
    });

    const classResult = await sequelize.query(`
      SELECT id FROM Classes WHERE name = ? LIMIT 1
    `, {
      replacements: ['JSS1A'],
      type: 'SELECT'
    });

    if (!userResult || userResult.length === 0 || !classResult || classResult.length === 0) {
      return res.status(400).json({ message: 'Required user or class not found' });
    }

    const userId = (userResult[0] as any).id;
    const classId = (classResult[0] as any).id;

    // Create demo students
    const demoStudents = [
      ['SHA/2024/001', userId, classId, 'Red House', 'active'],
      ['SHA/2024/002', userId, classId, 'Blue House', 'active'],
      ['SHA/2024/003', userId, classId, 'Green House', 'active'],
      ['SHA/2024/004', userId, classId, 'Yellow House', 'active'],
      ['SHA/2024/005', userId, classId, 'Red House', 'active']
    ];

    for (const [admissionNumber, userId, classId, house, status] of demoStudents) {
      await sequelize.query(`
        INSERT INTO Students (admissionNumber, userId, classId, house, status, studentId)
        VALUES (?, ?, ?, ?, ?, ?)
      `, {
        replacements: [admissionNumber, userId, classId, house, status, admissionNumber],
        type: 'INSERT'
      });
    }

    res.json({ 
      message: 'Demo students created successfully!',
      students: demoStudents.map(s => s[0])
    });
  } catch (error) {
    console.error('Create demo students error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;