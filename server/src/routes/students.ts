import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Student from '../models/Student';
import User from '../models/User';
import { auth, authorize } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Get all students
router.get('/', auth, authorize('admin', 'teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, class: classId, status = 'active' } = req.query;
    
    const query: any = { status };
    if (classId) query.class = classId;

    const students = await Student.find(query)
      .populate('user', 'firstName lastName email phone avatar')
      .populate('class', 'name grade section')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments(query);

    res.json({
      students,
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
router.get('/search/admission/:admissionNumber', auth, authorize('admin', 'exam_officer', 'accountant'), async (req: AuthRequest, res: Response) => {
  try {
    const { admissionNumber } = req.params;
    
    const student = await Student.findOne({ admissionNumber })
      .populate('user', 'firstName lastName email phone')
      .populate('class', 'name grade section');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;