const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db'); // Using direct DB access for now

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const { email, password, role, companyName } = req.body;

    // Basic validation
    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Please provide email, password, and role.' });
    }
    if (role === 'employer' && !companyName) {
        return res.status(400).json({ message: 'Employer role requires a company name.' });
    }
    if (!['candidate', 'employer'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified.' });
    }

    try {
        // Check if user already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user into database (using direct DB for now, replace with Model later)
        const sql = 'INSERT INTO users (email, password, role, company_name) VALUES (?, ?, ?, ?)';
        const params = [email, hashedPassword, role, role === 'employer' ? companyName : null];
        
        const result = await new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                resolve({ id: this.lastID });
            });
        });

        // Create and sign JWT
        const payload = { user: { id: result.id, role: role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });

        res.status(201).json({
            token,
            user: {
                id: result.id,
                email: email,
                role: role,
                companyName: role === 'employer' ? companyName : undefined
            }
        });

    } catch (error) {
        console.error('Register error:', error.message);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    try {
        // Check for user
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Create and sign JWT
        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                companyName: user.company_name
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server error during login.' });
    }
};