// =====================================================
// Credit Note Controller
// =====================================================

const pool = require('../config/db');

/**
 * Generate unique credit note number
 */
const generateCreditNoteNumber = async (companyId) => {
  try {
    // Use MAX to find the highest number across ALL credit notes (not just company)
    const [result] = await pool.execute(
      `SELECT MAX(CAST(SUBSTRING(credit_note_number, 4) AS UNSIGNED)) as max_num 
       FROM credit_notes 
       WHERE credit_note_number LIKE 'CN#%'`
    );
    
    const nextNum = (result[0].max_num || 0) + 1;
    const creditNoteNumber = `CN#${String(nextNum).padStart(3, '0')}`;
    
    // Double-check this number doesn't exist
    const [existing] = await pool.execute(
      `SELECT id FROM credit_notes WHERE credit_note_number = ?`,
      [creditNoteNumber]
    );
    
    if (existing.length > 0) {
      // If exists, use timestamp-based unique number
      const timestamp = Date.now().toString().slice(-6);
      return `CN#${timestamp}`;
    }
    
    return creditNoteNumber;
  } catch (error) {
    console.error('Error generating credit note number:', error);
    // Fallback: Use timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6);
    return `CN#${timestamp}`;
  }
};

/**
 * Get all credit notes
 * GET /api/v1/credit-notes
 */
const getAll = async (req, res) => {
  try {
    const filterCompanyId = req.query.company_id || req.body.company_id || 1;
    const status = req.query.status;
    const invoiceId = req.query.invoice_id;
    const clientId = req.query.client_id;

    let whereClause = 'WHERE cn.is_deleted = 0';
    const params = [];

    if (filterCompanyId) {
      whereClause += ' AND cn.company_id = ?';
      params.push(filterCompanyId);
    }

    if (status && status !== 'All') {
      whereClause += ' AND cn.status = ?';
      params.push(status);
    }

    if (invoiceId) {
      whereClause += ' AND cn.invoice_id = ?';
      params.push(invoiceId);
    }

    if (clientId) {
      whereClause += ' AND i.client_id = ?';
      params.push(clientId);
    }

    const [creditNotes] = await pool.execute(
      `SELECT cn.*, 
              i.invoice_number,
              COALESCE(cn.client_id, i.client_id) as client_id,
              COALESCE(c.company_name, ci.company_name) as client_name,
              u.name as created_by_name
       FROM credit_notes cn
       LEFT JOIN invoices i ON cn.invoice_id = i.id
       LEFT JOIN clients c ON cn.client_id = c.id
       LEFT JOIN clients ci ON i.client_id = ci.id
       LEFT JOIN users u ON cn.created_by = u.id
       ${whereClause}
       ORDER BY cn.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: creditNotes
    });
  } catch (error) {
    console.error('Get credit notes error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_090e5c9a') : "Failed to fetch credit notes"
    });
  }
};

/**
 * Get credit note by ID
 * GET /api/v1/credit-notes/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [creditNotes] = await pool.execute(
      `SELECT cn.*, 
              i.invoice_number,
              i.client_id,
              c.company_name as client_name,
              u.name as created_by_name
       FROM credit_notes cn
       LEFT JOIN invoices i ON cn.invoice_id = i.id
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON cn.created_by = u.id
       WHERE cn.id = ? AND cn.company_id = ? AND cn.is_deleted = 0`,
      [id, req.companyId]
    );

    if (creditNotes.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_b782f1f2') : "Credit note not found"
      });
    }

    res.json({
      success: true,
      data: creditNotes[0]
    });
  } catch (error) {
    console.error('Get credit note error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_0bea56bb') : "Failed to fetch credit note"
    });
  }
};

/**
 * Create credit note
 * POST /api/v1/credit-notes
 */
const create = async (req, res) => {
  try {
    const {
      invoice_id,
      amount,
      date,
      reason,
      status = 'Pending'
    } = req.body;

    // Removed required validations - allow empty data
    const companyId = req.body.company_id || req.query.company_id || req.companyId || 1;
    
    // Generate credit note number
    const creditNoteNumber = await generateCreditNoteNumber(companyId);
    
    // Verify invoice exists if invoice_id is provided (optional)
    let invoice = null;
    if (invoice_id) {
      const [invoices] = await pool.execute(
        `SELECT id, client_id, total, unpaid FROM invoices 
         WHERE id = ? AND is_deleted = 0`,
        [invoice_id]
      );
      if (invoices.length > 0) {
        invoice = invoices[0];
      }
    }

    // Insert credit note
    const clientId = req.body.client_id || null;
    const [result] = await pool.execute(
      `INSERT INTO credit_notes (
        company_id, credit_note_number, client_id, invoice_id, amount, date, reason, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        creditNoteNumber,
        clientId,
        invoice_id || null,
        amount ? parseFloat(amount) : null,
        date || null,
        reason || null,
        status || 'Pending',
        req.userId || req.body.user_id || 1
      ]
    );

    // If status is Applied and invoice_id and amount are provided, update invoice unpaid amount
    if (status === 'Applied' && invoice_id && amount) {
      try {
        await pool.execute(
          `UPDATE invoices SET
            unpaid = GREATEST(0, COALESCE(unpaid, total) - ?),
            status = CASE
              WHEN COALESCE(unpaid, total) - ? <= 0 THEN 'Paid'
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [amount, amount, invoice_id]
        );
      } catch (err) {
        console.warn('Error updating invoice amounts:', err.message);
        // Don't fail credit note creation if invoice update fails
      }
    }

    res.status(201).json({
      success: true,
      data: { id: result.insertId, credit_note_number: creditNoteNumber },
      message: req.t ? req.t('api_msg_bf3c4bbd') : "Credit note created successfully"
    });
  } catch (error) {
    console.error('Create credit note error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create credit note'
    });
  }
};

/**
 * Update credit note
 * PUT /api/v1/credit-notes/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, invoice_id, amount, date, reason, status } = req.body;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    // Check if credit note exists
    const [creditNotes] = await pool.execute(
      `SELECT * FROM credit_notes WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (creditNotes.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_b782f1f2') : "Credit note not found"
      });
    }

    const oldCreditNote = creditNotes[0];
    const updates = [];
    const values = [];

    if (client_id !== undefined) {
      updates.push('client_id = ?');
      values.push(client_id || null);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      values.push(amount ? parseFloat(amount) : null);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date || null);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      values.push(reason || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status || 'Pending');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await pool.execute(
      `UPDATE credit_notes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Handle status change to Applied
    if (status === 'Applied' && oldCreditNote.status !== 'Applied') {
      await pool.execute(
        `UPDATE invoices SET
          unpaid = GREATEST(0, unpaid - ?),
          status = CASE
            WHEN unpaid - ? <= 0 THEN 'Paid'
            ELSE status
          END,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [amount || oldCreditNote.amount, amount || oldCreditNote.amount, oldCreditNote.invoice_id]
      );
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_6f3a9df3') : "Credit note updated successfully"
    });
  } catch (error) {
    console.error('Update credit note error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update credit note'
    });
  }
};

/**
 * Delete credit note (soft delete)
 * DELETE /api/v1/credit-notes/:id
 */
const deleteCreditNote = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    console.log('Deleting credit note:', id, 'companyId:', companyId);

    // Check if credit note exists first
    const [existing] = await pool.execute(
      `SELECT id, is_deleted FROM credit_notes WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_b782f1f2') : "Credit note not found"
      });
    }

    if (existing[0].is_deleted === 1) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_165520b8') : "Credit note is already deleted"
      });
    }

    const [result] = await pool.execute(
      `UPDATE credit_notes SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_72217628') : "Credit note not found or already deleted"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_69cfdfc5') : "Credit note deleted successfully"
    });
  } catch (error) {
    console.error('Delete credit note error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_cca13ead') : "Failed to delete credit note",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteCreditNote
};

