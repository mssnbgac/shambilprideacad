import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  student: mongoose.Types.ObjectId;
  academicYear: string;
  term: 'first' | 'second' | 'third';
  paymentType: 'tuition' | 'uniform' | 'books' | 'exam' | 'other';
  amount: number;
  amountPaid: number;
  balance: number;
  paymentDate: Date;
  dueDate: Date;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'online';
  receiptNumber: string;
  confirmedBy: mongoose.Types.ObjectId;
  confirmedAt?: Date;
  description?: string;
  installments?: {
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    status: 'pending' | 'paid' | 'overdue';
  }[];
}

const paymentSchema = new Schema<IPayment>({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
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
  paymentType: {
    type: String,
    enum: ['tuition', 'transport', 'meal', 'uniform', 'books', 'exam', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'online']
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: true
  },
  confirmedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedAt: Date,
  description: String,
  installments: [{
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidDate: Date,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true
});

// Calculate balance before saving
paymentSchema.pre('save', function(next) {
  this.balance = this.amount - this.amountPaid;
  
  if (this.balance <= 0) {
    this.status = 'paid';
  } else if (this.amountPaid > 0) {
    this.status = 'partial';
  } else if (new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  
  next();
});

export default mongoose.model<IPayment>('Payment', paymentSchema);