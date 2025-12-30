import express from 'express';
import DailyReport from '../models/DailyReport';
import { auth, authorize } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get all reports (Admin, Director)
router.get('/', auth, authorize(['admin', 'director']), async (req, res) => {
  try {
    const { reportType, academicYear, term, status, office } = req.query;
    const filter: any = {};
    
    if (reportType) filter.reportType = reportType;
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;
    if (status) filter.status = status;
    if (office) filter.office = office;

    const reports = await DailyReport.find(filter)
      .populate('submittedBy', 'firstName lastName role office')
      .populate('submittedTo', 'firstName lastName role')
      .populate('reviewedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get reports submitted by user
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { reportType, academicYear, term, status } = req.query;
    const filter: any = { submittedBy: req.user.id };
    
    if (reportType) filter.reportType = reportType;
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;
    if (status) filter.status = status;

    const reports = await DailyReport.find(filter)
      .populate('submittedTo', 'firstName lastName role')
      .populate('reviewedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create report
router.post('/', auth, [
  body('reportType').isIn(['financial', 'academic', 'disciplinary', 'administrative', 'other']).withMessage('Valid report type is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required'),
  body('submittedTo').notEmpty().withMessage('Recipient is required'),
  body('office').notEmpty().withMessage('Office is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const report = new DailyReport({
      ...req.body,
      submittedBy: req.user.id,
      status: 'submitted'
    });

    await report.save();
    await report.populate('submittedBy', 'firstName lastName role office');
    await report.populate('submittedTo', 'firstName lastName role');

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update report
router.put('/:id', auth, async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user can update this report
    if (report.submittedBy.toString() !== req.user.id && !['admin', 'director'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow updates if report is in draft or submitted status
    if (!['draft', 'submitted'].includes(report.status)) {
      return res.status(400).json({ message: 'Cannot update reviewed report' });
    }

    Object.assign(report, req.body);
    await report.save();

    await report.populate('submittedBy', 'firstName lastName role office');
    await report.populate('submittedTo', 'firstName lastName role');

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Review report
router.put('/:id/review', auth, authorize(['admin', 'director']), [
  body('status').isIn(['reviewed', 'approved', 'rejected']).withMessage('Valid status is required'),
  body('reviewComments').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = req.body.status;
    report.reviewComments = req.body.reviewComments;
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();

    await report.save();
    await report.populate('submittedBy', 'firstName lastName role office');
    await report.populate('reviewedBy', 'firstName lastName role');

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get report by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName role office')
      .populate('submittedTo', 'firstName lastName role')
      .populate('reviewedBy', 'firstName lastName role');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check access permissions
    const canAccess = 
      report.submittedBy._id.toString() === req.user.id ||
      report.submittedTo._id.toString() === req.user.id ||
      ['admin', 'director'].includes(req.user.role);

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete report
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user can delete this report
    const canDelete = 
      report.submittedBy.toString() === req.user.id ||
      ['admin', 'director'].includes(req.user.role);

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow deletion if report is in draft status
    if (report.status !== 'draft') {
      return res.status(400).json({ message: 'Cannot delete submitted report' });
    }

    await DailyReport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get reports summary
router.get('/summary/stats', auth, authorize(['admin', 'director']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    const filter: any = {};
    
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;

    const summary = await DailyReport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$reportType',
          count: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0]
            }
          },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const totalStats = await DailyReport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          pendingReports: {
            $sum: {
              $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0]
            }
          },
          approvedReports: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
            }
          },
          rejectedReports: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      byType: summary,
      total: totalStats[0] || {
        totalReports: 0,
        pendingReports: 0,
        approvedReports: 0,
        rejectedReports: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;