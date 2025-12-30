import express from 'express';
import Payment from '../models/Payment';
import Student from '../models/Student';
import { auth, authorize } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get all payments (Admin, Accountant)
router.get('/', auth, authorize(['admin', 'director', 'accountant']), async (req, res) => {
  try {
    const { academicYear, term, status, student } = req.query;
    const filter: any = {};
    
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;
    if (status) filter.status = status;
    if (student) filter.student = student;

    const payments = await Payment.find(filter)
      .populate('student', 'admissionNumber user')
      .populate('student.user', 'firstName lastName')
      .populate('confirmedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get student payments
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;
    
    const filter: any = { student: studentId };
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;

    const payments = await Payment.find(filter)
      .populate('confirmedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create payment record
router.post('/', auth, authorize(['admin', 'accountant']), [
  body('student').notEmpty().withMessage('Student is required'),
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required'),
  body('paymentType').isIn(['tuition', 'transport', 'meal', 'uniform', 'books', 'exam', 'other']).withMessage('Valid payment type is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Generate receipt number
    const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const payment = new Payment({
      ...req.body,
      receiptNumber,
      confirmedBy: req.user.id
    });

    await payment.save();
    await payment.populate('student', 'admissionNumber user');
    await payment.populate('student.user', 'firstName lastName');

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Confirm payment
router.put('/:id/confirm', auth, authorize(['admin', 'accountant']), [
  body('amountPaid').isNumeric().withMessage('Amount paid must be a number'),
  body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'online']).withMessage('Valid payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amountPaid, paymentMethod } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.amountPaid += amountPaid;
    payment.paymentMethod = paymentMethod;
    payment.confirmedBy = req.user.id;
    payment.confirmedAt = new Date();

    await payment.save();
    await payment.populate('student', 'admissionNumber user');
    await payment.populate('student.user', 'firstName lastName');

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get payment receipt
router.get('/:id/receipt', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('confirmedBy', 'firstName lastName');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user can access this receipt
    if (req.user.role === 'student' && payment.student.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get financial summary for accountant dashboard
router.get('/summary/financial', auth, authorize(['admin', 'director', 'accountant']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    const filter: any = {};
    
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;

    const summary = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$amountPaid' },
          totalBalance: { $sum: '$balance' },
          confirmedPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, 1, 0]
            }
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $ne: ['$status', 'paid'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json(summary[0] || {
      totalAmount: 0,
      totalPaid: 0,
      totalBalance: 0,
      confirmedPayments: 0,
      pendingPayments: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;