// server/src/services/PrizeService.js
import config from '../config/environment.js';
import database from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class PrizeService {
    constructor() {
        this.prefix = config.DB_TABLE_PREFIX;
    }

    // Create new prize
   async createPrize(eventId, prizeData) {
  try {
    // Validate value is positive
    if (prizeData.value && prizeData.value <= 0) {
      throw new Error('Prize value must be positive');
    }

    const prize = {
      id: uuidv4(),
      event_id: eventId,
      name: prizeData.name,
      value: prizeData.value || 0,
      donated_by: prizeData.donated_by || null,
      confirmed: prizeData.confirmed || false,
      created_at: new Date()
    };

    // Verify event exists and get club_id for authorization
    const eventQuery = `SELECT club_id, title FROM ${this.prefix}events WHERE id = ?`;
    const [eventRows] = await database.connection.execute(eventQuery, [eventId]);
    
    if (eventRows.length === 0) {
      throw new Error('Event not found');
    }

    const clubId = eventRows[0].club_id;
    const eventTitle = eventRows[0].title;

    // Verify supporter exists if donated_by is provided
    let donorName = null;
    if (prize.donated_by) {
      const supporterQuery = `
        SELECT id, name FROM ${this.prefix}supporters 
        WHERE id = ? AND club_id = ?
      `;
      const [supporterRows] = await database.connection.execute(supporterQuery, [
        prize.donated_by, 
        clubId
      ]);
      
      if (supporterRows.length === 0) {
        throw new Error('Supporter not found');
      }
      
      donorName = supporterRows[0].name;
    }

    // Insert the prize
    const query = `
      INSERT INTO ${this.prefix}prizes (id, event_id, name, value, donated_by, confirmed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await database.connection.execute(query, [
      prize.id, prize.event_id, prize.name, prize.value, 
      prize.donated_by, prize.confirmed, prize.created_at
    ]);

    // NEW: Create follow-up task for thank you if donor is specified
    if (prize.donated_by && donorName) {
      try {
        const taskQuery = `
          INSERT INTO ${this.prefix}tasks (id, event_id, title, assigned_to, due_date, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const taskId = uuidv4();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days

        await database.connection.execute(taskQuery, [
          taskId,
          eventId,
          `Send thank you to ${donorName} for prize: ${prize.name}`,
          prize.donated_by, // Assign to the donor (could be assigned to staff instead)
          dueDate,
          'todo',
          new Date()
        ]);

        console.log(`✅ Created thank you task for prize donation: ${prize.name}`);
      } catch (taskError) {
        console.error('Failed to create thank you task:', taskError);
        // Don't fail the prize creation if task creation fails
      }
    }

    return prize;
  } catch (error) {
    console.error('Error creating prize:', error);
    throw new Error(error.message || 'Failed to create prize');
  }
}

    // Get all prizes for an event
    async getPrizesByEvent(eventId) {
        try {
            const query = `
                SELECT 
                    p.*,
                    s.name as donor_name,
                    s.email as donor_email
                FROM ${this.prefix}prizes p
                LEFT JOIN ${this.prefix}supporters s ON p.donated_by = s.id
                WHERE p.event_id = ?
                ORDER BY p.created_at DESC
            `;

            const [rows] = await database.connection.execute(query, [eventId]);
            return rows;
        } catch (error) {
            console.error('Error fetching prizes by event:', error);
            throw new Error('Failed to fetch prizes');
        }
    }

    // Get prize by ID
    async getPrizeById(prizeId) {
        try {
            const query = `
                SELECT 
                    p.*,
                    s.name as donor_name,
                    s.email as donor_email,
                    e.title as event_title,
                    e.club_id
                FROM ${this.prefix}prizes p
                LEFT JOIN ${this.prefix}supporters s ON p.donated_by = s.id
                LEFT JOIN ${this.prefix}events e ON p.event_id = e.id
                WHERE p.id = ?
            `;

            const [rows] = await database.connection.execute(query, [prizeId]);
            
            if (rows.length === 0) {
                throw new Error('Prize not found');
            }

            return rows[0];
        } catch (error) {
            console.error('Error fetching prize by ID:', error);
            throw new Error('Failed to fetch prize');
        }
    }

    // Update prize
    async updatePrize(prizeId, updateData) {
        try {
            const allowedFields = ['name', 'value', 'donated_by'];
            const updates = [];
            const values = [];

            // Validate value if provided
            if (updateData.value !== undefined && updateData.value <= 0) {
                throw new Error('Prize value must be positive');
            }

            // Get current prize to validate club ownership
            const currentPrize = await this.getPrizeById(prizeId);

            // Verify supporter exists if donated_by is being updated
            if (updateData.donated_by !== undefined) {
                if (updateData.donated_by) {
                    const supporterQuery = `
                        SELECT id FROM ${this.prefix}supporters 
                        WHERE id = ? AND club_id = ?
                    `;
                    const [supporterRows] = await database.connection.execute(supporterQuery, [
                        updateData.donated_by, 
                        currentPrize.club_id
                    ]);
                    
                    if (supporterRows.length === 0) {
                        throw new Error('Supporter not found');
                    }
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

            values.push(prizeId);

            const query = `
                UPDATE ${this.prefix}prizes 
                SET ${updates.join(', ')}
                WHERE id = ?
            `;

            const [result] = await database.connection.execute(query, values);

            if (result.affectedRows === 0) {
                throw new Error('Prize not found or not authorized');
            }

            // Return updated prize
            return await this.getPrizeById(prizeId);
        } catch (error) {
            console.error('Error updating prize:', error);
            throw new Error(error.message || 'Failed to update prize');
        }
    }

    // Delete prize
    async deletePrize(prizeId) {
        try {
            const query = `DELETE FROM ${this.prefix}prizes WHERE id = ?`;
            const [result] = await database.connection.execute(query, [prizeId]);

            if (result.affectedRows === 0) {
                throw new Error('Prize not found');
            }

            return { message: 'Prize deleted successfully' };
        } catch (error) {
            console.error('Error deleting prize:', error);
            throw new Error('Failed to delete prize');
        }
    }

    // Confirm prize donation
    async confirmPrizeDonation(prizeId) {
        try {
            const query = `
                UPDATE ${this.prefix}prizes 
                SET confirmed = true
                WHERE id = ?
            `;

            const [result] = await database.connection.execute(query, [prizeId]);

            if (result.affectedRows === 0) {
                throw new Error('Prize not found');
            }

            // Return updated prize
            return await this.getPrizeById(prizeId);
        } catch (error) {
            console.error('Error confirming prize donation:', error);
            throw new Error('Failed to confirm prize donation');
        }
    }

    // Get prizes by donor (supporter)
    async getPrizesByDonor(supporterId) {
        try {
            const query = `
                SELECT 
                    p.*,
                    e.title as event_title,
                    e.event_date,
                    c.name as campaign_name
                FROM ${this.prefix}prizes p
                LEFT JOIN ${this.prefix}events e ON p.event_id = e.id
                LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
                WHERE p.donated_by = ?
                ORDER BY p.created_at DESC
            `;

            const [rows] = await database.connection.execute(query, [supporterId]);
            return rows;
        } catch (error) {
            console.error('Error fetching prizes by donor:', error);
            throw new Error('Failed to fetch prizes by donor');
        }
    }

    // Get prize statistics for an event
    async getPrizeStats(eventId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_prizes,
                    SUM(value) as total_value,
                    COUNT(CASE WHEN confirmed = true THEN 1 END) as confirmed_prizes,
                    COUNT(CASE WHEN donated_by IS NOT NULL THEN 1 END) as donated_prizes,
                    AVG(value) as average_value
                FROM ${this.prefix}prizes 
                WHERE event_id = ?
            `;

            const [rows] = await database.connection.execute(query, [eventId]);
            return rows[0];
        } catch (error) {
            console.error('Error fetching prize statistics:', error);
            throw new Error('Failed to fetch prize statistics');
        }
    }

    // Get prizes by confirmation status
    async getPrizesByStatus(eventId, confirmed = null) {
        try {
            let query = `
                SELECT 
                    p.*,
                    s.name as donor_name
                FROM ${this.prefix}prizes p
                LEFT JOIN ${this.prefix}supporters s ON p.donated_by = s.id
                WHERE p.event_id = ?
            `;

            const params = [eventId];

            if (confirmed !== null) {
                query += ` AND p.confirmed = ?`;
                params.push(confirmed);
            }

            query += ` ORDER BY p.created_at DESC`;

            const [rows] = await database.connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching prizes by status:', error);
            throw new Error('Failed to fetch prizes by status');
        }
    }

    // Get total prize value for club
    async getClubPrizeValue(clubId) {
        try {
            const query = `
                SELECT 
                    SUM(p.value) as total_prize_value,
                    COUNT(p.id) as total_prizes
                FROM ${this.prefix}prizes p
                JOIN ${this.prefix}events e ON p.event_id = e.id
                WHERE e.club_id = ? AND p.confirmed = true
            `;

            const [rows] = await database.connection.execute(query, [clubId]);
            return rows[0];
        } catch (error) {
            console.error('Error fetching club prize value:', error);
            throw new Error('Failed to fetch club prize value');
        }
    }

    // Bulk create prizes
    async bulkCreatePrizes(eventId, prizesData) {
        try {
            const prizes = [];
            
            for (const data of prizesData) {
                const prize = await this.createPrize(eventId, data);
                prizes.push(prize);
            }

            return {
                message: `${prizes.length} prizes created successfully`,
                prizes
            };
        } catch (error) {
            console.error('Error bulk creating prizes:', error);
            throw new Error('Failed to bulk create prizes');
        }
    }
}

export default PrizeService;