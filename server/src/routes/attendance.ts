import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// @route   POST /api/attendance
// @desc    Mark attendance
// @access  Private (Teacher, Admin)
router.post('/', authorize('teacher', 'admin'), [
  body('students').isArray().withMessage('Students array is required'),
  body('class').notEmpty().withMessage('Class is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('date').isISO8601().withMessage('Valid date is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { students, class: classId, subject, date, period } = req.body;
    const teacher = req.user!._id;

    const attendanceRecords = [];

    for (const studentData of students) {
      const existingRecord = await Attendance.findOne({
        student: studentData.student,
        class: classId,
        subject,
        date: new Date(date),
        period
      });

      if (existingRecord) {
        existingRecord.status = studentData.status;
        existingRecord.remarks = studentData.remarks;
        existingRecord.markedBy = teacher;
        existingRecord.markedAt = new Date();
        await existingRecord.save();
        attendanceRecords.push(existingRecord);
      } else {
        const attendance = new Attendance({
          student: studentData.student,
          class: classId,
          subject,
          teacher,
          date: new Date(date),
          status: studentData.status,
          period,
          remarks: studentData.remarks,
          markedBy: teacher
        });
        await attendance.save();
        attendanceRecords.push(attendance);
      }
    }

    res.json({
      message: 'Attendance marked successfully',
      records: attendanceRecords.length
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { class: classId, subject, student, date, startDate, endDate } = req.query;
    
    const query: any = {};
    if (classId) query.class = classId;
    if (subject) query.subject = subject;
    if (student) query.student = student;
    if (date) query.date = new Date(date as string);
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'studentId user')
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('class', 'name grade section')
      .populate('subject', 'name code')
      .sort({ date: -1, period: 1 });

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;