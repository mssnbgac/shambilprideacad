import express from 'express';
import { body, validationResult } from 'express-validator';
import { FeeStructure, FeePayment } from '../models/Fee';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// @route   POST /api/fees/structure
// @desc    Create fee structure
// @access  Private (Admin)
router.post('/structure', authorize('admin'), [
  body('class').notEmpty().withMessage('Class is required'),
  body('academicYear').trim().notEmpty().withMessage('Academic year is required'),
  body('fees.tuition').isNumeric().withMessage('Tuition fee must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const feeStructure = new FeeStructure(req.body);
    await feeStructure.save();

    res.status(201).json({
      message: 'Fee structure created successfully',
      feeStructure
    });
  } catch (error) {
    console.error('Create fee structure error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/fees/payment
// @desc    Record fee payment
// @access  Private (Admin)
router.post('/payment', authorize('admin'), [
  body('student').notEmpty().withMessage('Student is required'),
  body('feeStructure').notEmpty().withMessage('Fee structure is required'),
  body('amountPaid').isNumeric().withMessage('Amount paid must be a number'),
  body('paymentMethod').isIn(['cash', 'bank_transfer', 'card', 'cheque', 'online']).withMessage('Valid payment method is required'),
  body('receiptNumber').trim().notEmpty().withMessage('Receipt number is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const paymentData = {
      ...req.body,
      collectedBy: req.user!._id,
      paymentDate: req.body.paymentDate || new Date()
    };

    const payment = new FeePayment(paymentData);
    await payment.save();

    await payment.populate('student', 'studentId user');
    await payment.populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/fees/payments
// @desc    Get fee payments
// @access  Private
router.get('/payments', async (req: AuthRequest, res) => {
  try {
    const { student, academicYear, status } = req.query;
    
    const query: any = {};
    if (student) query.student = student;
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;

    const payments = await FeePayment.find(query)
      .populate('student', 'studentId user')
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('feeStructure')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

// @route   PUT /api/fees/payments/:id/confirm
// @desc    Confirm fee payment
// @access  Private (Accountant, Admin)
router.put('/payments/:id/confirm', authorize('accountant', 'admin'), async (req: AuthRequest, res) => {
  try {
    const payment = await FeePayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.status = 'paid';
    await payment.save();

    await payment.populate('student', 'studentId user');
    await payment.populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    });

    res.json({
      message: 'Payment confirmed successfully',
      payment
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/fees/receipt/:id
// @desc    Generate payment receipt
// @access  Private
router.get('/receipt/:id', async (req: AuthRequest, res) => {
  try {
    const payment = await FeePayment.findById(req.params.id)
      .populate('student', 'studentId admissionNumber user class house')
      .populate({
        path: 'student',
        populate: [
          {
            path: 'user',
            select: 'firstName lastName'
          },
          {
            path: 'class',
            select: 'name grade section'
          }
        ]
      })
      .populate('feeStructure')
      .populate('collectedBy', 'firstName lastName');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user can access this receipt
    const user = req.user!;
    const canAccess = user.role === 'admin' || 
                     user.role === 'accountant' || 
                     user.role === 'director' ||
                     (user.role === 'student' && payment.student.user._id.toString() === user._id.toString()) ||
                     (user.role === 'parent' && payment.student.user._id.toString() === user._id.toString());

    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const receiptData = {
      school: {
        name: 'Shambil Pride Academy Birnin Gwari',
        address: 'Birnin Gwari, Kaduna State, Nigeria',
        phone: process.env.SCHOOL_PHONE || '+234-xxx-xxx-xxxx',
        email: process.env.SCHOOL_EMAIL || 'info@shambilprideacademy.edu.ng'
      },
      student: {
        name: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
        studentId: payment.student.studentId,
        admissionNumber: payment.student.admissionNumber,
        class: `${payment.student.class.name} ${payment.student.class.section}`,
        house: payment.student.house
      },
      payment: {
        receiptNumber: payment.receiptNumber,
        amount: payment.amountPaid,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        academicSession: payment.academicSession,
        term: payment.term,
        transactionId: payment.transactionId
      },
      collectedBy: `${payment.collectedBy.firstName} ${payment.collectedBy.lastName}`,
      generatedAt: new Date()
    };

    res.json(receiptData);
  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/fees/summary
// @desc    Get fee summary for accountant
// @access  Private (Accountant, Admin, Director)
router.get('/summary', authorize('accountant', 'admin', 'director'), async (req: AuthRequest, res) => {
  try {
    const { academicSession, term, date } = req.query;

    let query: any = { status: 'paid' };
    if (academicSession) query.academicSession = academicSession;
    if (term) query.term = term;

    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.paymentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const totalConfirmed = await FeePayment.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
    ]);

    const pendingPayments = await FeePayment.countDocuments({
      status: 'pending',
      ...(academicSession && { academicSession }),
      ...(term && { term })
    });

    res.json({
      totalConfirmed: totalConfirmed[0]?.total || 0,
      paymentsCount: totalConfirmed[0]?.count || 0,
      pendingPayments
    });
  } catch (error) {
    console.error('Get fee summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});