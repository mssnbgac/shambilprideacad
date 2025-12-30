import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sqlite-database';

interface ClassAttributes {
  id: number;
  name: string;
  level: string;
  capacity: number;
  classTeacher?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClassCreationAttributes extends Optional<ClassAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Class extends Model<ClassAttributes, ClassCreationAttributes> implements ClassAttributes {
  public id!: number;
  public name!: string;
  public level!: string;
  public capacity!: number;
  public classTeacher?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Class.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    level: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
    },
    classTeacher: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'Classes',
    timestamps: true,
  }
);

export default Class;