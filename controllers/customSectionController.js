const pool = require('../config/db');

/**
 * Get all custom sections
 * GET /api/v1/custom-sections
 */
const getAll = async (req, res) => {
    try {
        const { module } = req.query;
        const companyId = req.companyId || req.query.company_id || req.body.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
            });
        }

        let query = `SELECT * FROM custom_sections WHERE company_id = ?`;
        const params = [companyId];

        if (module) {
            query += ' AND module_name = ?';
            params.push(module);
        }

        query += ' ORDER BY id ASC';

        const [sections] = await pool.execute(query, params);

        res.json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error('Get custom sections error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_e43162da') : "Failed to fetch custom sections"
        });
    }
};

/**
 * Get custom section by ID
 * GET /api/v1/custom-sections/:id
 */
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: "company_id is required"
            });
        }

        const [sections] = await pool.execute(
            'SELECT * FROM custom_sections WHERE id = ? AND company_id = ?',
            [id, companyId]
        );

        if (sections.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Custom section not found"
            });
        }

        res.json({
            success: true,
            data: sections[0]
        });
    } catch (error) {
        console.error('Get custom section error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch custom section"
        });
    }
};

/**
 * Create custom section
 * POST /api/v1/custom-sections
 */
const create = async (req, res) => {
    try {
        const { module_name, section_name } = req.body;
        const companyId = req.companyId || req.body.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: "company_id is required"
            });
        }

        if (!module_name || !section_name || !section_name.trim()) {
            return res.status(400).json({
                success: false,
                error: "module_name and section_name are required"
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO custom_sections (company_id, module_name, section_name) VALUES (?, ?, ?)`,
            [companyId, module_name, section_name.trim()]
        );

        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                company_id: companyId,
                module_name,
                section_name: section_name.trim()
            },
            message: "Custom section created successfully"
        });
    } catch (error) {
        console.error('Create custom section error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to create custom section"
        });
    }
};

/**
 * Update custom section
 * PUT /api/v1/custom-sections/:id
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { section_name } = req.body;
        const companyId = req.companyId || req.body.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: "company_id is required"
            });
        }

        if (!section_name || !section_name.trim()) {
            return res.status(400).json({
                success: false,
                error: "section_name is required"
            });
        }

        const [result] = await pool.execute(
            `UPDATE custom_sections SET section_name = ? WHERE id = ? AND company_id = ?`,
            [section_name.trim(), id, companyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Custom section not found or unauthorized"
            });
        }

        res.json({
            success: true,
            message: "Custom section updated successfully"
        });
    } catch (error) {
        console.error('Update custom section error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to update custom section"
        });
    }
};

/**
 * Delete custom section
 * DELETE /api/v1/custom-sections/:id
 */
const deleteSection = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.query.company_id || req.body.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: "company_id is required"
            });
        }

        // Perform DELETE on custom_sections (associated fields will set section_id to NULL due to ON DELETE SET NULL constraint)
        const [result] = await pool.execute(
            `DELETE FROM custom_sections WHERE id = ? AND company_id = ?`,
            [id, companyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Custom section not found or unauthorized"
            });
        }

        res.json({
            success: true,
            message: "Custom section deleted successfully"
        });
    } catch (error) {
        console.error('Delete custom section error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to delete custom section"
        });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    deleteSection
};
