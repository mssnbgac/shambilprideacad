import express from 'express';
import { body, validationResult } from 'express-validator';
import Grade from '../models/Grade';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// @route   POST /api/grades
// @desc    Add grade
// @access  Private (Teacher, Admin)
router.post('/', authorize('teacher', 'admin'), [
  body('student').notEmpty().withMessage('Student is required'),
  body('class').notEmpty().withMessage('Class is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('examType').isIn(['quiz', 'assignment', 'midterm', 'final', 'project', 'practical']).withMessage('Valid exam type is required'),
  body('examName').trim().notEmpty().withMessage('Exam name is required'),
  body('maxMarks').isNumeric().withMessage('Max marks must be a number'),
  body('obtainedMarks').isNumeric().withMessage('Obtained marks must be a number'),
  body('examDate').isISO8601().withMessage('Valid exam date is required'),
  body('academicYear').trim().notEmpty().withMessage('Academic year is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const gradeData = {
      ...req.body,
      teacher: req.user!._id,
      enteredBy: req.user!._id
    };

    const grade = new Grade(gradeData);
    await grade.save();

    await grade.populate('student', 'studentId user');
    await grade.populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    });
    await grade.populate('subject', 'name code');

    res.status(201).json({
      message: 'Grade added successfully',
      grade
    });
  } catch (error) {
    console.error('Add grade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/grades
// @desc    Get grades
// @access  Private
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { student, class: classId, subject, academicYear, term, examType } = req.query;
    
    const query: any = {};
    if (student) query.student = student;
    if (classId) query.class = classId;
    if (subject) query.subject = subject;
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (examType) query.examType = examType;

    const grades = await Grade.find(query)
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
      .sort({ examDate: -1 });

    res.json(grades);
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
// @route   POST /api/grades/bulk
// @desc    Bulk upload grades by exam officer
// @access  Private (Exam Officer, Admin)
router.post('/bulk', authorize('exam_officer', 'admin'), [
  body('grades').isArray().withMessage('Grades array is required'),
  body('academicSession').trim().notEmpty().withMessage('Academic session is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { grades, academicSession, term } = req.body;
    const uploadedGrades = [];

    for (const gradeData of grades) {
      const grade = new Grade({
        ...gradeData,
        academicSession,
        term,
        teacher: req.user!._id,
        enteredBy: req.user!._id
      });
      await grade.save();
      uploadedGrades.push(grade);
    }

    res.status(201).json({
      message: `${uploadedGrades.length} grades uploaded successfully`,
      count: uploadedGrades.length
    });
  } catch (error) {
    console.error('Bulk upload grades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/grades/transcript/:studentId
// @desc    Generate student transcript
// @access  Private
router.get('/transcript/:studentId', async (req: AuthRequest, res) => {
  try {
    const { academicSession, term } = req.query;
    const { studentId } = req.params;

    // Find student by admission number or student ID
    const student = await Student.findOne({
      $or: [
        { admissionNumber: studentId },
        { studentId: studentId }
      ]
    })
    .populate('user', 'firstName lastName')
    .populate('class', 'name grade section');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check access permissions
    const user = req.user!;
    const canAccess = user.role === 'admin' || 
                     user.role === 'exam_officer' || 
                     user.role === 'director' ||
                     user.role === 'principal' ||
                     (user.role === 'student' && student.user._id.toString() === user._id.toString()) ||
                     (user.role === 'parent' && student.user._id.toString() === user._id.toString());

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let gradeQuery: any = { student: student._id };
    if (academicSession) gradeQuery.academicSession = academicSession;
    if (term) gradeQuery.term = term;

    const grades = await Grade.find(gradeQuery)
      .populate('subject', 'name code')
      .populate('class', 'name grade section')
      .sort({ examDate: -1 });

    // Calculate overall performance
    const totalMarks = grades.reduce((sum, grade) => sum + grade.obtainedMarks, 0);
    const totalMaxMarks = grades.reduce((sum, grade) => sum + grade.maxMarks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    let overallGrade = 'F';
    if (overallPercentage >= 90) overallGrade = 'A+';
    else if (overallPercentage >= 80) overallGrade = 'A';
    else if (overallPercentage >= 70) overallGrade = 'B+';
    else if (overallPercentage >= 60) overallGrade = 'B';
    else if (overallPercentage >= 50) overallGrade = 'C';
    else if (overallPercentage >= 40) overallGrade = 'D';

    const transcriptData = {
      school: {
        name: 'Shambil Pride Academy Birnin Gwari',
        address: 'Birnin Gwari, Kaduna State, Nigeria',
        phone: process.env.SCHOOL_PHONE || '+234-xxx-xxx-xxxx',
        email: process.env.SCHOOL_EMAIL || 'info@shambilprideacademy.edu.ng'
      },
      student: {
        name: `${student.user.firstName} ${student.user.lastName}`,
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        class: `${student.class.name} ${student.class.section}`,
        house: student.house
      },
      academic: {
        session: academicSession,
        term: term,
        grades: grades.map(grade => ({
          subject: grade.subject.name,
          examType: grade.examType,
          examName: grade.examName,
          maxMarks: grade.maxMarks,
          obtainedMarks: grade.obtainedMarks,
          percentage: grade.percentage,
          grade: grade.grade,
          examDate: grade.examDate
        })),
        summary: {
          totalSubjects: grades.length,
          totalMarks,
          totalMaxMarks,
          overallPercentage: Math.round(overallPercentage * 100) / 100,
          overallGrade
        }
      },
      generatedAt: new Date()
    };

    res.json(transcriptData);
  } catch (error) {
    console.error('Generate transcript error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/grades/student-results
// @desc    Get student results for specific session and term
// @access  Private (Student, Parent)
router.get('/student-results', async (req: AuthRequest, res) => {
  try {
    const { academicSession, term } = req.query;
    const user = req.user!;

    let student;
    if (user.role === 'student') {
      student = await Student.findOne({ user: user._id });
    } else if (user.role === 'parent') {
      // Assuming parent can access their child's results
      student = await Student.findOne({ 'parent.father.email': user.email });
      if (!student) {
        student = await Student.findOne({ 'parent.mother.email': user.email });
      }
    }

    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const query: any = { student: student._id };
    if (academicSession) query.academicSession = academicSession;
    if (term) query.term = term;

    const grades = await Grade.find(query)
      .populate('subject', 'name code')
      .populate('class', 'name grade section')
      .sort({ examDate: -1 });

    res.json(grades);
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});