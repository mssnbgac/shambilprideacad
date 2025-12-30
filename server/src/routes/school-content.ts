import express from 'express';
import { body, validationResult } from 'express-validator';
import SchoolContent from '../models/SchoolContent';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

// @route   GET /api/school-content
// @desc    Get school content (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { section } = req.query;
    
    const query: any = { isPublished: true };
    if (section) query.section = section;

    const content = await SchoolContent.find(query)
      .populate('updatedBy', 'firstName lastName')
      .sort({ order: 1, createdAt: -1 });

    res.json(content);
  } catch (error) {
    console.error('Get school content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/school-content
// @desc    Create school content
// @access  Private (Admin only)
router.post('/', authenticate, authorize('admin'), [
  body('section').isIn(['about', 'history', 'aims_objectives', 'gallery', 'news', 'events', 'achievements']).withMessage('Valid section is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { section, title, content, images, isPublished, order } = req.body;

    const schoolContent = new SchoolContent({
      section,
      title,
      content,
      images: images || [],
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : undefined,
      updatedBy: req.user!._id,
      order: order || 0
    });

    await schoolContent.save();
    await schoolContent.populate('updatedBy', 'firstName lastName');

    res.status(201).json({
      message: 'Content created successfully',
      content: schoolContent
    });
  } catch (error) {
    console.error('Create school content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/school-content/:id
// @desc    Update school content
// @access  Private (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const content = await SchoolContent.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const { title, content: contentText, images, isPublished, order } = req.body;

    if (title) content.title = title;
    if (contentText) content.content = contentText;
    if (images) content.images = images;
    if (typeof isPublished === 'boolean') {
      content.isPublished = isPublished;
      if (isPublished && !content.publishedAt) {
        content.publishedAt = new Date();
      }
    }
    if (order !== undefined) content.order = order;
    content.updatedBy = req.user!._id;

    await content.save();
    await content.populate('updatedBy', 'firstName lastName');

    res.json({
      message: 'Content updated successfully',
      content
    });
  } catch (error) {
    console.error('Update school content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/school-content/admin
// @desc    Get all school content for admin
// @access  Private (Admin only)
router.get('/admin', authenticate, authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { section } = req.query;
    
    const query: any = {};
    if (section) query.section = section;

    const content = await SchoolContent.find(query)
      .populate('updatedBy', 'firstName lastName')
      .sort({ section: 1, order: 1, createdAt: -1 });

    res.json(content);
  } catch (error) {
    console.error('Get admin school content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/school-content/:id
// @desc    Delete school content
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const content = await SchoolContent.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    await SchoolContent.findByIdAndDelete(req.params.id);

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete school content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;