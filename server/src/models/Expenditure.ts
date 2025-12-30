import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenditure extends Document {
  description: string;
  amount: number;
  category: 'utilities' | 'supplies' | 'maintenance' | 'salaries' | 'transport' | 'food' | 'other';
  date: Date;
  receipt?: string;
  approvedBy?: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  academicSession: string;
  term: 'first' | 'second' | 'third';
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
  vendor?: string;
  notes?: string;
}

const expenditureSchema = new Schema<IExpenditure>({
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['utilities', 'supplies', 'maintenance', 'salaries', 'transport', 'food', 'other'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  receipt: String,
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  recordedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  academicSession: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['first', 'second', 'third'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque'],
    required: true
  },
  vendor: String,
  notes: String
}, {
  timestamps: true
});

export default mongoose.model<IExpenditure>('Expenditure', expenditureSchema);