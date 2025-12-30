import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacher extends Document {
  user: mongoose.Types.ObjectId;
  employeeId: string;
  department: string;
  subjects: mongoose.Types.ObjectId[];
  classes: mongoose.Types.ObjectId[];
  qualification: {
    degree: string;
    institution: string;
    year: number;
  }[];
  experience: number;
  dateOfJoining: Date;
  salary: {
    basic: number;
    allowances?: number;
    deductions?: number;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode?: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  documents: {
    resume?: string;
    certificates?: string[];
    idProof?: string;
    photos?: string[];
  };
  schedule: {
    monday?: string[];
    tuesday?: string[];
    wednesday?: string[];
    thursday?: string[];
    friday?: string[];
    saturday?: string[];
  };
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
}

const teacherSchema = new Schema<ITeacher>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true
  },
  subjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  classes: [{
    type: Schema.Types.ObjectId,
    ref: 'Class'
  }],
  qualification: [{
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: Number, required: true }
  }],
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  dateOfJoining: {
    type: Date,
    required: true
  },
  salary: {
    basic: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 }
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'Nigeria' },
    zipCode: String
  },
  emergencyContact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String, required: true }
  },
  documents: {
    resume: String,
    certificates: [String],
    idProof: String,
    photos: [String]
  },
  schedule: {
    monday: [String],
    tuesday: [String],
    wednesday: [String],
    thursday: [String],
    friday: [String],
    saturday: [String]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave', 'terminated'],
    default: 'active'
  }
}, {
  timestamps: true
});

export default mongoose.model<ITeacher>('Teacher', teacherSchema);