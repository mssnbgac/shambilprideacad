import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Staff from '../models/Staff';
import User from '../models/User';
import { auth, authorize } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Get all staff members
router.get('/', auth, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, department, status = 'active' } = req.query;
    
    const query: any = { status };
    if (department) query.department = department;

    const staff = await Staff.find(query)
      .populate('user', 'firstName lastName email phone avatar role')
      .populate('classes', 'name grade section')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Staff.countDocuments(query);

    res.json({
      staff,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new staff member
router.post('/', [
  auth,
  authorize('admin'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['teacher', 'accountant', 'exam_officer', 'admin']).withMessage('Invalid role'),
  body('department').notEmpty().withMessage('Department is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('dateOfJoining').isISO8601().withMessage('Valid date of joining is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName, lastName, email, password, role, phone,
      department, position, dateOfJoining, salary, qualifications,
      subjects, emergencyContact, address
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate staff ID
    const staffCount = await Staff.countDocuments();
    const staffId = `STF${String(staffCount + 1).padStart(4, '0')}`;

    // Create user account
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      phone
    });

    await user.save();

    // Create staff record
    const staff = new Staff({
      user: user._id,
      staffId,
      department,
      position,
      dateOfJoining,
      salary,
      qualifications: qualifications || [],
      subjects: subjects || [],
      emergencyContact,
      address
    });

    await staff.save();

    const populatedStaff = await Staff.findById(staff._id)
      .populate('user', 'firstName lastName email phone role');

    res.status(201).json(populatedStaff);
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update staff member
router.put('/:id', [
  auth,
  authorize('admin')
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Update user data if provided
    if (updates.firstName || updates.lastName || updates.email || updates.phone) {
      await User.findByIdAndUpdate(staff.user, {
        firstName: updates.firstName,
        lastName: updates.lastName,
        email: updates.email,
        phone: updates.phone
      });
    }

    // Update staff data
    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).populate('user', 'firstName lastName email phone role');

    res.json(updatedStaff);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete staff member
router.delete('/:id', auth, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Delete user account
    await User.findByIdAndDelete(staff.user);
    
    // Delete staff record
    await Staff.findByIdAndDelete(id);

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;