const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const newUser = await User.create({
            email,
            password,
            role,
            companyName: role === 'employer' ? companyName : null
        });

        // Create and sign JWT
        const payload = { user: { id: newUser.id, role: newUser.role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        });

        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
                companyName: newUser.companyName // companyName might be null if not employer
            }
        });

    } catch (error) {
        console.error('Register error:', error.message);
        if (error.message.includes('Email already exists')) { // From User.create model validation
             return res.status(400).json({ message: error.message });
        }
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
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Create and sign JWT
        // The payload structure here { id: user.id, role: user.role } is what authenticateToken middleware will place in req.user
        const payload = { id: user.id, role: user.role }; 
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                companyName: user.company_name // User model findByEmail returns company_name
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server error during login.' });
    }
};