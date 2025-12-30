import express from 'express';
import sequelize from '../config/sqlite-database';

const router = express.Router();

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await sequelize.query(`
      SELECT id, name, code, description FROM Subjects ORDER BY name
    `, {
      type: 'SELECT'
    });

    res.json(subjects.map((subject: any) => ({
      _id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description
    })));
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Get subject by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const subject = await sequelize.query(`
      SELECT * FROM Subjects WHERE id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (subject.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject[0]);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
});

// Create new subject
router.post('/', async (req, res) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check if subject code already exists
    const existingSubject = await sequelize.query(`
      SELECT id FROM Subjects WHERE code = ?
    `, {
      replacements: [code.toUpperCase()],
      type: 'SELECT'
    }) as any[];

    if (existingSubject.length > 0) {
      return res.status(400).json({ error: 'Subject code already exists' });
    }

    const result = await sequelize.query(`
      INSERT INTO Subjects (name, code, description)
      VALUES (?, ?, ?)
    `, {
      replacements: [name, code.toUpperCase(), description || null],
      type: 'INSERT'
    }) as any;

    const newSubject = await sequelize.query(`
      SELECT * FROM Subjects WHERE id = ?
    `, {
      replacements: [result[0]],
      type: 'SELECT'
    }) as any[];

    res.status(201).json(newSubject[0]);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// Update subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    // Check if subject exists
    const existingSubject = await sequelize.query(`
      SELECT id FROM Subjects WHERE id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (existingSubject.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if new code conflicts with existing subject (excluding current subject)
    if (code) {
      const codeConflict = await sequelize.query(`
        SELECT id FROM Subjects WHERE code = ? AND id != ?
      `, {
        replacements: [code.toUpperCase(), id],
        type: 'SELECT'
      }) as any[];

      if (codeConflict.length > 0) {
        return res.status(400).json({ error: 'Subject code already exists' });
      }
    }

    await sequelize.query(`
      UPDATE Subjects 
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [name, code?.toUpperCase(), description, id],
      type: 'UPDATE'
    });

    const updatedSubject = await sequelize.query(`
      SELECT * FROM Subjects WHERE id = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    res.json(updatedSubject[0]);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject is used in results
    const subjectResults = await sequelize.query(`
      SELECT COUNT(*) as count FROM SubjectResults WHERE subjectId = ?
    `, {
      replacements: [id],
      type: 'SELECT'
    }) as any[];

    if (subjectResults[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete subject with existing results. Please remove results first.' 
      });
    }

    const result = await sequelize.query(`
      DELETE FROM Subjects WHERE id = ?
    `, {
      replacements: [id],
      type: 'DELETE'
    }) as any;

    if (result[1] === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

export default router;