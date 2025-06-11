const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Unauthorized if no token
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please log in again.' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ message: 'Invalid token.' });
            }
            return res.sendStatus(403); // Forbidden if token is not valid for other reasons
        }
        req.user = user; // Add decoded user payload (e.g., { userId: 1, role: 'candidate' }) to request object
        next(); // Proceed to the next middleware or route handler
    });
};

module.exports = authenticateToken;