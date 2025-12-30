import express from 'express';
import { body, validationResult } from 'express-validator';
import Expenditure from '../models/Expenditure';
import { FeePayment } from '../models/Fee';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// @route   POST /api/expenditure
// @desc    Record expenditure
// @access  Private (Accountant, Admin)
router.post('/', authorize('accountant', 'admin'), [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('category').isIn(['utilities', 'supplies', 'maintenance', 'salaries', 'transport', 'food', 'other']).withMessage('Valid category is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('academicSession').trim().notEmpty().withMessage('Academic session is required'),
  body('term').isIn(['first', 'second', 'third']).withMessage('Valid term is required'),
  body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque']).withMessage('Valid payment method is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expenditureData = {
      ...req.body,
      recordedBy: req.user!._id
    };

    const expenditure = new Expenditure(expenditureData);
    await expenditure.save();

    await expenditure.populate('recordedBy', 'firstName lastName role');

    res.status(201).json({
      message: 'Expenditure recorded successfully',
      expenditure
    });
  } catch (error) {
    console.error('Record expenditure error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenditure
// @desc    Get expenditures
// @access  Private (Accountant, Admin, Director)
router.get('/', authorize('accountant', 'admin', 'director'), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, academicSession, term, category, startDate, endDate } = req.query;

    const query: any = {};
    if (academicSession) query.academicSession = academicSession;
    if (term) query.term = term;
    if (category) query.category = category;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const expenditures = await Expenditure.find(query)
      .populate('recordedBy', 'firstName lastName role')
      .populate('approvedBy', 'firstName lastName role')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ date: -1 });

    const total = await Expenditure.countDocuments(query);

    res.json({
      expenditures,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get expenditures error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenditure/summary
// @desc    Get financial summary
// @access  Private (Accountant, Admin, Director)
router.get('/summary', authorize('accountant', 'admin', 'director'), async (req: AuthRequest, res) => {
  try {
    const { academicSession, term, date } = req.query;

    let dateQuery: any = {};
    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateQuery.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // Daily expenditure
    const dailyExpenditure = await Expenditure.aggregate([
      { $match: { ...dateQuery, ...(academicSession && { academicSession }), ...(term && { term }) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Daily income (confirmed payments)
    let incomeQuery: any = {};
    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      incomeQuery.paymentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const dailyIncome = await FeePayment.aggregate([
      { $match: { status: 'paid', ...incomeQuery, ...(academicSession && { academicSession }), ...(term && { term }) } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);

    // Total expenditure for session/term
    const totalExpenditure = await Expenditure.aggregate([
      { $match: { ...(academicSession && { academicSession }), ...(term && { term }) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Total income for session/term
    const totalIncome = await FeePayment.aggregate([
      { $match: { status: 'paid', ...(academicSession && { academicSession }), ...(term && { term }) } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);

    // Expenditure by category
    const expenditureByCategory = await Expenditure.aggregate([
      { $match: { ...(academicSession && { academicSession }), ...(term && { term }) } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);

    res.json({
      dailyExpenditure: dailyExpenditure[0]?.total || 0,
      dailyIncome: dailyIncome[0]?.total || 0,
      totalExpenditure: totalExpenditure[0]?.total || 0,
      totalIncome: totalIncome[0]?.total || 0,
      netBalance: (totalIncome[0]?.total || 0) - (totalExpenditure[0]?.total || 0),
      expenditureByCategory
    });
  } catch (error) {
    console.error('Get financial summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;