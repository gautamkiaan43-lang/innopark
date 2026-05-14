// =====================================================
// Contact Controller
// =====================================================
// Purpose: Manage individual contacts (people) separately from companies
// Contacts represent only individuals, not organizations
// =====================================================

const pool = require('../config/db');
const customFieldService = require('../services/customFieldService');

/**
 * Get all contacts
 * GET /api/v1/contacts
 */
const getAll = async (req, res) => {
    try {
        const { status, search, client_id } = req.query;
        const companyId = req.companyId || req.query.company_id || null;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
            });
        }

        let whereClause = 'WHERE c.is_deleted = 0 AND c.company_id = ?';
        const params = [companyId];

        if (status) {
            whereClause += ' AND c.status = ?';
            params.push(status);
        }

        if (client_id) {
            whereClause += ' AND c.client_id = ?';
            params.push(client_id);
        }

        if (search) {
            whereClause += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const [contacts] = await pool.execute(
            `SELECT c.*, 
              cl.company_name as linked_company_name,
              cl.type as company_type,
              u.name as assigned_user_name
       FROM contacts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.assigned_user_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC`,
            params
        );

        // Get activities count for each contact
        for (let contact of contacts) {
            const [activityCount] = await pool.execute(
                `SELECT COUNT(*) as count FROM activities 
         WHERE reference_type = 'contact' AND reference_id = ? AND is_deleted = 0`,
                [contact.id]
            );
            contact.activities_count = activityCount[0].count;
            contact.custom_fields = await customFieldService.getCustomFieldsWithValues(companyId, 'Contacts', contact.id);
        }

        res.json({
            success: true,
            data: contacts
        });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_b4210ea5') : "Failed to fetch contacts"
        });
    }
};

/**
 * Get contact by ID with activities
 * GET /api/v1/contacts/:id
 */
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.query.company_id || req.body.company_id || req.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
            });
        }

        // Get contact with linked company details
        const [contacts] = await pool.execute(
            `SELECT c.*, 
              cl.company_name as linked_company_name,
              cl.address as company_address,
              cl.city as company_city,
              cl.state as company_state,
              cl.zip as company_zip,
              cl.country as company_country,
              cl.phone_number as company_phone,
              cl.website as company_website,
              cl.type as company_type,
              u.name as assigned_user_name
       FROM contacts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.assigned_user_id = u.id
       WHERE c.id = ? AND c.company_id = ? AND c.is_deleted = 0`,
            [id, companyId]
        );

        if (contacts.length === 0) {
            return res.status(404).json({
                success: false,
                error: req.t ? req.t('api_msg_cf2e6f36') : "Contact not found"
            });
        }

        const contact = contacts[0];

        // Get activities for this contact
        const [activities] = await pool.execute(
            `SELECT a.*, u.name as created_by_name
       FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.reference_type = 'contact' AND a.reference_id = ? AND a.is_deleted = 0
       ORDER BY a.created_at DESC`,
            [id]
        );
        contact.activities = activities;

        // Get deals associated with this contact
        const [deals] = await pool.execute(
            `SELECT d.*, dc.role as contact_role
       FROM deals d
       INNER JOIN deal_contacts dc ON d.id = dc.deal_id
       WHERE dc.contact_id = ? AND d.is_deleted = 0
       ORDER BY d.created_at DESC`,
            [id]
        );
        contact.deals = deals;

        // Get custom fields using service
        contact.custom_fields = await customFieldService.getCustomFieldsWithValues(companyId, 'Contacts', id);

        res.json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Get contact error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_fd698b2f') : "Failed to fetch contact"
        });
    }
};

/**
 * Create contact
 * POST /api/v1/contacts
 */
const create = async (req, res) => {
    try {
        const {
            name, company, email, phone, mobile, job_title, department,
            address, city, state, zip, country, client_id, lead_id,
            assigned_user_id, status, notes, is_primary, custom_fields = {}
        } = req.body;

        const companyId = req.companyId || req.body.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
            });
        }

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_f7b1f8b2') : "name and email are required"
            });
        }

        // Helper to sanitize Foreign Keys (convert '', '0', 0, undefined to NULL)
        const sanitizeId = (id) => {
            if (!id) return null;
            const parsed = parseInt(id, 10);
            return isNaN(parsed) || parsed <= 0 ? null : parsed;
        };

        const safeCompanyId = sanitizeId(companyId); // Should be strictly validated, but for now sanitize
        const safeClientId = sanitizeId(client_id);
        const safeLeadId = sanitizeId(lead_id);
        const safeAssignedUserId = sanitizeId(assigned_user_id);

        if (!safeCompanyId) {
            return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_05c8aa13') : "Valid company_id is required" });
        }

        // Insert contact (no contact_type field - contacts are only individuals)
        // Ensure NO undefined values are passed to the query
        const [result] = await pool.execute(
            `INSERT INTO contacts (
        company_id, client_id, lead_id, name, company, email, phone, mobile,
        job_title, department, address, city, state, zip, country,
        assigned_user_id, status, notes, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                safeCompanyId,
                safeClientId,
                safeLeadId,
                name,
                company || null,
                email,
                phone || null,
                mobile || null,
                job_title || null,
                department || null,
                address || null,
                city || null,
                state || null,
                zip || null,
                country || null,
                safeAssignedUserId,
                status || 'Active',
                notes || null,
                is_primary || 0
            ]
        );

        const contactId = result.insertId;

        // Save custom fields using service
        await customFieldService.saveCustomFields(companyId, 'Contacts', contactId, custom_fields);

        // Get created contact
        const [contacts] = await pool.execute(
            `SELECT c.*, cl.company_name as linked_company_name
       FROM contacts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.id = ?`,
            [contactId]
        );

        res.status(201).json({
            success: true,
            data: contacts[0],
            message: req.t ? req.t('api_msg_934218ea') : "Contact created successfully"
        });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_2f5b47d9') : "Failed to create contact: " + error.message,
            details: error.sqlMessage || error.code
        });
    }
};

/**
 * Update contact
 * PUT /api/v1/contacts/:id
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        const companyId = parseInt(req.companyId || req.query.company_id || req.body.company_id || 0, 10);

        if (!companyId || isNaN(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_6e973484') : "company_id is required and must be a valid positive number"
            });
        }

        // Check if contact exists
        const [contacts] = await pool.execute(
            `SELECT id FROM contacts WHERE id = ? AND company_id = ? AND is_deleted = 0`,
            [id, companyId]
        );

        if (contacts.length === 0) {
            return res.status(404).json({
                success: false,
                error: req.t ? req.t('api_msg_cf2e6f36') : "Contact not found"
            });
        }

        // Build update query
        const allowedFields = [
            'name', 'company', 'email', 'phone', 'mobile', 'job_title', 'department',
            'address', 'city', 'state', 'zip', 'country', 'client_id', 'lead_id',
            'assigned_user_id', 'status', 'notes', 'is_primary'
        ];

        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (updateFields.hasOwnProperty(field)) {
                updates.push(`${field} = ?`);
                values.push(updateFields[field]);
            }
        }

        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id, companyId);

            await pool.execute(
                `UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`,
                values
            );
        }

        // Save custom fields using service
        if (updateFields.custom_fields) {
            await customFieldService.saveCustomFields(companyId, 'Contacts', id, updateFields.custom_fields);
        }

        // Get updated contact
        const [updatedContacts] = await pool.execute(
            `SELECT c.*, cl.company_name as linked_company_name
       FROM contacts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.id = ?`,
            [id]
        );

        res.json({
            success: true,
            data: updatedContacts[0],
            message: req.t ? req.t('api_msg_074ac100') : "Contact updated successfully"
        });
    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_43e33276') : "Failed to update contact"
        });
    }
};

/**
 * Delete contact (soft delete)
 * DELETE /api/v1/contacts/:id
 */
const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = parseInt(req.companyId || req.query.company_id || req.body.company_id || 0, 10);

        if (!companyId || isNaN(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_6e973484') : "company_id is required and must be a valid positive number"
            });
        }

        const [result] = await pool.execute(
            `UPDATE contacts SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
            [id, companyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: req.t ? req.t('api_msg_cf2e6f36') : "Contact not found"
            });
        }

        res.json({
            success: true,
            message: req.t ? req.t('api_msg_14ac9d19') : "Contact deleted successfully"
        });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_a26d94b3') : "Failed to delete contact"
        });
    }
};

/**
 * Get contact activities
 * GET /api/v1/contacts/:id/activities
 */
const getActivities = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query;

        let whereClause = 'WHERE reference_type = ? AND reference_id = ? AND is_deleted = 0';
        const params = ['contact', id];

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        const [activities] = await pool.execute(
            `SELECT a.*, u.name as created_by_name
       FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       ${whereClause}
       ORDER BY a.created_at DESC`,
            params
        );

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Get contact activities error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_b2bb6964') : "Failed to fetch activities"
        });
    }
};

/**
 * Add activity to contact
 * POST /api/v1/contacts/:id/activities
 */
const addActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, description, follow_up_at, meeting_link, is_pinned } = req.body;
        const companyId = req.companyId || req.body.company_id || req.query.company_id;
        const userId = req.userId;

        if (!type || !description) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_93c21665') : "type and description are required"
            });
        }

        // Insert activity
        const [result] = await pool.execute(
            `INSERT INTO activities (
        type, description, reference_type, reference_id, contact_id,
        company_id, created_by, follow_up_at, meeting_link, is_pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                type, description, 'contact', id, id, companyId, userId,
                follow_up_at || null, meeting_link || null, is_pinned || 0
            ]
        );

        res.status(201).json({
            success: true,
            data: { id: result.insertId },
            message: req.t ? req.t('api_msg_cdef6d1c') : "Activity added successfully"
        });
    } catch (error) {
        console.error('Add activity error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_c761316c') : "Failed to add activity"
        });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    deleteContact,
    getActivities,
    addActivity
};
