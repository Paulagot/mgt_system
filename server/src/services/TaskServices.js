// server/src/services/TaskService.js - Pure JavaScript version
import { v4 as uuidv4 } from 'uuid';
import config from '../config/environment.js';
import database from '../config/database.js';

class TaskService {
  constructor() {
    this.prefix = config.DB_TABLE_PREFIX;
  }

  // Create new task
  async createTask(eventId, taskData) {
    try {
      const { title, assigned_to, due_date, status = 'todo' } = taskData;
      
      // Validate required fields
      if (!title?.trim()) {
        throw new Error('Task title is required');
      }

      // Validate status
      const validStatuses = ['todo', 'in_progress', 'done'];
      if (status && !validStatuses.includes(status)) {
        throw new Error('Invalid task status');
      }

      // Validate due date if provided
      if (due_date && isNaN(new Date(due_date).getTime())) {
        throw new Error('Invalid due date format');
      }

      // Get event details to verify it exists and get club_id
      const [eventRows] = await database.connection.execute(
        `SELECT id, club_id, title FROM ${this.prefix}events WHERE id = ?`,
        [eventId]
      );

      if (eventRows.length === 0) {
        throw new Error('Event not found');
      }

      const event = eventRows[0];
      const taskId = uuidv4();

      // Insert task
      await database.connection.execute(
        `INSERT INTO ${this.prefix}tasks 
         (id, event_id, title, assigned_to, due_date, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [taskId, eventId, title.trim(), assigned_to || null, due_date || null, status]
      );

      // Fetch the created task with additional details
      const task = await this.getTaskById(taskId);

      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(error.message || 'Failed to create task');
    }
  }

  // Get all tasks for an event
  async getTasksByEvent(eventId) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT 
           t.*,
           e.title as event_title,
           e.club_id,
           c.name as campaign_name,
           s.name as assigned_supporter_name,
           s.email as assigned_supporter_email,
           u.name as assigned_user_name,
           u.email as assigned_user_email,
           CASE 
             WHEN s.id IS NOT NULL THEN 'supporter'
             WHEN u.id IS NOT NULL THEN 'user'
             ELSE 'unassigned'
           END as assigned_type,
           COALESCE(s.name, u.name) as assigned_name,
           COALESCE(s.email, u.email) as assigned_email,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date < CURDATE() AND t.status != 'done'
             THEN DATEDIFF(CURDATE(), t.due_date)
             ELSE 0
           END as days_overdue,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date >= CURDATE()
             THEN DATEDIFF(t.due_date, CURDATE())
             ELSE NULL
           END as days_until_due
         FROM ${this.prefix}tasks t
         JOIN ${this.prefix}events e ON t.event_id = e.id
         LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
         LEFT JOIN ${this.prefix}supporters s ON t.assigned_to = s.id
         LEFT JOIN ${this.prefix}users u ON t.assigned_to = u.id
         WHERE t.event_id = ?
         ORDER BY 
           CASE 
             WHEN t.due_date IS NULL THEN 1 
             ELSE 0 
           END,
           t.due_date ASC,
           t.created_at ASC`,
        [eventId]
      );

      return rows;
    } catch (error) {
      console.error('Error fetching tasks by event:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  // Get specific task by ID
  async getTaskById(taskId) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT 
           t.*,
           e.title as event_title,
           e.club_id,
           c.name as campaign_name,
           s.name as assigned_supporter_name,
           s.email as assigned_supporter_email,
           u.name as assigned_user_name,
           u.email as assigned_user_email,
           CASE 
             WHEN s.id IS NOT NULL THEN 'supporter'
             WHEN u.id IS NOT NULL THEN 'user'
             ELSE 'unassigned'
           END as assigned_type,
           COALESCE(s.name, u.name) as assigned_name,
           COALESCE(s.email, u.email) as assigned_email,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date < CURDATE() AND t.status != 'done'
             THEN DATEDIFF(CURDATE(), t.due_date)
             ELSE 0
           END as days_overdue,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date >= CURDATE()
             THEN DATEDIFF(t.due_date, CURDATE())
             ELSE NULL
           END as days_until_due
         FROM ${this.prefix}tasks t
         JOIN ${this.prefix}events e ON t.event_id = e.id
         LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
         LEFT JOIN ${this.prefix}supporters s ON t.assigned_to = s.id
         LEFT JOIN ${this.prefix}users u ON t.assigned_to = u.id
         WHERE t.id = ?`,
        [taskId]
      );

      if (rows.length === 0) {
        throw new Error('Task not found');
      }

      return rows[0];
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error(error.message || 'Failed to fetch task');
    }
  }

  // Update task
  async updateTask(taskId, updateData) {
    try {
      const allowedFields = ['title', 'assigned_to', 'due_date', 'status'];
      const updates = [];
      const values = [];

      // Build dynamic update query
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          if (key === 'title' && !updateData[key]?.trim()) {
            throw new Error('Task title cannot be empty');
          }
          
          if (key === 'status') {
            const validStatuses = ['todo', 'in_progress', 'done'];
            if (!validStatuses.includes(updateData[key])) {
              throw new Error('Invalid task status');
            }
          }

          if (key === 'due_date' && updateData[key] && isNaN(new Date(updateData[key]).getTime())) {
            throw new Error('Invalid due date format');
          }

          updates.push(`${key} = ?`);
          values.push(updateData[key] === '' ? null : updateData[key]);
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(taskId);

      await database.connection.execute(
        `UPDATE ${this.prefix}tasks SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Return updated task
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(error.message || 'Failed to update task');
    }
  }

  // Delete task
  async deleteTask(taskId) {
    try {
      const [result] = await database.connection.execute(
        `DELETE FROM ${this.prefix}tasks WHERE id = ?`,
        [taskId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Task not found');
      }

      return { message: 'Task deleted successfully' };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(error.message || 'Failed to delete task');
    }
  }

  // Update task status only
  async updateTaskStatus(taskId, status) {
    try {
      const validStatuses = ['todo', 'in_progress', 'done'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid task status');
      }

      await database.connection.execute(
        `UPDATE ${this.prefix}tasks SET status = ? WHERE id = ?`,
        [status, taskId]
      );

      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Error updating task status:', error);
      throw new Error(error.message || 'Failed to update task status');
    }
  }

  // Get tasks assigned to a user/supporter
  async getTasksByUser(assignedToId) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT 
           t.*,
           e.title as event_title,
           e.club_id,
           c.name as campaign_name,
           s.name as assigned_supporter_name,
           s.email as assigned_supporter_email,
           u.name as assigned_user_name,
           u.email as assigned_user_email,
           CASE 
             WHEN s.id IS NOT NULL THEN 'supporter'
             WHEN u.id IS NOT NULL THEN 'user'
             ELSE 'unassigned'
           END as assigned_type,
           COALESCE(s.name, u.name) as assigned_name,
           COALESCE(s.email, u.email) as assigned_email,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date < CURDATE() AND t.status != 'done'
             THEN DATEDIFF(CURDATE(), t.due_date)
             ELSE 0
           END as days_overdue,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date >= CURDATE()
             THEN DATEDIFF(t.due_date, CURDATE())
             ELSE NULL
           END as days_until_due
         FROM ${this.prefix}tasks t
         JOIN ${this.prefix}events e ON t.event_id = e.id
         LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
         LEFT JOIN ${this.prefix}supporters s ON t.assigned_to = s.id
         LEFT JOIN ${this.prefix}users u ON t.assigned_to = u.id
         WHERE t.assigned_to = ?
         ORDER BY 
           CASE 
             WHEN t.due_date IS NULL THEN 1 
             ELSE 0 
           END,
           t.due_date ASC,
           t.created_at ASC`,
        [assignedToId]
      );

      return rows;
    } catch (error) {
      console.error('Error fetching tasks by user:', error);
      throw new Error('Failed to fetch user tasks');
    }
  }

  // Get overdue tasks for club
  async getOverdueTasks(clubId) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT 
           t.*,
           e.title as event_title,
           e.club_id,
           c.name as campaign_name,
           s.name as assigned_supporter_name,
           s.email as assigned_supporter_email,
           u.name as assigned_user_name,
           u.email as assigned_user_email,
           CASE 
             WHEN s.id IS NOT NULL THEN 'supporter'
             WHEN u.id IS NOT NULL THEN 'user'
             ELSE 'unassigned'
           END as assigned_type,
           COALESCE(s.name, u.name) as assigned_name,
           COALESCE(s.email, u.email) as assigned_email,
           DATEDIFF(CURDATE(), t.due_date) as days_overdue,
           NULL as days_until_due
         FROM ${this.prefix}tasks t
         JOIN ${this.prefix}events e ON t.event_id = e.id
         LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
         LEFT JOIN ${this.prefix}supporters s ON t.assigned_to = s.id
         LEFT JOIN ${this.prefix}users u ON t.assigned_to = u.id
         WHERE e.club_id = ? 
           AND t.due_date < CURDATE() 
           AND t.status != 'done'
         ORDER BY t.due_date ASC`,
        [clubId]
      );

      return rows;
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw new Error('Failed to fetch overdue tasks');
    }
  }

  // Get upcoming tasks for club
  async getUpcomingTasks(clubId, days = 7) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT 
           t.*,
           e.title as event_title,
           e.club_id,
           c.name as campaign_name,
           s.name as assigned_supporter_name,
           s.email as assigned_supporter_email,
           u.name as assigned_user_name,
           u.email as assigned_user_email,
           CASE 
             WHEN s.id IS NOT NULL THEN 'supporter'
             WHEN u.id IS NOT NULL THEN 'user'
             ELSE 'unassigned'
           END as assigned_type,
           COALESCE(s.name, u.name) as assigned_name,
           COALESCE(s.email, u.email) as assigned_email,
           0 as days_overdue,
           DATEDIFF(t.due_date, CURDATE()) as days_until_due
         FROM ${this.prefix}tasks t
         JOIN ${this.prefix}events e ON t.event_id = e.id
         LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
         LEFT JOIN ${this.prefix}supporters s ON t.assigned_to = s.id
         LEFT JOIN ${this.prefix}users u ON t.assigned_to = u.id
         WHERE e.club_id = ? 
           AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
           AND t.status != 'done'
         ORDER BY t.due_date ASC`,
        [clubId, days]
      );

      return rows;
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw new Error('Failed to fetch upcoming tasks');
    }
  }

  // Get task statistics for an event
  async getTaskStats(eventId) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT 
           COUNT(*) as total_tasks,
           COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
           COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
           COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
           COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_tasks,
           COUNT(CASE WHEN due_date < CURDATE() AND status != 'done' THEN 1 END) as overdue_tasks
         FROM ${this.prefix}tasks 
         WHERE event_id = ?`,
        [eventId]
      );

      return rows[0];
    } catch (error) {
      console.error('Error fetching task stats:', error);
      throw new Error('Failed to fetch task statistics');
    }
  }

  // Get tasks by status for an event
  async getTasksByStatus(eventId, status) {
    try {
      const validStatuses = ['todo', 'in_progress', 'done'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status filter');
      }

      const [rows] = await database.connection.execute(
        `SELECT 
           t.*,
           e.title as event_title,
           e.club_id,
           c.name as campaign_name,
           s.name as assigned_supporter_name,
           s.email as assigned_supporter_email,
           u.name as assigned_user_name,
           u.email as assigned_user_email,
           CASE 
             WHEN s.id IS NOT NULL THEN 'supporter'
             WHEN u.id IS NOT NULL THEN 'user'
             ELSE 'unassigned'
           END as assigned_type,
           COALESCE(s.name, u.name) as assigned_name,
           COALESCE(s.email, u.email) as assigned_email,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date < CURDATE() AND t.status != 'done'
             THEN DATEDIFF(CURDATE(), t.due_date)
             ELSE 0
           END as days_overdue,
           CASE 
             WHEN t.due_date IS NOT NULL AND t.due_date >= CURDATE()
             THEN DATEDIFF(t.due_date, CURDATE())
             ELSE NULL
           END as days_until_due
         FROM ${this.prefix}tasks t
         JOIN ${this.prefix}events e ON t.event_id = e.id
         LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
         LEFT JOIN ${this.prefix}supporters s ON t.assigned_to = s.id
         LEFT JOIN ${this.prefix}users u ON t.assigned_to = u.id
         WHERE t.event_id = ? AND t.status = ?
         ORDER BY t.created_at ASC`,
        [eventId, status]
      );

      return rows;
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      throw new Error('Failed to fetch tasks by status');
    }
  }

  // Get club-wide task statistics
  async getClubTaskStats(clubId) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT 
           COUNT(*) as total_tasks,
           COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
           COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
           COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
           COUNT(CASE WHEN t.assigned_to IS NOT NULL THEN 1 END) as assigned_tasks,
           COUNT(CASE WHEN t.due_date < CURDATE() AND t.status != 'done' THEN 1 END) as overdue_tasks
         FROM ${this.prefix}tasks t
         JOIN ${this.prefix}events e ON t.event_id = e.id
         WHERE e.club_id = ?`,
        [clubId]
      );

      return rows[0];
    } catch (error) {
      console.error('Error fetching club task stats:', error);
      throw new Error('Failed to fetch club task statistics');
    }
  }

  // Bulk create tasks
  async bulkCreateTasks(eventId, tasks) {
    const connection = database.connection;
    
    try {
      await connection.beginTransaction();

      // Verify event exists and get club_id
      const [eventRows] = await connection.execute(
        `SELECT id, club_id FROM ${this.prefix}events WHERE id = ?`,
        [eventId]
      );

      if (eventRows.length === 0) {
        throw new Error('Event not found');
      }

      const results = {
        successful: [],
        errors: [],
        total_processed: tasks.length,
        successful_count: 0,
        error_count: 0
      };

      for (let i = 0; i < tasks.length; i++) {
        try {
          const task = tasks[i];
          const taskId = uuidv4();

          // Validate task data
          if (!task.title?.trim()) {
            throw new Error(`Task ${i + 1}: Title is required`);
          }

          const validStatuses = ['todo', 'in_progress', 'done'];
          const status = task.status || 'todo';
          if (!validStatuses.includes(status)) {
            throw new Error(`Task ${i + 1}: Invalid status`);
          }

          // Insert task
          await connection.execute(
            `INSERT INTO ${this.prefix}tasks 
             (id, event_id, title, assigned_to, due_date, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              taskId, 
              eventId, 
              task.title.trim(), 
              task.assigned_to || null, 
              task.due_date || null, 
              status
            ]
          );

          // Get created task details
          const createdTask = await this.getTaskById(taskId);
          results.successful.push(createdTask);
          results.successful_count++;

        } catch (error) {
          results.errors.push({
            index: i,
            task: tasks[i],
            error: error.message
          });
          results.error_count++;
        }
      }

      await connection.commit();

      return {
        message: `Bulk create completed: ${results.successful_count} successful, ${results.error_count} failed`,
        result: results
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error bulk creating tasks:', error);
      throw new Error(error.message || 'Failed to bulk create tasks');
    }
  }
}

export default TaskService;