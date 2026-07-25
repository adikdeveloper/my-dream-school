const express = require('express');
const router = express.Router();
const Lead = require('../../models/communication/Lead');
const { auth, authorize } = require('../../middleware/auth'); // Ensure auth middleware
const { requirePermission } = require('../../middleware/permissions');

// Get all leads
router.get('/', auth, authorize('admin', 'director', 'supervisor', 'reception', 'callcenter'), requirePermission('lead.view'), async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        console.error('Error fetching leads:', err);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Webhook for Instagram/Facebook Leads (e.g. via Zapier/Make)
// Endpoint: POST /api/communication/leads/webhook/instagram?secret=YOUR_SECRET
router.post('/webhook/instagram', async (req, res) => {
    try {
        // Simple security check using query parameter
        const expectedSecret = process.env.WEBHOOK_SECRET || 'dream_school_secret_2026';
        if (req.query.secret !== expectedSecret) {
            return res.status(401).json({ message: 'Ruxsat etilmagan (Unauthorized)' });
        }

        const { firstName, lastName, phone, notes, course } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Telefon raqam kiritilishi shart' });
        }

        const newLead = new Lead({
            firstName: firstName || 'Instagram',
            lastName: lastName || 'Mijozi',
            phone: phone,
            source: 'Instagram',
            status: 'Yangi',
            notes: notes || 'Instagram Target orqali kelgan',
            interestedCourse: course || ''
        });

        await newLead.save();
        res.status(201).json({ success: true, lead: newLead });
    } catch (err) {
        console.error('Error in Instagram webhook:', err);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Create lead
router.post('/', auth, authorize('admin', 'director', 'supervisor', 'reception', 'callcenter'), requirePermission('lead.manage'), async (req, res) => {
    try {
        const newLead = new Lead(req.body);
        await newLead.save();
        res.status(201).json(newLead);
    } catch (err) {
        console.error('Error creating lead:', err);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Update lead
router.put('/:id', auth, authorize('admin', 'director', 'supervisor', 'reception', 'callcenter'), requirePermission('lead.manage'), async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!lead) return res.status(404).json({ message: 'Lid topilmadi' });
        res.json(lead);
    } catch (err) {
        console.error('Error updating lead:', err);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Delete lead
router.delete('/:id', auth, authorize('admin', 'director', 'supervisor', 'reception', 'callcenter'), requirePermission('lead.manage'), async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lid topilmadi' });
        res.json({ message: 'Lid o\'chirildi' });
    } catch (err) {
        console.error('Error deleting lead:', err);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
