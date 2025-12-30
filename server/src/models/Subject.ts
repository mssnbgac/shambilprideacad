import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sqlite-database';

interface SubjectAttributes {
  id: number;
  name: string;
  code: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubjectCreationAttributes extends Optional<SubjectAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Subject extends Model<SubjectAttributes, SubjectCreationAttributes> implements SubjectAttributes {
  public id!: number;
  public name!: string;
  public code!: string;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subject.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Subjects',
    timestamps: true,
  }
);

export default Subject;