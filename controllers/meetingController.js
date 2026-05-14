const pool = require('../config/db');

const getAll = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.body.company_id || req.user?.company_id || 1;
        const { assigned_to, date_from, date_to, related_to_type, related_to_id } = req.query;
        const userRole = req.user?.role || 'ADMIN';
        const userId = req.user?.id || null;

        let query = `
            SELECT m.*, 
                   u.name as assigned_to_name, 
                   u.avatar as assigned_to_avatar,
                   c.name as created_by_name
            FROM meetings m
            LEFT JOIN users u ON m.assigned_to = u.id
            LEFT JOIN users c ON m.created_by = c.id
            WHERE m.company_id = ? AND m.is_deleted = 0
        `;
        const params = [companyId];

        // Role-based visibility: Non-admins only see meetings assigned to them
        if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
            query += ' AND m.assigned_to = ?';
            params.push(userId);
        } else if (assigned_to) {
            // Admins can filter by any user
            query += ' AND m.assigned_to = ?';
            params.push(assigned_to);
        }

        if (date_from) {
            query += ' AND m.meeting_date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            query += ' AND m.meeting_date <= ?';
            params.push(date_to);
        }
        if (related_to_type && related_to_id) {
            query += ' AND m.related_to_type = ? AND m.related_to_id = ?';
            params.push(related_to_type, related_to_id);
        }

        query += ' ORDER BY m.meeting_date ASC, m.start_time ASC';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Get meetings error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { title, description, meeting_date, start_time, end_time, location, assigned_to, reminder_datetime, related_to_type, related_to_id } = req.body;
        const companyId = req.body.company_id || req.user?.company_id || 1;
        const createdBy = req.user?.id || 1;

        if (!title || !meeting_date || !start_time || !end_time || !assigned_to) {
            return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_377516fa') : "Title, Date, Start Time, End Time, and Assigned User are required" });
        }

        // Handle assigned_to if it comes as an array [7] or "[7]"
        let finalAssignedTo = assigned_to;
        if (Array.isArray(assigned_to)) {
            finalAssignedTo = assigned_to[0];
        } else if (typeof assigned_to === 'string' && assigned_to.startsWith('[') && assigned_to.endsWith(']')) {
            try {
                const parsed = JSON.parse(assigned_to);
                if (Array.isArray(parsed)) finalAssignedTo = parsed[0];
            } catch (e) {
                finalAssignedTo = parseInt(assigned_to.replace(/[\[\]]/g, ''), 10);
            }
        }
        finalAssignedTo = (finalAssignedTo !== undefined && finalAssignedTo !== null && finalAssignedTo !== '') ? finalAssignedTo : null;


        // Validate time
        if (start_time >= end_time) {
            return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_815d372c') : "End time must be after start time" });
        }

        const [result] = await pool.execute(
            `INSERT INTO meetings (company_id, title, description, meeting_date, start_time, end_time, location, assigned_to, reminder_datetime, related_to_type, related_to_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                title,
                description || null,
                meeting_date,
                start_time,
                end_time,
                location || null,
                finalAssignedTo,
                reminder_datetime || null,
                related_to_type || null,
                related_to_id || null,
                createdBy
            ]
        );

        const newMeetingId = result.insertId;
        const [newMeeting] = await pool.execute('SELECT * FROM meetings WHERE id = ?', [newMeetingId]);

        res.status(201).json({ success: true, data: newMeeting[0], message: req.t ? req.t('api_msg_2f14f1d6') : "Meeting created successfully" });
    } catch (err) {
        console.error('Create meeting error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowed = ['title', 'description', 'meeting_date', 'start_time', 'end_time', 'location', 'assigned_to', 'reminder_datetime', 'related_to_type', 'related_to_id'];

        const fields = [];
        const values = [];

        // Time validation if both provided or merged
        // For simplicity, if start/end time are updated, we trust frontend or perform simple check if both exist in updates
        if (updates.start_time && updates.end_time && updates.start_time >= updates.end_time) {
            return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_815d372c') : "End time must be after start time" });
        }

        for (const key of Object.keys(updates)) {
            if (allowed.includes(key) && updates[key] !== undefined) {
                let value = updates[key];
                
                // Handle assigned_to array if updating
                if (key === 'assigned_to') {
                    if (Array.isArray(value)) {
                        value = value[0];
                    } else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
                        try {
                            const parsed = JSON.parse(value);
                            if (Array.isArray(parsed)) value = parsed[0];
                        } catch (e) {
                            value = parseInt(value.replace(/[\[\]]/g, ''), 10);
                        }
                    }
                    value = (value !== '' && value !== null) ? value : null;
                }

                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e9f00744') : "No valid fields to update" });

        values.push(id);

        await pool.execute(`UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`, values);

        const [updatedMeeting] = await pool.execute('SELECT * FROM meetings WHERE id = ?', [id]);
        res.json({ success: true, data: updatedMeeting[0], message: req.t ? req.t('api_msg_91d35b28') : "Meeting updated successfully" });
    } catch (err) {
        console.error('Update meeting error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('UPDATE meetings SET is_deleted = 1 WHERE id = ?', [id]);
        res.json({ success: true, data: { id, deleted: true } });
    } catch (err) {
        console.error('Delete meeting error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getAll, create, update, remove };
