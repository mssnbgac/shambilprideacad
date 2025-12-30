import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Comment from '../models/Comment';
import { auth, authorize } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Get comments (for admin and exam officer)
router.get('/', auth, authorize('admin', 'exam_officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, priority, category } = req.query;
    const userRole = req.user.role;
    
    const query: any = {};
    
    // Filter by recipient based on user role
    if (userRole === 'exam_officer') {
      query.recipient = 'exam_officer';
    } else if (userRole === 'admin') {
      // Admin can see all comments
      if (req.query.recipient) {
        query.recipient = req.query.recipient;
      }
    }
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const comments = await Comment.find(query)
      .populate('sender', 'firstName lastName email role')
      .populate('respondedBy', 'firstName lastName email')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Comment.countDocuments(query);

    res.json({
      comments,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new comment
router.post('/', [
  auth,
  authorize('parent', 'student'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('recipient').isIn(['admin', 'exam_officer']).withMessage('Invalid recipient')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message, recipient, category, priority } = req.body;
    const senderRole = req.user.role;

    // Validate recipient based on sender role
    if (senderRole === 'parent' && recipient !== 'admin') {
      return res.status(400).json({ message: 'Parents can only send comments to admin' });
    }
    
    if (senderRole === 'student' && !['admin', 'exam_officer'].includes(recipient)) {
      return res.status(400).json({ message: 'Students can only send comments to admin or exam officer' });
    }

    const comment = new Comment({
      sender: req.user.id,
      recipient,
      title,
      message,
      category: category || 'other',
      priority: priority || 'medium'
    });

    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('sender', 'firstName lastName email role');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update comment status
router.patch('/:id/status', auth, authorize('admin', 'exam_officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user has permission to update this comment
    const userRole = req.user.role;
    if (userRole === 'exam_officer' && comment.recipient !== 'exam_officer') {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    comment.status = status;
    if (status === 'read' && comment.status === 'pending') {
      // Mark as read for the first time
    }

    await comment.save();

    const updatedComment = await Comment.findById(id)
      .populate('sender', 'firstName lastName email role')
      .populate('respondedBy', 'firstName lastName email');

    res.json(updatedComment);
  } catch (error) {
    console.error('Update comment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to comment
router.patch('/:id/respond', [
  auth,
  authorize('admin', 'exam_officer'),
  body('response').notEmpty().withMessage('Response is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { response } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user has permission to respond to this comment
    const userRole = req.user.role;
    if (userRole === 'exam_officer' && comment.recipient !== 'exam_officer') {
      return res.status(403).json({ message: 'Not authorized to respond to this comment' });
    }

    comment.response = response;
    comment.respondedBy = req.user.id;
    comment.respondedAt = new Date();
    comment.status = 'responded';

    await comment.save();

    const updatedComment = await Comment.findById(id)
      .populate('sender', 'firstName lastName email role')
      .populate('respondedBy', 'firstName lastName email');

    res.json(updatedComment);
  } catch (error) {
    console.error('Respond to comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's own comments
router.get('/my-comments', auth, authorize('parent', 'student'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query: any = { sender: req.user.id };
    if (status) query.status = status;

    const comments = await Comment.find(query)
      .populate('respondedBy', 'firstName lastName email')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Comment.countDocuments(query);

    res.json({
      comments,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get my comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;