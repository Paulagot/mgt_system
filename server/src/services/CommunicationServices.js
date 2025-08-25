import config from '../config/environment.js';
import database from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class CommunicationService {
    constructor() {
        this.prefix = config.DB_TABLE_PREFIX;
    }

    // Create communication log
    async logCommunication(clubId, communicationData) {
        try {
            const communication = {
                id: uuidv4(),
                club_id: clubId,
                supporter_id: communicationData.supporter_id,
                type: communicationData.type,
                direction: communicationData.direction,
                subject: communicationData.subject || null,
                notes: communicationData.notes || null,
                outcome: communicationData.outcome || null,
                follow_up_required: communicationData.follow_up_required || false,
                follow_up_date: communicationData.follow_up_date || null,
                follow_up_notes: communicationData.follow_up_notes || null,
                event_id: communicationData.event_id || null,
                campaign_id: communicationData.campaign_id || null,
                communication_channel: communicationData.communication_channel || null,
                duration_minutes: communicationData.duration_minutes || null,
                attachment_urls: communicationData.attachment_urls || null,
                tags: communicationData.tags || null,
                created_by: communicationData.created_by || null,
                created_at: new Date(),
                updated_at: new Date()
            };

            const query = `
                INSERT INTO ${this.prefix}communications 
                (id, club_id, supporter_id, type, direction, subject, notes, outcome, 
                 follow_up_required, follow_up_date, follow_up_notes, event_id, campaign_id, 
                 communication_channel, duration_minutes, attachment_urls, tags, created_by, 
                 created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await database.connection.execute(query, [
                communication.id, communication.club_id, communication.supporter_id,
                communication.type, communication.direction, communication.subject,
                communication.notes, communication.outcome, communication.follow_up_required,
                communication.follow_up_date, communication.follow_up_notes, communication.event_id,
                communication.campaign_id, communication.communication_channel, communication.duration_minutes,
                communication.attachment_urls, communication.tags, communication.created_by,
                communication.created_at, communication.updated_at
            ]);

            return communication;
        } catch (error) {
            console.error('Error logging communication:', error);
            throw new Error('Failed to log communication');
        }
    }

    // Get communication history for a supporter - FIXED QUERY
    async getCommunicationHistory(supporterId, clubId, limit = 10) {
        try {
            const query = `
                SELECT 
                    c.*,
                    s.name as supporter_name,
                    s.email as supporter_email,
                    u.name as created_by_name
                FROM ${this.prefix}communications c
                LEFT JOIN ${this.prefix}supporters s ON c.supporter_id = s.id
                LEFT JOIN ${this.prefix}users u ON c.created_by = u.id
                WHERE c.supporter_id = ? AND c.club_id = ?
                ORDER BY c.created_at DESC
                LIMIT ?
            `;

            const [rows] = await database.connection.execute(query, [supporterId, clubId, limit]);
            
            // Parse JSON fields if they exist
            return rows.map(row => ({
                ...row,
                tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : null,
                attachment_urls: row.attachment_urls ? (typeof row.attachment_urls === 'string' ? JSON.parse(row.attachment_urls) : row.attachment_urls) : null
            }));
        } catch (error) {
            console.error('Error fetching communication history:', error);
            throw new Error('Failed to fetch communication history');
        }
    }

    // Get follow-up tasks
    async getFollowUpTasks(clubId, overdue = false) {
        try {
            let query = `
                SELECT 
                    c.*,
                    s.name as supporter_name,
                    s.email as supporter_email
                FROM ${this.prefix}communications c
                LEFT JOIN ${this.prefix}supporters s ON c.supporter_id = s.id
                WHERE c.club_id = ? AND c.follow_up_required = true
            `;

            const params = [clubId];

            if (overdue) {
                query += ` AND c.follow_up_date < CURDATE()`;
            }

            query += ` ORDER BY c.follow_up_date ASC`;

            const [rows] = await database.connection.execute(query, params);
            
            return rows.map(row => ({
                ...row,
                tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : null
            }));
        } catch (error) {
            console.error('Error fetching follow-up tasks:', error);
            throw new Error('Failed to fetch follow-up tasks');
        }
    }

    // Get communication analytics
    async getCommunicationAnalytics(clubId, timeframe = '30d') {
        try {
            const query = `
                SELECT 
                    type,
                    direction,
                    outcome,
                    COUNT(*) as count,
                    AVG(duration_minutes) as avg_duration
                FROM ${this.prefix}communications 
                WHERE club_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY type, direction, outcome
                ORDER BY count DESC
            `;

            const [rows] = await database.connection.execute(query, [clubId]);
            return rows;
        } catch (error) {
            console.error('Error fetching communication analytics:', error);
            throw new Error('Failed to fetch communication analytics');
        }
    }

    // Update communication
    async updateCommunication(communicationId, clubId, updateData) {
        try {
            const allowedFields = [
                'subject', 'notes', 'outcome', 'follow_up_required', 
                'follow_up_date', 'follow_up_notes', 'tags'
            ];

            const updates = [];
            const values = [];

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key) && updateData[key] !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            updates.push('updated_at = ?');
            values.push(new Date());
            values.push(communicationId);
            values.push(clubId);

            const query = `
                UPDATE ${this.prefix}communications 
                SET ${updates.join(', ')}
                WHERE id = ? AND club_id = ?
            `;

            const [result] = await database.connection.execute(query, values);

            if (result.affectedRows === 0) {
                throw new Error('Communication not found or not authorized');
            }

            return { message: 'Communication updated successfully' };
        } catch (error) {
            console.error('Error updating communication:', error);
            throw new Error('Failed to update communication');
        }
    }

    // Delete communication
    async deleteCommunication(communicationId, clubId) {
        try {
            const query = `DELETE FROM ${this.prefix}communications WHERE id = ? AND club_id = ?`;
            const [result] = await database.connection.execute(query, [communicationId, clubId]);

            if (result.affectedRows === 0) {
                throw new Error('Communication not found or not authorized');
            }

            return { message: 'Communication deleted successfully' };
        } catch (error) {
            console.error('Error deleting communication:', error);
            throw new Error('Failed to delete communication');
        }
    }

    // Get communications by type
    async getCommunicationsByType(clubId, type, limit = 50) {
        try {
            const query = `
                SELECT 
                    c.*,
                    s.name as supporter_name
                FROM ${this.prefix}communications c
                LEFT JOIN ${this.prefix}supporters s ON c.supporter_id = s.id
                WHERE c.club_id = ? AND c.type = ?
                ORDER BY c.created_at DESC
                LIMIT ?
            `;

            const [rows] = await database.connection.execute(query, [clubId, type, limit]);
            return rows;
        } catch (error) {
            console.error('Error fetching communications by type:', error);
            throw new Error('Failed to fetch communications by type');
        }
    }

    // Bulk create communications
    async bulkCreateCommunications(clubId, communicationsData) {
        try {
            const communications = [];
            
            for (const data of communicationsData) {
                const communication = await this.logCommunication(clubId, data);
                communications.push(communication);
            }

            return {
                message: `${communications.length} communications logged successfully`,
                communications
            };
        } catch (error) {
            console.error('Error bulk creating communications:', error);
            throw new Error('Failed to bulk create communications');
        }
    }
}

export default CommunicationService;