import mongoose, { Document, Schema } from 'mongoose';

export interface IComplaint extends Document {
  title: string;
  description: string;
  category: 'academic' | 'financial' | 'disciplinary' | 'facility' | 'teacher' | 'other';
  submittedBy: mongoose.Types.ObjectId;
  submittedTo: mongoose.Types.ObjectId[];
  student?: mongoose.Types.ObjectId;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  responses: {
    respondedBy: mongoose.Types.ObjectId;
    response: string;
    respondedAt: Date;
  }[];
  attachments?: string[];
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolution?: string;
}

const complaintSchema = new Schema<IComplaint>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'financial', 'disciplinary', 'facility', 'teacher', 'other'],
    required: true
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  responses: [{
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    response: {
      type: String,
      required: true
    },
    respondedAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [String],
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: String
}, {
  timestamps: true
});

export default mongoose.model<IComplaint>('Complaint', complaintSchema);