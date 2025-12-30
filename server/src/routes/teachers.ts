import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Teacher from '../models/Teacher';
import User from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// @route   GET /api/teachers
// @desc    Get all teachers
// @access  Private (Admin)
router.get('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, department, status = 'active' } = req.query;
    
    const query: any = { status };
    if (department) query.department = department;

    const teachers = await Teacher.find(query)
      .populate('user', 'firstName lastName email phone avatar')
      .populate('subjects', 'name code')
      .populate('classes', 'name grade section')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Teacher.countDocuments(query);

    res.json({
      teachers,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/teachers
// @desc    Create new teacher
// @access  Private (Admin)
router.post('/', authorize('admin'), [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('experience').isNumeric().withMessage('Experience must be a number'),
  body('dateOfJoining').isISO8601().withMessage('Valid joining date is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName, lastName, email, password, phone,
      employeeId, department, subjects, classes, qualification,
      experience, dateOfJoining, salary, address, emergencyContact
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if employee ID already exists
    const existingTeacher = await Teacher.findOne({ employeeId });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    // Create user account
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'teacher',
      phone
    });
    await user.save();

    // Create teacher profile
    const teacher = new Teacher({
      user: user._id,
      employeeId,
      department,
      subjects: subjects || [],
      classes: classes || [],
      qualification: qualification || [],
      experience,
      dateOfJoining,
      salary,
      address,
      emergencyContact
    });
    await teacher.save();

    await teacher.populate('user', 'firstName lastName email phone');

    res.status(201).json({
      message: 'Teacher created successfully',
      teacher
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;