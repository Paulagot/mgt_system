
//server/src/routes/prizeRoutes.js (FIXED - removed sockets, corrected import)
import express from 'express';
import PrizeService from './../services/PrizeServices.js'; // FIXED: Correct filename
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';

const router = express.Router();
const prizeService = new PrizeService();

// Helper function to check if user can manage prizes
const canManagePrizes = (userRole) => {
    return ['host', 'admin', 'treasurer'].includes(userRole);
};

// Create prize for event
router.post('/events/:eventId/prizes', 
    authenticateToken, 
    validateRequired(['name']), 
    async (req, res) => {
        try {
            const { eventId } = req.params;
            const { name, value, donated_by } = req.body;

            // Check if user has permission to manage prizes
            if (!canManagePrizes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to create prizes' });
            }

            const prize = await prizeService.createPrize(eventId, { 
                name, 
                value: value || 0, 
                donated_by 
            });

            res.status(201).json({
                message: 'Prize created successfully',
                prize
            });
        } catch (error) {
            console.error('Error creating prize:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

// Get all prizes for an event
router.get('/events/:eventId/prizes', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const prizes = await prizeService.getPrizesByEvent(eventId);
        res.json({ prizes });
    } catch (error) {
        console.error('Error fetching prizes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific prize for an event
router.get('/events/:eventId/prizes/:prizeId', authenticateToken, async (req, res) => {
    try {
        const { eventId, prizeId } = req.params;
        const prize = await prizeService.getPrizeById(prizeId);

        // Verify prize belongs to the specified event
        if (prize.event_id !== eventId) {
            return res.status(404).json({ error: 'Prize not found for this event' });
        }

        // Verify user has access to this club
        if (prize.club_id !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this prize' });
        }

        res.json({ prize });
    } catch (error) {
        console.error('Error fetching prize:', error);
        res.status(404).json({ error: error.message });
    }
});

// Update prize
router.put('/events/:eventId/prizes/:prizeId', authenticateToken, async (req, res) => {
    try {
        const { eventId, prizeId } = req.params;
        const updateData = req.body;

        // Check if user has permission to manage prizes
        if (!canManagePrizes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to update prizes' });
        }

        // Verify prize belongs to the event and user's club
        const currentPrize = await prizeService.getPrizeById(prizeId);
        
        if (currentPrize.event_id !== eventId) {
            return res.status(404).json({ error: 'Prize not found for this event' });
        }

        if (currentPrize.club_id !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to update this prize' });
        }

        const prize = await prizeService.updatePrize(prizeId, updateData);

        res.json({
            message: 'Prize updated successfully',
            prize
        });
    } catch (error) {
        console.error('Error updating prize:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete prize
router.delete('/events/:eventId/prizes/:prizeId', authenticateToken, async (req, res) => {
    try {
        const { eventId, prizeId } = req.params;

        // Check if user has permission to manage prizes
        if (!canManagePrizes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to delete prizes' });
        }

        // Verify prize belongs to the event and user's club
        const currentPrize = await prizeService.getPrizeById(prizeId);
        
        if (currentPrize.event_id !== eventId) {
            return res.status(404).json({ error: 'Prize not found for this event' });
        }

        if (currentPrize.club_id !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to delete this prize' });
        }

        const result = await prizeService.deletePrize(prizeId);
        res.json(result);
    } catch (error) {
        console.error('Error deleting prize:', error);
        res.status(400).json({ error: error.message });
    }
});

// Confirm prize donation
router.post('/prizes/:prizeId/confirm', authenticateToken, async (req, res) => {
    try {
        const { prizeId } = req.params;

        // Check if user has permission to manage prizes
        if (!canManagePrizes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to confirm prizes' });
        }

        // Verify prize belongs to user's club
        const currentPrize = await prizeService.getPrizeById(prizeId);
        
        if (currentPrize.club_id !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to confirm this prize' });
        }

        const prize = await prizeService.confirmPrizeDonation(prizeId);

        res.json({
            message: 'Prize donation confirmed successfully',
            prize
        });
    } catch (error) {
        console.error('Error confirming prize donation:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get prizes by donor (supporter)
router.get('/supporters/:supporterId/prizes', authenticateToken, async (req, res) => {
    try {
        const { supporterId } = req.params;
        const prizes = await prizeService.getPrizesByDonor(supporterId);

        // Filter prizes to only show those from user's club (done in service)
        res.json({ prizes });
    } catch (error) {
        console.error('Error fetching prizes by donor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get prize statistics for an event
router.get('/events/:eventId/prizes/stats', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const stats = await prizeService.getPrizeStats(eventId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching prize statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get prizes by confirmation status
router.get('/events/:eventId/prizes/status/:status', authenticateToken, async (req, res) => {
    try {
        const { eventId, status } = req.params;

        // Convert status string to boolean
        let confirmed = null;
        if (status === 'confirmed') {
            confirmed = true;
        } else if (status === 'unconfirmed') {
            confirmed = false;
        }

        const prizes = await prizeService.getPrizesByStatus(eventId, confirmed);
        res.json({ prizes });
    } catch (error) {
        console.error('Error fetching prizes by status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get club-wide prize statistics
router.get('/clubs/:clubId/prizes/stats', authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.params;

        // Verify club ownership
        if (clubId !== req.club_id) {
            return res.status(403).json({ error: 'Not authorized to access this club' });
        }

        const stats = await prizeService.getClubPrizeValue(clubId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching club prize statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk create prizes
router.post('/events/:eventId/prizes/bulk', 
    authenticateToken, 
    validateRequired(['prizes']), 
    async (req, res) => {
        try {
            const { eventId } = req.params;
            const { prizes } = req.body;

            // Check if user has permission to manage prizes
            if (!canManagePrizes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to create prizes' });
            }

            if (!Array.isArray(prizes) || prizes.length === 0) {
                return res.status(400).json({ error: 'Prizes must be a non-empty array' });
            }

            const result = await prizeService.bulkCreatePrizes(eventId, prizes);
            res.status(201).json(result);
        } catch (error) {
            console.error('Error bulk creating prizes:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

export default router;