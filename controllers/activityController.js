const pool = require('../config/db');

/**
 * Get all activities with filtering
 * GET /api/v1/activities
 */
const getAll = async (req, res) => {
    try {
        const { entity_type, entity_id } = req.query;

        let whereClause = 'WHERE a.is_deleted = 0';
        const params = [];

        if (entity_type && entity_id) {
            whereClause += ' AND a.entity_type = ? AND a.entity_id = ?';
            params.push(entity_type, entity_id);
        } else {
            // If absolutely no scoping was provided, restrict to empty array to prevent global leaks
            whereClause += ' AND 1 = 0';
        }

        const [activities] = await pool.execute(
            `SELECT a.*, u.name as creator_name, u2.name as assigned_to_name
       FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN users u2 ON a.assigned_to = u2.id
       ${whereClause}
       ORDER BY a.created_at DESC`,
            params
        );

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_b2bb6964') : "Failed to fetch activities"
        });
    }
};

/**
 * Create a new activity with propagation logic
 * POST /api/v1/activities
 */
const create = async (req, res) => {
    try {
        const { type, description, entity_type, entity_id, assigned_to } = req.body;
        const created_by = req.user?.id || req.body.created_by;

        if (!type || !entity_type || !entity_id) {
            return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_7687f115') : "Missing required fields" });
        }

        if (!created_by) {
            return res.status(400).json({ success: false, error: "Authentication required" });
        }

        // Validate activity type - support: call, meeting, note, email, task, comment
        const validTypes = ['call', 'meeting', 'note', 'email', 'task', 'comment'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid activity type. Allowed types: ${validTypes.join(', ')}`
            });
        }

        // Validate entity_type
        const validEntityTypes = ['lead', 'contact', 'company', 'deal', 'project'];
        if (!validEntityTypes.includes(entity_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid entity type. Allowed types: ${validEntityTypes.join(', ')}`
            });
        }

        let lead_id = null;
        let company_id = null;
        let contact_id = null;
        let deal_id = null;

        if (entity_type === 'deal') {
            deal_id = entity_id;
        } else if (entity_type === 'lead') {
            lead_id = entity_id;
        } else if (entity_type === 'contact') {
            contact_id = entity_id;
        } else if (entity_type === 'company') {
            company_id = entity_id;
        }

        const creatorId = created_by;
        const assigneeId = assigned_to || created_by;

        const [result] = await pool.execute(
            `INSERT INTO activities 
       (type, description, reference_type, reference_id, entity_type, entity_id, lead_id, company_id, contact_id, deal_id, created_by, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, description, entity_type, entity_id, entity_type, entity_id, lead_id, company_id, contact_id, deal_id, creatorId, assigneeId]
        );

        res.json({
            success: true,
            data: { id: result.insertId, type, description, entity_type, entity_id }
        });
    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_bcc5deec') : "Failed to create activity"
        });
    }
};

/**
 * Create activity with optional is_pinned, follow_up_at, meeting_link
 */
const createWithExtras = async (req, res) => {
    try {
        let {
            type, description, reference_type, reference_id,
            entity_type, entity_id,
            is_pinned, follow_up_at, meeting_link,
            title, assigned_to, deadline, meeting_date, meeting_time, participants
        } = req.body;
        const created_by = req.user?.id || req.body.created_by;

        // Normalize type to lowercase if it exists
        if (type) type = type.toLowerCase();

        // Strict entity mapping
        if (!entity_type) entity_type = reference_type;
        if (!entity_id) entity_id = reference_id;

        if (!type || !entity_type || !entity_id) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_63dbcbd9') : "Missing required fields (type, entity_type, entity_id)"
            });
        }

        if (!created_by) {
            return res.status(400).json({
                success: false,
                error: "Authentication required"
            });
        }

        const validTypes = ['call', 'meeting', 'note', 'email', 'task', 'comment'];
        if (!validTypes.includes(type)) {
            // Fallback to 'note' if invalid type but we have description
            if (description) {
                type = 'note';
            } else {
                return res.status(400).json({ success: false, error: `Invalid activity type: ${type}. Allowed: ${validTypes.join(', ')}` });
            }
        }

        const validEntityTypes = ['lead', 'contact', 'company', 'deal', 'project'];
        if (!validEntityTypes.includes(entity_type)) {
            return res.status(400).json({ success: false, error: `Invalid entity type: ${entity_type}. Allowed: ${validEntityTypes.join(', ')}` });
        }

        let lead_id = null, company_id = null, contact_id = null, deal_id = null;
        if (entity_type === 'deal') {
            deal_id = entity_id;
        } else if (entity_type === 'lead') {
            lead_id = entity_id;
        } else if (entity_type === 'contact') {
            contact_id = entity_id;
        } else if (entity_type === 'company') {
            company_id = entity_id;
        }

        const creatorId = created_by;
        let assigneeId = (() => {
            let val = assigned_to;
            if (Array.isArray(val)) val = val[0];
            else if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
                try { const p = JSON.parse(val); if (Array.isArray(p)) val = p[0]; } catch(e) { val = val.replace(/[\[\]]/g, ''); }
            }
            return (val && val !== '') ? val : null;
        })();
        if (!assigneeId) {
            assigneeId = creatorId;
        }

        const pinned = is_pinned ? 1 : 0;
        const [result] = await pool.execute(
            `INSERT INTO activities (
                type, title, description, reference_type, reference_id, 
                entity_type, entity_id,
                lead_id, company_id, contact_id, deal_id, 
                created_by, assigned_to, is_pinned, follow_up_at, 
                deadline, meeting_date, meeting_time, participants, meeting_link
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                type, title && title !== '' ? title : null, description && description !== '' ? description : null, entity_type, entity_id,
                entity_type, entity_id,
                lead_id, company_id, contact_id, deal_id,
                creatorId, assigneeId, pinned, (follow_up_at && follow_up_at !== '') ? follow_up_at : null,
                (deadline && deadline !== '') ? deadline : null, (meeting_date && meeting_date !== '') ? meeting_date : null, (meeting_time && meeting_time !== '') ? meeting_time : null, (participants && participants !== '') ? participants : null, (meeting_link && meeting_link !== '') ? meeting_link : null
            ]
        );

        return res.json({
            success: true,
            data: {
                id: result.insertId,
                type, title, description, entity_type, entity_id,
                is_pinned: !!is_pinned, follow_up_at, deadline, meeting_date, meeting_time, participants, meeting_link
            }
        });
    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_4f1f1680') : "Failed to create activity: " + error.message,
            details: error.sqlMessage || error.code
        });
    }
};

/**
 * Update activity (description, follow_up_at, meeting_link)
 * PATCH /api/v1/activities/:id
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            description, follow_up_at, meeting_link,
            title, assigned_to, deadline, meeting_date, meeting_time, participants,
            is_pinned
        } = req.body;

        const [result] = await pool.execute(
            `UPDATE activities SET 
                description = COALESCE(?, description), 
                title = COALESCE(?, title),
                assigned_to = COALESCE(?, assigned_to),
                deadline = COALESCE(?, deadline),
                meeting_date = COALESCE(?, meeting_date),
                meeting_time = COALESCE(?, meeting_time),
                participants = COALESCE(?, participants),
                follow_up_at = COALESCE(?, follow_up_at), 
                meeting_link = COALESCE(?, meeting_link),
                is_pinned = COALESCE(?, is_pinned)
            WHERE id = ? AND is_deleted = 0`,
            [
                description && description !== '' ? description : null,
                title && title !== '' ? title : null,
                (() => {
                    let val = assigned_to;
                    if (Array.isArray(val)) val = val[0];
                    else if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
                        try { const p = JSON.parse(val); if (Array.isArray(p)) val = p[0]; } catch(e) { val = val.replace(/[\[\]]/g, ''); }
                    }
                    return (val && val !== '') ? val : null;
                })(),
                (deadline && deadline !== '') ? deadline : null,
                (meeting_date && meeting_date !== '') ? meeting_date : null,
                (meeting_time && meeting_time !== '') ? meeting_time : null,
                participants && participants !== '' ? participants : null,
                (follow_up_at && follow_up_at !== '') ? follow_up_at : null,
                (meeting_link && meeting_link !== '') ? meeting_link : null,
                is_pinned !== undefined ? (is_pinned ? 1 : 0) : null,
                id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_b58b3e72') : "Activity not found" });
        res.json({ success: true, data: { id, updated: true } });
    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({ success: false, error: req.t ? req.t('api_msg_fa15b149') : "Failed to update activity" });
    }
};

/**
 * Toggle pin: PATCH /api/v1/activities/:id/pin
 */
const togglePin = async (req, res) => {
    try {
        const { id } = req.params;
        const [col] = await pool.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'is_pinned'`
        );
        if (col.length === 0) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_9c692882') : "is_pinned column not found" });

        const [result] = await pool.execute(
            'UPDATE activities SET is_pinned = IF(is_pinned = 1, 0, 1) WHERE id = ? AND is_deleted = 0',
            [id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_b58b3e72') : "Activity not found" });
        res.json({ success: true, data: { id, pinned: true } });
    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({ success: false, error: req.t ? req.t('api_msg_f4ba9f99') : "Failed to toggle pin" });
    }
};

/**
 * Delete (soft delete) activity: DELETE /api/v1/activities/:id
 */
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute(
            'UPDATE activities SET is_deleted = 1 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                error: req.t ? req.t('api_msg_b58b3e72') : "Activity not found" 
            });
        }

        res.json({ success: true, message: "Activity deleted successfully" });
    } catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({ 
            success: false, 
            error: req.t ? req.t('api_msg_70743b0d') : "Failed to delete activity" 
        });
    }
};

module.exports = {
    getAll,
    create: createWithExtras,
    createLegacy: create,
    update,
    togglePin,
    remove
};
