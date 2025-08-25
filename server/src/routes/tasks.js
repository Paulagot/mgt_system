import express from 'express';
import TaskService from '../services/TaskServices.js'; // FIXED: Added .js extension
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';

const router = express.Router();
const taskService = new TaskService();

// Helper function to check if user can manage tasks
const canManageTasks = (userRole) => {
    return ['host', 'admin', 'communications'].includes(userRole);
};

// Create task for event
router.post('/events/:eventId/tasks', 
    authenticateToken, 
    validateRequired(['title']), 
    async (req, res) => {
        try {
            const { eventId } = req.params;
            const { title, assigned_to, due_date, status } = req.body;

            // Check if user has permission to manage tasks
            if (!canManageTasks(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to create tasks' });
            }

            const task = await taskService.createTask(eventId, { 
                title, 
                assigned_to, 
                due_date, 
                status 
            });

            // Emit socket event if socket manager is available
            try {
                const socketManager = req.app.get('socketManager');
                if (socketManager) {
                    socketManager.emitToClub(req.club_id, 'task_created', { task });
                }
            } catch (socketError) {
                console.log('Socket emission failed:', socketError.message);
            }

            res.status(201).json({
                message: 'Task created successfully',
                task
            });
        } catch (error) {
            console.error('Error creating task:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

// Get all tasks for an event
router.get('/events/:eventId/tasks', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;

        const tasks = await taskService.getTasksByEvent(eventId);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific task by ID
router.get('/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await taskService.getTaskById(taskId);

        // Verify user has access to this club
        if (task.club_id !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this task' });
        }

        res.json({ task });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(404).json({ error: error.message });
    }
});

// Update task
router.put('/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const updateData = req.body;

        // Check if user has permission to manage tasks
        if (!canManageTasks(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to update tasks' });
        }

        // Verify task belongs to user's club
        const currentTask = await taskService.getTaskById(taskId);
        
        if (currentTask.club_id !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to update this task' });
        }

        const task = await taskService.updateTask(taskId, updateData);

        // Emit socket event if socket manager is available
        try {
            const socketManager = req.app.get('socketManager');
            if (socketManager) {
                socketManager.emitToClub(req.club_id, 'task_updated', { task });
            }
        } catch (socketError) {
            console.log('Socket emission failed:', socketError.message);
        }

        res.json({
            message: 'Task updated successfully',
            task
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete task
router.delete('/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;

        // Check if user has permission to manage tasks
        if (!canManageTasks(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to delete tasks' });
        }

        // Verify task belongs to user's club
        const currentTask = await taskService.getTaskById(taskId);
        
        if (currentTask.club_id !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to delete this task' });
        }

        const result = await taskService.deleteTask(taskId);

        // Emit socket event if socket manager is available
        try {
            const socketManager = req.app.get('socketManager');
            if (socketManager) {
                socketManager.emitToClub(req.club_id, 'task_deleted', { taskId });
            }
        } catch (socketError) {
            console.log('Socket emission failed:', socketError.message);
        }

        res.json(result);
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update task status only
router.put('/tasks/:taskId/status', 
    authenticateToken, 
    validateRequired(['status']), 
    async (req, res) => {
        try {
            const { taskId } = req.params;
            const { status } = req.body;

            // Users can update status of their own tasks, or managers can update any task
            const currentTask = await taskService.getTaskById(taskId);
            
            if (currentTask.club_id !== req.club_id) {
                return res.status(403).json({ error: 'Not authorized to update this task' });
            }

            // Allow task assignee or managers to update status
            const canUpdate = canManageTasks(req.user.role) || 
                            currentTask.assigned_to === req.user.id;

            if (!canUpdate) {
                return res.status(403).json({ error: 'Insufficient permissions to update task status' });
            }

            const task = await taskService.updateTaskStatus(taskId, status);

            // Emit socket event if socket manager is available
            try {
                const socketManager = req.app.get('socketManager');
                if (socketManager) {
                    socketManager.emitToClub(req.club_id, 'task_status_updated', { task });
                }
            } catch (socketError) {
                console.log('Socket emission failed:', socketError.message);
            }

            res.json({
                message: 'Task status updated successfully',
                task
            });
        } catch (error) {
            console.error('Error updating task status:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

// Get tasks assigned to a specific user/supporter
router.get('/supporters/:supporterId/tasks', authenticateToken, async (req, res) => {
    try {
        const { supporterId } = req.params;

        const tasks = await taskService.getTasksByUser(supporterId);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks by user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get tasks assigned to current user
router.get('/users/:userId/tasks', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user can access these tasks
        if (userId !== req.user.id && !canManageTasks(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized to view these tasks' });
        }

        const tasks = await taskService.getTasksByUser(userId);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get overdue tasks for club
router.get('/clubs/:clubId/tasks/overdue', authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const tasks = await taskService.getOverdueTasks(clubId);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching overdue tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get upcoming tasks for club
router.get('/clubs/:clubId/tasks/upcoming', authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.params;
        const days = parseInt(req.query.days) || 7;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const tasks = await taskService.getUpcomingTasks(clubId, days);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching upcoming tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get task statistics for an event
router.get('/events/:eventId/tasks/stats', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;

        const stats = await taskService.getTaskStats(eventId);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching task statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get tasks by status for an event
router.get('/events/:eventId/tasks/status/:status', authenticateToken, async (req, res) => {
    try {
        const { eventId, status } = req.params;

        const tasks = await taskService.getTasksByStatus(eventId, status);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks by status:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get club-wide task statistics
router.get('/clubs/:clubId/tasks/stats', authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const stats = await taskService.getClubTaskStats(clubId);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching club task statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk create tasks
router.post('/events/:eventId/tasks/bulk', 
    authenticateToken, 
    validateRequired(['tasks']), 
    async (req, res) => {
        try {
            const { eventId } = req.params;
            const { tasks } = req.body;

            // Check if user has permission to manage tasks
            if (!canManageTasks(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to create tasks' });
            }

            if (!Array.isArray(tasks) || tasks.length === 0) {
                return res.status(400).json({ error: 'Tasks must be a non-empty array' });
            }

            const result = await taskService.bulkCreateTasks(eventId, tasks);

            // Emit socket event if socket manager is available
            try {
                const socketManager = req.app.get('socketManager');
                if (socketManager) {
                    socketManager.emitToClub(req.club_id, 'tasks_bulk_created', result);
                }
            } catch (socketError) {
                console.log('Socket emission failed:', socketError.message);
            }

            res.status(201).json(result);
        } catch (error) {
            console.error('Error bulk creating tasks:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

export default router;