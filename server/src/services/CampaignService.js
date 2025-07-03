import database from '../config/database.js';
import config from '../config/environment.js';
import { v4 as uuidv4 } from 'uuid';

class CampaignService {
  constructor() {
    this.prefix = config.DB_TABLE_PREFIX;
  }

  async createCampaign(clubId, campaignData) {
    const { 
      name, 
      description, 
      target_amount,
      category,
      start_date,
      end_date,
      tags 
    } = campaignData;
    
    const campaignId = uuidv4();
    
    // Convert tags array to JSON string for storage
    const tagsJson = tags && Array.isArray(tags) ? JSON.stringify(tags) : null;
    
    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}campaigns (
        id, club_id, name, description, target_amount, 
        category, start_date, end_date, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignId, 
        clubId, 
        name, 
        description, 
        target_amount,
        category || null,
        start_date || null,
        end_date || null,
        tagsJson
      ]
    );

    // Get the created campaign
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns WHERE id = ?`,
      [campaignId]
    );

    const campaign = Array.isArray(rows) ? rows[0] : null;
    
    // Parse tags back to array for response
    if (campaign && campaign.tags) {
      try {
        campaign.tags = JSON.parse(campaign.tags);
      } catch (e) {
        campaign.tags = [];
      }
    } else if (campaign) {
      campaign.tags = [];
    }

    return campaign;
  }

  async getCampaignsByClub(clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns WHERE club_id = ? ORDER BY created_at DESC`,
      [clubId]
    );

    // Parse tags for each campaign
    const campaigns = (rows || []).map(campaign => {
      if (campaign.tags) {
        try {
          campaign.tags = JSON.parse(campaign.tags);
        } catch (e) {
          campaign.tags = [];
        }
      } else {
        campaign.tags = [];
      }
      return campaign;
    });

    return campaigns;
  }

  async getCampaignById(campaignId, clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns WHERE id = ? AND club_id = ?`,
      [campaignId, clubId]
    );

    const campaign = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    // Parse tags back to array for response
    if (campaign && campaign.tags) {
      try {
        campaign.tags = JSON.parse(campaign.tags);
      } catch (e) {
        campaign.tags = [];
      }
    } else if (campaign) {
      campaign.tags = [];
    }

    return campaign;
  }

  async updateCampaign(campaignId, clubId, updateData) {
    // Build dynamic update query
    const allowedFields = [
      'name', 
      'description', 
      'target_amount', 
      'category', 
      'start_date', 
      'end_date', 
      'tags'
    ];
    
    const updateFields = Object.keys(updateData).filter(key => 
      allowedFields.includes(key) && updateData[key] !== undefined
    );
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Process the data
    const processedData = { ...updateData };
    if (processedData.tags && Array.isArray(processedData.tags)) {
      processedData.tags = JSON.stringify(processedData.tags);
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => processedData[field]);
    values.push(campaignId, clubId);

    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}campaigns SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    // Return updated campaign
    return await this.getCampaignById(campaignId, clubId);
  }

  async deleteCampaign(campaignId, clubId) {
    // Check if campaign has associated events first
    const [eventRows] = await database.connection.execute(
      `SELECT COUNT(*) as event_count FROM ${this.prefix}events WHERE campaign_id = ?`,
      [campaignId]
    );

    const eventCount = Array.isArray(eventRows) ? eventRows[0].event_count : 0;
    
    if (eventCount > 0) {
      throw new Error('Cannot delete campaign with associated events');
    }

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}campaigns WHERE id = ? AND club_id = ?`,
      [campaignId, clubId]
    );

    return result.affectedRows > 0;
  }

  async getCampaignStats(campaignId, clubId) {
    // Get campaign with event statistics
    const [campaignRows] = await database.connection.execute(
      `SELECT 
        c.*,
        COUNT(e.id) as total_events,
        COALESCE(SUM(e.actual_amount), 0) as total_raised,
        COALESCE(SUM(e.net_profit), 0) as total_profit
      FROM ${this.prefix}campaigns c
      LEFT JOIN ${this.prefix}events e ON c.id = e.campaign_id
      WHERE c.id = ? AND c.club_id = ?
      GROUP BY c.id`,
      [campaignId, clubId]
    );

    if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
      return null;
    }

    const campaign = campaignRows[0];
    
    // Parse tags back to array for response
    if (campaign.tags) {
      try {
        campaign.tags = JSON.parse(campaign.tags);
      } catch (e) {
        campaign.tags = [];
      }
    } else {
      campaign.tags = [];
    }
    
    // Calculate progress percentage
    campaign.progress_percentage = campaign.target_amount > 0 
      ? Math.round((campaign.total_raised / campaign.target_amount) * 100)
      : 0;

    return campaign;
  }
}

export default CampaignService;