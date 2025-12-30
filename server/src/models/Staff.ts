import mongoose, { Document, Schema } from 'mongoose';

export interface IStaff extends Document {
  user: mongoose.Types.ObjectId;
  staffId: string;
  department: string;
  position: string;
  dateOfJoining: Date;
  salary?: number;
  qualifications: string[];
  subjects?: string[];
  classes?: mongoose.Types.ObjectId[];
  status: 'active' | 'inactive' | 'suspended';
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

const staffSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staffId: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true,
    enum: ['academic', 'administration', 'finance', 'maintenance', 'security', 'transport']
  },
  position: {
    type: String,
    required: true
  },
  dateOfJoining: {
    type: Date,
    required: true
  },
  salary: {
    type: Number
  },
  qualifications: [{
    type: String
  }],
  subjects: [{
    type: String
  }],
  classes: [{
    type: Schema.Types.ObjectId,
    ref: 'Class'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  emergencyContact: {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true }
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true }
  }
}, {
  timestamps: true
});

export default mongoose.model<IStaff>('Staff', staffSchema);