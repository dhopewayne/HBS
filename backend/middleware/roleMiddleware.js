// middleware/roleMiddleware.js

// Role hierarchy levels
const roleLevels = {
    'master': 4,
    'admin': 3,
    'user-admin': 2,
    'user': 1
};

// Check if user has required role level
const hasRoleLevel = (userRole, requiredLevel) => {
    return roleLevels[userRole] >= requiredLevel;
};

// Middleware for admin-only routes (level 3 and above)
const checkAdmin = (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    const username = req.headers['x-username'];
    
    if (!userRole || !hasRoleLevel(userRole, 3)) {
        return res.status(403).json({ 
            success: false, 
            error: 'Admin access required' 
        });
    }
    next();
};

// Middleware for master-only routes (level 4 only)
const checkMaster = (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    
    if (userRole !== 'master') {
        return res.status(403).json({ 
            success: false, 
            error: 'Master account access required' 
        });
    }
    next();
};

// Middleware for user-admin and above (level 2 and above)
const checkUserAdmin = (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    
    if (!userRole || !hasRoleLevel(userRole, 2)) {
        return res.status(403).json({ 
            success: false, 
            error: 'User admin access required' 
        });
    }
    next();
};

// Middleware to check if user can manage target user
const canManageUser = async (req, res, next) => {
    const db = require('../models/database');
    const userRole = req.headers['x-user-role'];
    const targetUserId = req.params.userId || req.params.specialId;
    
    try {
        const database = await db.getDatabase();
        
        // Get target user
        const targetUser = await database.get(
            'SELECT role, special_id, username FROM users WHERE special_id = ?',
            targetUserId
        );
        
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Master can manage anyone except other masters
        if (userRole === 'master') {
            if (targetUser.role === 'master') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Master accounts cannot manage other master accounts' 
                });
            }
            req.targetUser = targetUser;
            return next();
        }
        
        // Admin can manage users and user-admins, but not other admins or masters
        if (userRole === 'admin') {
            if (targetUser.role === 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot manage other admin accounts' 
                });
            }
            if (targetUser.role === 'master') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot manage master accounts' 
                });
            }
            req.targetUser = targetUser;
            return next();
        }
        
        // User-admin can only manage regular users
        if (userRole === 'user-admin') {
            if (targetUser.role !== 'user') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'User admins can only manage regular user accounts' 
                });
            }
            req.targetUser = targetUser;
            return next();
        }
        
        // Regular users cannot manage anyone
        return res.status(403).json({ 
            success: false, 
            error: 'Insufficient permissions to manage users' 
        });
        
    } catch (error) {
        console.error('Error in canManageUser middleware:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Middleware to check if user can view activities of target user
const canViewUserActivities = async (req, res, next) => {
    const db = require('../models/database');
    const userRole = req.headers['x-user-role'];
    const requestingUser = req.headers['x-username'];
    const targetUserId = req.params.userId || req.params.username;
    
    try {
        const database = await db.getDatabase();
        
        // If requesting own activities
        if (requestingUser === targetUserId) {
            return next();
        }
        
        // Get target user role
        const targetUser = await database.get(
            'SELECT role FROM users WHERE username = ? OR special_id = ?',
            [targetUserId, targetUserId]
        );
        
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Master can see all activities
        if (userRole === 'master') {
            return next();
        }
        
        // Admin can see activities of users and user-admins, not other admins
        if (userRole === 'admin') {
            if (targetUser.role === 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot view other admin activities' 
                });
            }
            return next();
        }
        
        // User-admin can only see regular user activities
        if (userRole === 'user-admin') {
            if (targetUser.role === 'user') {
                return next();
            }
            return res.status(403).json({ 
                success: false, 
                error: 'User admins can only view regular user activities' 
            });
        }
        
        return res.status(403).json({ 
            success: false, 
            error: 'Insufficient permissions to view activities' 
        });
        
    } catch (error) {
        console.error('Error in canViewUserActivities middleware:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    checkAdmin,
    checkMaster,
    checkUserAdmin,
    canManageUser,
    canViewUserActivities,
    hasRoleLevel,
    roleLevels
};