import express from 'express';
import UserService from '../services/UserServices.js'; // FIXED: Added .js extension
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';

const router = express.Router();
const userService = new UserService();

// Helper function to check if user can manage users
const canManageUsers = (userRole) => {
    return ['host', 'admin'].includes(userRole);
};

// Create new user
router.post('/clubs/:clubId/users', // FIXED: Removed /api prefix since it's added by app.js
    authenticateToken, 
    validateRequired(['name', 'email', 'role']), 
    async (req, res) => {
        try {
            const { clubId } = req.params;
            const { name, email, role } = req.body;

            // Verify club ownership
            if (clubId !== req.club_id) {
                return res.status(403).json({ error: 'Not authorized to access this club' });
            }

            // Check if user has permission to manage users
            if (!canManageUsers(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to create users' });
            }

            const user = await userService.createUser(clubId, { name, email, role });

            // Emit socket event if socket manager is available
            try {
                const socketManager = req.app.get('socketManager');
                if (socketManager) {
                    socketManager.emitToClub(clubId, 'user_created', { user });
                }
            } catch (socketError) {
                console.log('Socket emission failed:', socketError.message);
            }

            res.status(201).json({
                message: 'User created successfully',
                user
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

// Get all users for a club
router.get('/clubs/:clubId/users', authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const users = await userService.getUsersByClub(clubId);

        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
router.get('/clubs/:clubId/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { clubId, userId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const user = await userService.getUserById(userId, clubId);

        res.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(404).json({ error: error.message });
    }
});

// Update user
router.put('/clubs/:clubId/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { clubId, userId } = req.params;
        const updateData = req.body;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        // Check if user has permission to manage users
        if (!canManageUsers(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to update users' });
        }

        const user = await userService.updateUser(userId, clubId, updateData);

        // Emit socket event if socket manager is available
        try {
            const socketManager = req.app.get('socketManager');
            if (socketManager) {
                socketManager.emitToClub(clubId, 'user_updated', { user });
            }
        } catch (socketError) {
            console.log('Socket emission failed:', socketError.message);
        }

        res.json({
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete user
router.delete('/clubs/:clubId/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { clubId, userId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        // Check if user has permission to manage users
        if (!canManageUsers(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to delete users' });
        }

        // Prevent users from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await userService.deleteUser(userId, clubId);

        // Emit socket event if socket manager is available
        try {
            const socketManager = req.app.get('socketManager');
            if (socketManager) {
                socketManager.emitToClub(clubId, 'user_deleted', { userId });
            }
        } catch (socketError) {
            console.log('Socket emission failed:', socketError.message);
        }

        res.json(result);
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update user role
router.put('/clubs/:clubId/users/:userId/role', 
    authenticateToken, 
    validateRequired(['role']), 
    async (req, res) => {
        try {
            const { clubId, userId } = req.params;
            const { role } = req.body;

            // Verify club ownership
            if (clubId !== req.club_id) {
                return res.status(403).json({ error: 'Not authorized to access this club' });
            }

            // Check if user has permission to manage users
            if (!canManageUsers(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to change user roles' });
            }

            // Prevent users from changing their own role
            if (userId === req.user.id) {
                return res.status(400).json({ error: 'Cannot change your own role' });
            }

            const user = await userService.updateUserRole(userId, clubId, role);

            // Emit socket event if socket manager is available
            try {
                const socketManager = req.app.get('socketManager');
                if (socketManager) {
                    socketManager.emitToClub(clubId, 'user_role_updated', { user });
                }
            } catch (socketError) {
                console.log('Socket emission failed:', socketError.message);
            }

            res.json({
                message: 'User role updated successfully',
                user
            });
        } catch (error) {
            console.error('Error updating user role:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

// Get user permissions
router.get('/clubs/:clubId/users/:userId/permissions', authenticateToken, async (req, res) => {
    try {
        const { clubId, userId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const permissions = await userService.getUserPermissions(userId, clubId);

        res.json(permissions);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(404).json({ error: error.message });
    }
});

// Get users by role
router.get('/clubs/:clubId/users/role/:role', authenticateToken, async (req, res) => {
    try {
        const { clubId, role } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const users = await userService.getUsersByRole(clubId, role);

        res.json({ users });
    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get user statistics
router.get('/clubs/:clubId/users/stats', authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const stats = await userService.getUserStats(clubId);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;