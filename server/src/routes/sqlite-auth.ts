import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import sequelize from '../config/sqlite-database';

const router = express.Router();

// Generate JWT token
const generateToken = (userId: number) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};

// Login route
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    console.log('🔍 Login attempt:', {
      email: req.body.email,
      password: req.body.password ? '[PROVIDED]' : '[MISSING]',
      body: req.body,
      headers: req.headers['content-type']
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email using raw SQL
    const result = await sequelize.query(
      'SELECT * FROM Users WHERE email = ? AND isActive = 1',
      {
        replacements: [email]
      }
    );
    
    const users = result[0] as any[];
    
    if (!users || users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];

    // For demo purposes, check plain text password
    // In production, you would use proper password hashing
    const demoPasswords: { [key: string]: string } = {
      'admin@shambil.edu.ng': 'admin123',
      'student@shambil.edu.ng': 'student123',
      'teacher@shambil.edu.ng': 'teacher123',
      'accountant@shambil.edu.ng': 'accountant123',
      'exam@shambil.edu.ng': 'exam123',
      'parent@shambil.edu.ng': 'parent123'
    };

    // Check password - first try demo passwords, then bcrypt hashed passwords, then plain text
    let passwordValid = false;
    
    if (demoPasswords[email] && demoPasswords[email] === password) {
      // Demo user with hardcoded password
      passwordValid = true;
      console.log('✅ Demo user login successful');
    } else if (user.password && user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // Bcrypt hashed password
      passwordValid = await bcrypt.compare(password, user.password);
      if (passwordValid) {
        console.log('✅ Bcrypt hashed password login successful');
      }
    } else if (user.password === password) {
      // Regular user with plain text database password (legacy)
      passwordValid = true;
      console.log('✅ Plain text database user login successful');
    }

    if (!passwordValid) {
      console.log('❌ Password mismatch:', {
        email,
        demoPasswordExists: !!demoPasswords[email],
        databasePassword: user.password ? '[EXISTS]' : '[MISSING]'
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await sequelize.query(
      'UPDATE Users SET lastLogin = datetime("now") WHERE id = ?',
      {
        replacements: [user.id],
        type: 'UPDATE'
      }
    );

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        office: user.office,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const result = await sequelize.query(
      'SELECT id, firstName, lastName, email, role, office, phone, avatar, lastLogin FROM Users WHERE id = ?',
      {
        replacements: [decoded.userId]
      }
    );
    
    const users = result[0] as any[];
    
    if (!users || users.length === 0) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    
    const user = users[0];

    // If user is a student, get additional student information
    let studentInfo = null;
    if (user.role === 'student') {
      const studentResult = await sequelize.query(
        `SELECT 
          s.admissionNumber, 
          s.house,
          c.name as className,
          c.level as classLevel
        FROM Students s
        LEFT JOIN Classes c ON s.classId = c.id
        WHERE s.userId = ? AND s.isActive = 1`,
        {
          replacements: [user.id]
        }
      );
      
      const students = studentResult[0] as any[];
      if (students && students.length > 0) {
        studentInfo = students[0];
      }
    }

    const responseData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      office: user.office,
      phone: user.phone,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      ...(studentInfo && {
        admissionNumber: studentInfo.admissionNumber,
        className: studentInfo.className,
        classLevel: studentInfo.classLevel,
        house: studentInfo.house
      })
    };

    res.json(responseData);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
});

export default router;