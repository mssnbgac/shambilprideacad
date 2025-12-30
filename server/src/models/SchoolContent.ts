import mongoose, { Document, Schema } from 'mongoose';

export interface ISchoolContent extends Document {
  section: 'about' | 'history' | 'aims_objectives' | 'gallery' | 'news' | 'events' | 'achievements';
  title: string;
  content: string;
  images?: string[];
  isPublished: boolean;
  publishedAt?: Date;
  updatedBy: mongoose.Types.ObjectId;
  order: number;
}

const schoolContentSchema = new Schema<ISchoolContent>({
  section: {
    type: String,
    enum: ['about', 'history', 'aims_objectives', 'gallery', 'news', 'events', 'achievements'],
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
  images: [String],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model<ISchoolContent>('SchoolContent', schoolContentSchema);