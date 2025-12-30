import express from 'express';
import sequelize from '../config/sqlite-database';

const router = express.Router();

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await sequelize.query(`
      SELECT 
        c.*,
        u.firstName || ' ' || u.lastName as classTeacherName,
        u.email as classTeacherEmail,
        COUNT(s.id) as studentCount
      FROM Classes c
      LEFT JOIN Users u ON c.classTeacher = u.id
      LEFT JOIN Students s ON c.id = s.classId AND s.isActive = 1
      GROUP BY c.id, u.firstName, u.lastName, u.email
      ORDER BY c.level, c.name
    `, {
      type: 'SELECT'
    });

    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const classData = await sequelize.query(`
      SELECT 
        c.*,
        u.firstName || ' ' || u.lastName as classTeacherName,
        u.email as classTeacherEmail
      FROM Classes c
      LEFT JOIN Users u ON c.classTeacher = u.id
      WHERE c.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (classData.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get students in this class
    const students = await sequelize.query(`
      SELECT 
        s.*,
        u.firstName,
        u.lastName,
        u.email
      FROM Students s
      JOIN Users u ON s.userId = u.id
      WHERE s.classId = ? AND s.isActive = 1
      ORDER BY u.firstName, u.lastName
    `, {
      replacements: [id],
      type: 'SELECT'
    });

    res.json({
      ...classData[0],
      students
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Create new class
router.post('/', async (req, res) => {
  try {
    const { name, level, capacity, classTeacher } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: 'Name and level are required' });
    }

    // Check if class name already exists
    const existingClass = await sequelize.query(`
      SELECT id FROM Classes WHERE name = ?
    `, {
      replacements: [name],
      type: 'SELECT'
    }) as any[];

    if (existingClass.length > 0) {
      return res.status(400).json({ error: 'Class name already exists' });
    }

    // Validate class teacher if provided
    if (classTeacher) {
      const teacher = await sequelize.query(`
        SELECT id FROM Users WHERE id = ? AND role IN ('teacher', 'admin')
      `, {
        replacements: [classTeacher],
        type: 'SELECT'
      }) as any[];

      if (teacher.length === 0) {
        return res.status(400).json({ error: 'Invalid class teacher' });
      }
    }

    const result = await sequelize.query(`
      INSERT INTO Classes (name, level, capacity, classTeacher)
      VALUES (?, ?, ?, ?)
    `, {
      replacements: [name, level, capacity || 30, classTeacher || null],
      type: 'INSERT'
    }) as any;

    const newClass = await sequelize.query(`
      SELECT 
        c.*,
        u.firstName || ' ' || u.lastName as classTeacherName
      FROM Classes c
      LEFT JOIN Users u ON c.classTeacher = u.id
      WHERE c.id = ?
    `, {
      replacements: [result[0]],
      type: 'SELECT'
    }) as any[];

    res.status(201).json(newClass[0]);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, level, capacity, classTeacher } = req.body;

    // Check if class exists
    const existingClass = await sequelize.query(`
      SELECT id FROM Classes WHERE id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (existingClass.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if new name conflicts with existing class (excluding current class)
    if (name) {
      const nameConflict = await sequelize.query(`
        SELECT id FROM Classes WHERE name = ? AND id != ?
      `, {
        replacements: [name, id],
        type: 'SELECT'
      }) as any[];

      if (nameConflict.length > 0) {
        return res.status(400).json({ error: 'Class name already exists' });
      }
    }

    // Validate class teacher if provided
    if (classTeacher) {
      const teacher = await sequelize.query(`
        SELECT id FROM Users WHERE id = ? AND role IN ('teacher', 'admin')
      `, {
        replacements: [classTeacher],
        type: 'SELECT'
      }) as any[];

      if (teacher.length === 0) {
        return res.status(400).json({ error: 'Invalid class teacher' });
      }
    }

    await sequelize.query(`
      UPDATE Classes 
      SET name = COALESCE(?, name),
          level = COALESCE(?, level),
          capacity = COALESCE(?, capacity),
          classTeacher = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [name, level, capacity, classTeacher, id],
      type: 'UPDATE'
    });

    const updatedClass = await sequelize.query(`
      SELECT 
        c.*,
        u.firstName || ' ' || u.lastName as classTeacherName
      FROM Classes c
      LEFT JOIN Users u ON c.classTeacher = u.id
      WHERE c.id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    res.json(updatedClass[0]);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class has students
    const students = await sequelize.query(`
      SELECT COUNT(*) as count FROM Students WHERE classId = ? AND isActive = 1
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (students[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class with active students. Please transfer students first.' 
      });
    }

    const result = await sequelize.query(`
      DELETE FROM Classes WHERE id = ?
    `, {
      replacements: [id],
      type: 'DELETE'
    }) as any;

    if (result[1] === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Get available teachers for class assignment
router.get('/teachers/available', async (req, res) => {
  try {
    const teachers = await sequelize.query(`
      SELECT 
        u.id,
        u.firstName || ' ' || u.lastName as name,
        u.email,
        u.office,
        CASE 
          WHEN c.classTeacher IS NOT NULL THEN c.name
          ELSE NULL
        END as currentClass
      FROM Users u
      LEFT JOIN Classes c ON u.id = c.classTeacher
      WHERE u.role IN ('teacher', 'admin') AND u.isActive = 1
      ORDER BY u.firstName, u.lastName
    `, {
      type: 'SELECT'
    });

    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

export default router;