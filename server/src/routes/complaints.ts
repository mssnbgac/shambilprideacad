import express from 'express';
import { body, validationResult } from 'express-validator';
import Complaint from '../models/Complaint';
import User from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// @route   POST /api/complaints
// @desc    Submit a complaint
// @access  Private (Student, Parent)
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['academic', 'financial', 'disciplinary', 'facility', 'teacher', 'other']).withMessage('Valid category is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, submittedTo, student, priority, attachments } = req.body;

    // Default recipients based on category
    let defaultRecipients = [];
    if (category === 'academic') {
      const examOfficers = await User.find({ role: 'exam_officer', isActive: true });
      defaultRecipients = examOfficers.map(officer => officer._id);
    } else if (category === 'financial') {
      const accountants = await User.find({ role: 'accountant', isActive: true });
      defaultRecipients = accountants.map(acc => acc._id);
    }
    
    // Always include admin
    const admin = await User.findOne({ role: 'admin', isActive: true });
    if (admin) defaultRecipients.push(admin._id);

    const complaint = new Complaint({
      title,
      description,
      category,
      submittedBy: req.user!._id,
      submittedTo: submittedTo || defaultRecipients,
      student,
      priority: priority || 'medium',
      attachments: attachments || []
    });

    await complaint.save();
    await complaint.populate('submittedBy', 'firstName lastName role');
    await complaint.populate('submittedTo', 'firstName lastName role office');

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/complaints
// @desc    Get complaints
// @access  Private
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    const user = req.user!;

    let query: any = {};

    // Filter based on user role
    if (user.role === 'admin' || user.role === 'director') {
      // Admin and director can see all complaints
    } else if (user.role === 'exam_officer' || user.role === 'accountant' || user.role === 'principal') {
      // These roles can see complaints submitted to them or by them
      query.$or = [
        { submittedBy: user._id },
        { submittedTo: { $in: [user._id] } }
      ];
    } else {
      // Students and parents can only see their own complaints
      query.submittedBy = user._id;
    }

    if (status) query.status = status;
    if (category) query.category = category;

    const complaints = await Complaint.find(query)
      .populate('submittedBy', 'firstName lastName role')
      .populate('submittedTo', 'firstName lastName role office')
      .populate('student', 'studentId user')
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('responses.respondedBy', 'firstName lastName role')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Complaint.countDocuments(query);

    res.json({
      complaints,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/complaints/:id/respond
// @desc    Respond to a complaint
// @access  Private (Admin, Exam Officer, Principal)
router.post('/:id/respond', authorize('admin', 'director', 'principal', 'exam_officer', 'accountant'), [
  body('response').trim().notEmpty().withMessage('Response is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { response } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user is authorized to respond
    const canRespond = complaint.submittedTo.some(id => id.toString() === req.user!._id.toString()) ||
                      req.user!.role === 'admin' || req.user!.role === 'director';

    if (!canRespond) {
      return res.status(403).json({ message: 'Not authorized to respond to this complaint' });
    }

    complaint.responses.push({
      respondedBy: req.user!._id,
      response,
      respondedAt: new Date()
    });

    if (complaint.status === 'open') {
      complaint.status = 'in_progress';
    }

    await complaint.save();
    await complaint.populate('responses.respondedBy', 'firstName lastName role');

    res.json({
      message: 'Response added successfully',
      complaint
    });
  } catch (error) {
    console.error('Respond to complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/complaints/:id/resolve
// @desc    Resolve a complaint
// @access  Private (Admin, Principal)
router.put('/:id/resolve', authorize('admin', 'director', 'principal'), [
  body('resolution').trim().notEmpty().withMessage('Resolution is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resolution } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = 'resolved';
    complaint.resolution = resolution;
    complaint.resolvedBy = req.user!._id;
    complaint.resolvedAt = new Date();

    await complaint.save();
    await complaint.populate('resolvedBy', 'firstName lastName role');

    res.json({
      message: 'Complaint resolved successfully',
      complaint
    });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;