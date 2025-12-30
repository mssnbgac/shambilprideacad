import mongoose, { Document, Schema } from 'mongoose';

export interface IFeeStructure extends Document {
  class: mongoose.Types.ObjectId;
  academicYear: string;
  fees: {
    tuition: number;
    library: number;
    laboratory: number;
    sports: number;
    transport?: number;
    hostel?: number;
    examination: number;
    development: number;
    other?: {
      name: string;
      amount: number;
    }[];
  };
  totalAmount: number;
  dueDate: Date;
  isActive: boolean;
}

export interface IFeePayment extends Document {
  student: mongoose.Types.ObjectId;
  feeStructure: mongoose.Types.ObjectId;
  academicYear: string;
  term: 'first' | 'second' | 'third';
  amountPaid: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'online';
  transactionId?: string;
  paymentDate: Date;
  receiptNumber: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    reason: string;
  };
  lateFee?: number;
  remarks?: string;
  collectedBy: mongoose.Types.ObjectId;
}

const feeStructureSchema = new Schema<IFeeStructure>({
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  fees: {
    tuition: { type: Number, required: true, min: 0 },
    library: { type: Number, required: true, min: 0 },
    laboratory: { type: Number, required: true, min: 0 },
    sports: { type: Number, required: true, min: 0 },
    transport: { type: Number, min: 0 },
    hostel: { type: Number, min: 0 },
    examination: { type: Number, required: true, min: 0 },
    development: { type: Number, required: true, min: 0 },
    other: [{
      name: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 }
    }]
  },
  totalAmount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const feePaymentSchema = new Schema<IFeePayment>({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  feeStructure: {
    type: Schema.Types.ObjectId,
    ref: 'FeeStructure',
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
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'cheque', 'online'],
    required: true
  },
  transactionId: String,
  paymentDate: {
    type: Date,
    required: true
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['paid', 'partial', 'pending', 'overdue'],
    default: 'pending'
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    value: { type: Number, min: 0 },
    reason: String
  },
  lateFee: {
    type: Number,
    min: 0,
    default: 0
  },
  remarks: String,
  collectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate total amount before saving fee structure
feeStructureSchema.pre('save', function(next) {
  const fees = this.fees;
  this.totalAmount = fees.tuition + fees.library + fees.laboratory + 
                    fees.sports + fees.examination + fees.development +
                    (fees.transport || 0) + (fees.hostel || 0);
  
  if (fees.other && fees.other.length > 0) {
    this.totalAmount += fees.other.reduce((sum, item) => sum + item.amount, 0);
  }
  
  next();
});

export const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema);
export const FeePayment = mongoose.model<IFeePayment>('FeePayment', feePaymentSchema);

export default FeeStructure;