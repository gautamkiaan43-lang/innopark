const pool = require('../config/db');

/**
 * Custom Field Service
 * Centralized logic for handling custom fields across different modules
 */
const customFieldService = {
    /**
     * Get custom fields and their values for a specific record
     * @param {number} companyId 
     * @param {string} module 
     * @param {number} recordId 
     * @returns {Promise<Object>}
     */
    getCustomFieldsWithValues: async (companyId, module, recordId) => {
        try {
            const [customFieldsValues] = await pool.execute(
                `SELECT cf.name, cfv.field_value 
                 FROM custom_field_values cfv
                 JOIN custom_fields cf ON cfv.custom_field_id = cf.id
                 WHERE cfv.record_id = ? AND cfv.module = ? AND cfv.company_id = ?`,
                [recordId, module, companyId]
            );
            
            const customFields = {};
            customFieldsValues.forEach(row => {
                customFields[row.name] = row.field_value;
            });
            return customFields;
        } catch (error) {
            console.error(`Error fetching custom fields for ${module}:`, error);
            return {};
        }
    },

    /**
     * Save custom fields for a specific record
     * @param {number} companyId 
     * @param {string} module 
     * @param {number} recordId 
     * @param {Object} customFields 
     */
    saveCustomFields: async (companyId, module, recordId, customFields) => {
        if (!customFields || typeof customFields !== 'object' || Object.keys(customFields).length === 0) {
            return;
        }

        try {
            for (const [fieldName, fieldValue] of Object.entries(customFields)) {
                // Get field ID by name and module
                const [fieldRow] = await pool.execute(
                    `SELECT id FROM custom_fields WHERE name = ? AND module = ? AND company_id = ?`,
                    [fieldName, module, companyId]
                );
                
                if (fieldRow.length > 0) {
                    const fieldId = fieldRow[0].id;
                    
                    // Check if value already exists
                    const [existingValue] = await pool.execute(
                        `SELECT id FROM custom_field_values WHERE custom_field_id = ? AND record_id = ? AND module = ?`,
                        [fieldId, recordId, module]
                    );

                    if (existingValue.length > 0) {
                        // Update
                        await pool.execute(
                            `UPDATE custom_field_values SET field_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                            [fieldValue !== null && fieldValue !== undefined ? fieldValue.toString() : null, existingValue[0].id]
                        );
                    } else if (fieldValue !== null && fieldValue !== undefined) {
                        // Insert
                        await pool.execute(
                            `INSERT INTO custom_field_values (custom_field_id, record_id, module, field_value, company_id)
                             VALUES (?, ?, ?, ?, ?)`,
                            [fieldId, recordId, module, fieldValue.toString(), companyId]
                        );
                    }
                }
            }
        } catch (error) {
            console.error(`Error saving custom fields for ${module}:`, error);
        }
    }
};

module.exports = customFieldService;
