import mongoose, { Document, Schema } from 'mongoose';

export interface IGrade extends Document {
  student: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  examType: 'quiz' | 'assignment' | 'midterm' | 'final' | 'project' | 'practical';
  examName: string;
  maxMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  remarks?: string;
  examDate: Date;
  academicYear: string;
  term: 'first' | 'second' | 'third';
  enteredBy: mongoose.Types.ObjectId;
  enteredAt: Date;
}

const gradeSchema = new Schema<IGrade>({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  examType: {
    type: String,
    enum: ['quiz', 'assignment', 'midterm', 'final', 'project', 'practical'],
    required: true
  },
  examName: {
    type: String,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 1
  },
  obtainedMarks: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    required: true
  },
  remarks: String,
  examDate: {
    type: Date,
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
  enteredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enteredAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate percentage before saving
gradeSchema.pre('save', function(next) {
  this.percentage = (this.obtainedMarks / this.maxMarks) * 100;
  
  // Calculate grade based on percentage
  if (this.percentage >= 90) this.grade = 'A+';
  else if (this.percentage >= 80) this.grade = 'A';
  else if (this.percentage >= 70) this.grade = 'B+';
  else if (this.percentage >= 60) this.grade = 'B';
  else if (this.percentage >= 50) this.grade = 'C';
  else if (this.percentage >= 40) this.grade = 'D';
  else this.grade = 'F';
  
  next();
});

export default mongoose.model<IGrade>('Grade', gradeSchema);