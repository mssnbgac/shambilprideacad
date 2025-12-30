import express from 'express';
import { body, validationResult } from 'express-validator';
import Report from '../models/Report';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// @route   POST /api/reports
// @desc    Submit a report
// @access  Private (All roles except student/parent)
router.post('/', authorize('admin', 'director', 'principal', 'teacher', 'accountant', 'exam_officer'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('type').isIn(['academic', 'financial', 'disciplinary', 'administrative', 'other']).withMessage('Valid type is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('academicSession').trim().notEmpty().withMessage('Academic session is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, type, content, attachments, submittedTo, academicSession, term, priority } = req.body;

    const report = new Report({
      title,
      type,
      content,
      attachments: attachments || [],
      submittedBy: req.user!._id,
      submittedTo: submittedTo || '507f1f77bcf86cd799439011', // Default to admin
      academicSession,
      term,
      priority: priority || 'medium'
    });

    await report.save();
    await report.populate('submittedBy', 'firstName lastName role office');

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports
// @desc    Get reports
// @access  Private
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, type, status, academicSession, term } = req.query;
    const user = req.user!;

    let query: any = {};

    // Filter based on user role
    if (user.role === 'admin' || user.role === 'director') {
      // Admin and director can see all reports
      if (type) query.type = type;
      if (status) query.status = status;
    } else {
      // Others can only see reports they submitted or reports submitted to them
      query.$or = [
        { submittedBy: user._id },
        { submittedTo: user._id }
      ];
    }

    if (academicSession) query.academicSession = academicSession;
    if (term) query.term = term;
    query.isArchived = false;

    const reports = await Report.find(query)
      .populate('submittedBy', 'firstName lastName role office')
      .populate('submittedTo', 'firstName lastName role office')
      .populate('reviewedBy', 'firstName lastName role')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/reports/:id/review
// @desc    Review a report
// @access  Private (Admin, Director, Principal)
router.put('/:id/review', authorize('admin', 'director', 'principal'), [
  body('status').isIn(['reviewed', 'approved', 'rejected']).withMessage('Valid status is required'),
  body('reviewComments').optional().trim()
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reviewComments } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;
    report.reviewComments = reviewComments;
    report.reviewedBy = req.user!._id;
    report.reviewedAt = new Date();

    await report.save();
    await report.populate('submittedBy', 'firstName lastName role office');
    await report.populate('reviewedBy', 'firstName lastName role');

    res.json({
      message: 'Report reviewed successfully',
      report
    });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/sessions
// @desc    Get available academic sessions
// @access  Private
router.get('/sessions', async (req: AuthRequest, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const sessions = [];
    
    // Generate sessions from 2020/2021 to 2149/2150
    for (let year = 2020; year <= 2149; year++) {
      sessions.push(`${year}/${year + 1}`);
    }

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;