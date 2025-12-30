import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  sender: mongoose.Types.ObjectId;
  recipient: 'admin' | 'exam_officer';
  title: string;
  message: string;
  category: 'academic' | 'disciplinary' | 'financial' | 'facility' | 'transport' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'read' | 'responded' | 'resolved';
  response?: string;
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  attachments?: string[];
}

const commentSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: String,
    enum: ['admin', 'exam_officer'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'disciplinary', 'financial', 'facility', 'transport', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'read', 'responded', 'resolved'],
    default: 'pending'
  },
  response: {
    type: String
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  respondedAt: {
    type: Date
  },
  attachments: [{
    type: String
  }]
}, {
  timestamps: true
});

export default mongoose.model<IComment>('Comment', commentSchema);