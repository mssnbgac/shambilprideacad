import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  user: mongoose.Types.ObjectId;
  studentId: string;
  admissionNumber: string;
  class: mongoose.Types.ObjectId;
  section?: string;
  rollNumber?: string;
  house?: 'red' | 'blue' | 'green' | 'yellow';
  dateOfBirth: Date;
  gender: 'male' | 'female';
  bloodGroup?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode?: string;
  };
  parent: {
    father: {
      name: string;
      phone: string;
      email?: string;
      occupation?: string;
    };
    mother: {
      name: string;
      phone?: string;
      email?: string;
      occupation?: string;
    };
    guardian?: {
      name: string;
      phone: string;
      email?: string;
      relationship: string;
    };
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
  };
  admissionDate: Date;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  documents?: {
    birthCertificate?: string;
    previousSchoolRecords?: string;
    medicalRecords?: string;
    photos?: string[];
  };
}

const studentSchema = new Schema<IStudent>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  admissionNumber: {
    type: String,
    required: true,
    unique: true
  },
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  section: String,
  rollNumber: String,
  house: {
    type: String,
    enum: ['red', 'blue', 'green', 'yellow']
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'Nigeria' },
    zipCode: String
  },
  parent: {
    father: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      occupation: String
    },
    mother: {
      name: { type: String, required: true },
      phone: String,
      email: String,
      occupation: String
    },
    guardian: {
      name: String,
      phone: String,
      email: String,
      relationship: String
    }
  },
  emergencyContact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String, required: true }
  },
  medicalInfo: {
    allergies: [String],
    medications: [String],
    conditions: [String]
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'transferred'],
    default: 'active'
  },
  documents: {
    birthCertificate: String,
    previousSchoolRecords: String,
    medicalRecords: String,
    photos: [String]
  }
}, {
  timestamps: true
});

export default mongoose.model<IStudent>('Student', studentSchema);