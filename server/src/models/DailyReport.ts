import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyReport extends Document {
  reportType: 'financial' | 'academic' | 'disciplinary' | 'administrative' | 'other';
  title: string;
  content: string;
  reportDate: Date;
  academicYear: string;
  term: 'first' | 'second' | 'third';
  submittedBy: mongoose.Types.ObjectId;
  submittedTo: mongoose.Types.ObjectId;
  office: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  attachments?: string[];
  financialData?: {
    totalIncome: number;
    totalExpenditure: number;
    netBalance: number;
    paymentConfirmations: number;
    pendingPayments: number;
  };
  academicData?: {
    totalStudents: number;
    presentStudents: number;
    absentStudents: number;
    newAdmissions: number;
    examsConducted: number;
  };
  disciplinaryData?: {
    incidentsReported: number;
    studentsInvolved: number;
    actionsTaken: string[];
  };
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewComments?: string;
}

const dailyReportSchema = new Schema<IDailyReport>({
  reportType: {
    type: String,
    enum: ['financial', 'academic', 'disciplinary', 'administrative', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  reportDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  academicYear: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['first', 'second', 'third'],
    required: true
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  office: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved', 'rejected'],
    default: 'draft'
  },
  attachments: [String],
  financialData: {
    totalIncome: Number,
    totalExpenditure: Number,
    netBalance: Number,
    paymentConfirmations: Number,
    pendingPayments: Number
  },
  academicData: {
    totalStudents: Number,
    presentStudents: Number,
    absentStudents: Number,
    newAdmissions: Number,
    examsConducted: Number
  },
  disciplinaryData: {
    incidentsReported: Number,
    studentsInvolved: Number,
    actionsTaken: [String]
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewComments: String
}, {
  timestamps: true
});

export default mongoose.model<IDailyReport>('DailyReport', dailyReportSchema);