import config from '../config/environment.js';
import database from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class UserService {
    constructor() {
        this.prefix = config.DB_TABLE_PREFIX;
        this.allowedRoles = ['host', 'admin', 'treasurer', 'communications', 'volunteer'];
        this.permissions = {
            host: ['manage_all', 'manage_users', 'manage_campaigns', 'manage_events', 'manage_finances', 'manage_supporters'],
            admin: ['manage_users', 'manage_campaigns', 'manage_events', 'manage_finances', 'manage_supporters'],
            treasurer: ['view_campaigns', 'view_events', 'manage_finances', 'view_supporters'],
            communications: ['view_campaigns', 'manage_events', 'manage_supporters'],
            volunteer: ['view_campaigns', 'view_events', 'view_supporters']
        };
    }

    // Create new user
    async createUser(clubId, userData) {
        try {
            // Validate role
            if (!this.allowedRoles.includes(userData.role)) {
                throw new Error(`Invalid role. Allowed roles: ${this.allowedRoles.join(', ')}`);
            }

            // Check if email already exists for this club
            const existingUserQuery = `
                SELECT id FROM ${this.prefix}users 
                WHERE club_id = ? AND email = ?
            `;
            const [existingUsers] = await database.connection.execute(existingUserQuery, [clubId, userData.email]);
            
            if (existingUsers.length > 0) {
                throw new Error('A user with this email already exists in this club');
            }

            const user = {
                id: uuidv4(),
                club_id: clubId,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                created_at: new Date()
            };

            const query = `
                INSERT INTO ${this.prefix}users (id, club_id, name, email, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            await database.connection.execute(query, [
                user.id, user.club_id, user.name, user.email, user.role, user.created_at
            ]);

            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error(error.message || 'Failed to create user');
        }
    }

    // Get all users for a club
    async getUsersByClub(clubId) {
        try {
            const query = `
                SELECT id, club_id, name, email, role, created_at
                FROM ${this.prefix}users 
                WHERE club_id = ?
                ORDER BY name ASC
            `;

            const [rows] = await database.connection.execute(query, [clubId]);
            return rows;
        } catch (error) {
            console.error('Error fetching users by club:', error);
            throw new Error('Failed to fetch users');
        }
    }

    // Get user by ID
    async getUserById(userId, clubId) {
        try {
            const query = `
                SELECT id, club_id, name, email, role, created_at
                FROM ${this.prefix}users 
                WHERE id = ? AND club_id = ?
            `;

            const [rows] = await database.connection.execute(query, [userId, clubId]);
            
            if (rows.length === 0) {
                throw new Error('User not found');
            }

            return rows[0];
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw new Error('Failed to fetch user');
        }
    }

    // Update user
    async updateUser(userId, clubId, updateData) {
        try {
            const allowedFields = ['name', 'email', 'role'];
            const updates = [];
            const values = [];

            // Validate role if provided
            if (updateData.role && !this.allowedRoles.includes(updateData.role)) {
                throw new Error(`Invalid role. Allowed roles: ${this.allowedRoles.join(', ')}`);
            }

            // Check for unique email if email is being updated
            if (updateData.email) {
                const existingUserQuery = `
                    SELECT id FROM ${this.prefix}users 
                    WHERE club_id = ? AND email = ? AND id != ?
                `;
                const [existingUsers] = await database.connection.execute(existingUserQuery, [clubId, updateData.email, userId]);
                
                if (existingUsers.length > 0) {
                    throw new Error('A user with this email already exists in this club');
                }
            }

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key) && updateData[key] !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(userId);
            values.push(clubId);

            const query = `
                UPDATE ${this.prefix}users 
                SET ${updates.join(', ')}
                WHERE id = ? AND club_id = ?
            `;

            const [result] = await database.connection.execute(query, values);

            if (result.affectedRows === 0) {
                throw new Error('User not found or not authorized');
            }

            // Return updated user
            return await this.getUserById(userId, clubId);
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error(error.message || 'Failed to update user');
        }
    }

    // Delete user
    async deleteUser(userId, clubId) {
        try {
            // Check if user exists
            const user = await this.getUserById(userId, clubId);
            
            // Prevent deletion of host user
            if (user.role === 'host') {
                throw new Error('Cannot delete the host user');
            }

            const query = `DELETE FROM ${this.prefix}users WHERE id = ? AND club_id = ?`;
            const [result] = await database.connection.execute(query, [userId, clubId]);

            if (result.affectedRows === 0) {
                throw new Error('User not found or not authorized');
            }

            return { message: 'User deleted successfully' };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw new Error(error.message || 'Failed to delete user');
        }
    }

    // Update user role
    async updateUserRole(userId, clubId, role) {
        try {
            // Validate role
            if (!this.allowedRoles.includes(role)) {
                throw new Error(`Invalid role. Allowed roles: ${this.allowedRoles.join(', ')}`);
            }

            // Check if user exists and get current role
            const user = await this.getUserById(userId, clubId);
            
            // Prevent changing host role
            if (user.role === 'host') {
                throw new Error('Cannot change the role of the host user');
            }

            const query = `
                UPDATE ${this.prefix}users 
                SET role = ?
                WHERE id = ? AND club_id = ?
            `;

            const [result] = await database.connection.execute(query, [role, userId, clubId]);

            if (result.affectedRows === 0) {
                throw new Error('User not found or not authorized');
            }

            // Return updated user
            return await this.getUserById(userId, clubId);
        } catch (error) {
            console.error('Error updating user role:', error);
            throw new Error(error.message || 'Failed to update user role');
        }
    }

    // Get user permissions
    async getUserPermissions(userId, clubId) {
        try {
            const user = await this.getUserById(userId, clubId);
            const permissions = this.permissions[user.role] || [];
            
            return {
                user_id: userId,
                role: user.role,
                permissions
            };
        } catch (error) {
            console.error('Error fetching user permissions:', error);
            throw new Error('Failed to fetch user permissions');
        }
    }

    // Get users by role
    async getUsersByRole(clubId, role) {
        try {
            if (!this.allowedRoles.includes(role)) {
                throw new Error(`Invalid role. Allowed roles: ${this.allowedRoles.join(', ')}`);
            }

            const query = `
                SELECT id, club_id, name, email, role, created_at
                FROM ${this.prefix}users 
                WHERE club_id = ? AND role = ?
                ORDER BY name ASC
            `;

            const [rows] = await database.connection.execute(query, [clubId, role]);
            return rows;
        } catch (error) {
            console.error('Error fetching users by role:', error);
            throw new Error('Failed to fetch users by role');
        }
    }

    // Get user statistics
    async getUserStats(clubId) {
        try {
            const query = `
                SELECT 
                    role,
                    COUNT(*) as count
                FROM ${this.prefix}users 
                WHERE club_id = ?
                GROUP BY role
                ORDER BY count DESC
            `;

            const [rows] = await database.connection.execute(query, [clubId]);
            
            const totalQuery = `
                SELECT COUNT(*) as total
                FROM ${this.prefix}users 
                WHERE club_id = ?
            `;
            
            const [totalRows] = await database.connection.execute(totalQuery, [clubId]);
            
            return {
                total_users: totalRows[0].total,
                by_role: rows
            };
        } catch (error) {
            console.error('Error fetching user statistics:', error);
            throw new Error('Failed to fetch user statistics');
        }
    }
}

export default UserService;