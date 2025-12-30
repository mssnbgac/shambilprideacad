import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  title: string;
  type: 'academic' | 'financial' | 'disciplinary' | 'administrative' | 'other';
  content: string;
  attachments?: string[];
  submittedBy: mongoose.Types.ObjectId;
  submittedTo: mongoose.Types.ObjectId;
  academicSession: string;
  term: 'first' | 'second' | 'third';
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewComments?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isArchived: boolean;
}

const reportSchema = new Schema<IReport>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['academic', 'financial', 'disciplinary', 'administrative', 'other'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [String],
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
  academicSession: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['first', 'second', 'third'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewComments: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model<IReport>('Report', reportSchema);