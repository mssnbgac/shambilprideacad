import express from 'express';
import Result from '../models/Result';
import Student from '../models/Student';
import Class from '../models/Class';
import { auth, authorize } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get all results (Admin, Exam Officer)
router.get('/', auth, authorize(['admin', 'director', 'exam_officer', 'teacher']), async (req, res) => {
  try {
    const { academicYear, term, class: classId, published } = req.query;
    const filter: any = {};
    
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;
    if (classId) filter.class = classId;
    if (published !== undefined) filter.published = published === 'true';

    const results = await Result.find(filter)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('class', 'name grade')
      .populate('subjects.subject', 'name code')
      .populate('enteredBy', 'firstName lastName')
      .sort({ position: 1, averageScore: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get student results
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;
    
    const filter: any = { student: studentId, published: true };
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;

    const results = await Result.find(filter)
      .populate('class', 'name grade')
      .populate('subjects.subject', 'name code')
      .sort({ academicYear: -1, term: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create/Update result
router.post('/', auth, authorize(['admin', 'exam_officer']), [
  body('student').notEmpty().withMessage('Student is required'),
  body('class').notEmpty().withMessage('Class is required'),
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required'),
  body('subjects').isArray().withMessage('Subjects must be an array'),
  body('subjects.*.subject').notEmpty().withMessage('Subject is required'),
  body('subjects.*.ca1').isNumeric().isFloat({ min: 0, max: 20 }).withMessage('1st CA must be between 0 and 20'),
  body('subjects.*.ca2').isNumeric().isFloat({ min: 0, max: 20 }).withMessage('2nd CA must be between 0 and 20'),
  body('subjects.*.exam').isNumeric().isFloat({ min: 0, max: 60 }).withMessage('Exam must be between 0 and 60')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { student, class: classId, academicYear, term } = req.body;

    // Check if result already exists
    let result = await Result.findOne({
      student,
      class: classId,
      academicYear,
      term
    });

    if (result) {
      // Update existing result
      result.subjects = req.body.subjects;
      result.remarks = req.body.remarks;
      result.nextTermBegins = req.body.nextTermBegins;
      result.enteredBy = req.user.id;
      result.enteredAt = new Date();
    } else {
      // Create new result
      result = new Result({
        ...req.body,
        enteredBy: req.user.id
      });
    }

    await result.save();

    // Calculate positions for the class
    await calculateClassPositions(classId, academicYear, term);

    await result.populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    });
    await result.populate('class', 'name grade');
    await result.populate('subjects.subject', 'name code');

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Publish results
router.put('/:id/publish', auth, authorize(['admin', 'exam_officer']), async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    result.published = true;
    result.publishedAt = new Date();
    await result.save();

    res.json({ message: 'Result published successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Publish all results for a class/term
router.put('/publish/batch', auth, authorize(['admin', 'exam_officer']), [
  body('class').notEmpty().withMessage('Class is required'),
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { class: classId, academicYear, term } = req.body;

    await Result.updateMany(
      { class: classId, academicYear, term },
      { published: true, publishedAt: new Date() }
    );

    res.json({ message: 'All results published successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get result transcript
router.get('/:id/transcript', auth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate({
        path: 'student',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName'
          },
          {
            path: 'class',
            select: 'name grade'
          }
        ]
      })
      .populate('class', 'name grade')
      .populate('subjects.subject', 'name code')
      .populate('enteredBy', 'firstName lastName');

    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Check if user can access this transcript
    if (req.user.role === 'student' && result.student.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!result.published && !['admin', 'director', 'exam_officer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Result not yet published' });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get class performance summary
router.get('/summary/class/:classId', auth, authorize(['admin', 'director', 'exam_officer', 'teacher']), async (req, res) => {
  try {
    const { classId } = req.params;
    const { academicYear, term } = req.query;

    const filter: any = { class: classId };
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;

    const summary = await Result.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          averageScore: { $avg: '$averageScore' },
          highestScore: { $max: '$averageScore' },
          lowestScore: { $min: '$averageScore' },
          passCount: {
            $sum: {
              $cond: [{ $gte: ['$averageScore', 40] }, 1, 0]
            }
          },
          failCount: {
            $sum: {
              $cond: [{ $lt: ['$averageScore', 40] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = summary[0] || {
      totalStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passCount: 0,
      failCount: 0
    };

    result.passRate = result.totalStudents > 0 ? (result.passCount / result.totalStudents) * 100 : 0;

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Helper function to calculate class positions
async function calculateClassPositions(classId: string, academicYear: string, term: string) {
  const results = await Result.find({
    class: classId,
    academicYear,
    term
  }).sort({ averageScore: -1 });

  for (let i = 0; i < results.length; i++) {
    results[i].position = i + 1;
    results[i].totalStudents = results.length;
    await results[i].save();
  }
}

export default router;