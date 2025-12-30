import mongoose, { Document, Schema } from 'mongoose';

export interface IResult extends Document {
  student: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  academicYear: string;
  term: 'first' | 'second' | 'third';
  subjects: {
    subject: mongoose.Types.ObjectId;
    ca1: number;
    ca2: number;
    ca3?: number;
    exam: number;
    total: number;
    grade: string;
    position?: number;
  }[];
  totalScore: number;
  averageScore: number;
  overallGrade: string;
  position: number;
  totalStudents: number;
  remarks?: string;
  nextTermBegins?: Date;
  enteredBy: mongoose.Types.ObjectId;
  enteredAt: Date;
  published: boolean;
  publishedAt?: Date;
}

const resultSchema = new Schema<IResult>({
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
  academicYear: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['first', 'second', 'third'],
    required: true
  },
  subjects: [{
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    ca1: { type: Number, required: true, min: 0, max: 10 },
    ca2: { type: Number, required: true, min: 0, max: 10 },
    ca3: { type: Number, min: 0, max: 10 },
    exam: { type: Number, required: true, min: 0, max: 70 },
    total: { type: Number, min: 0, max: 100 },
    grade: String,
    position: Number
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  overallGrade: String,
  position: {
    type: Number,
    default: 0
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  remarks: String,
  nextTermBegins: Date,
  enteredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enteredAt: {
    type: Date,
    default: Date.now
  },
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: Date
}, {
  timestamps: true
});

// Calculate totals and grades before saving
resultSchema.pre('save', function(next) {
  let totalScore = 0;
  
  // Calculate subject totals and grades
  this.subjects.forEach(subject => {
    subject.total = subject.ca1 + subject.ca2 + (subject.ca3 || 0) + subject.exam;
    totalScore += subject.total;
    
    // Calculate grade based on total
    if (subject.total >= 90) subject.grade = 'A+';
    else if (subject.total >= 80) subject.grade = 'A';
    else if (subject.total >= 70) subject.grade = 'B+';
    else if (subject.total >= 60) subject.grade = 'B';
    else if (subject.total >= 50) subject.grade = 'C';
    else if (subject.total >= 40) subject.grade = 'D';
    else subject.grade = 'F';
  });
  
  this.totalScore = totalScore;
  this.averageScore = this.subjects.length > 0 ? totalScore / this.subjects.length : 0;
  
  // Calculate overall grade
  if (this.averageScore >= 90) this.overallGrade = 'A+';
  else if (this.averageScore >= 80) this.overallGrade = 'A';
  else if (this.averageScore >= 70) this.overallGrade = 'B+';
  else if (this.averageScore >= 60) this.overallGrade = 'B';
  else if (this.averageScore >= 50) this.overallGrade = 'C';
  else if (this.averageScore >= 40) this.overallGrade = 'D';
  else this.overallGrade = 'F';
  
  next();
});

export default mongoose.model<IResult>('Result', resultSchema);