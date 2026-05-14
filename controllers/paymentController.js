// =====================================================
// Payment Controller
// =====================================================

const pool = require('../config/db');

/**
 * Get all payments
 * GET /api/v1/payments
 */
const getAll = async (req, res) => {
  try {
    const { client_id, invoice_id } = req.query;
    
    // Admin must provide company_id - required for filtering
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    let whereClause = 'WHERE p.company_id = ? AND p.is_deleted = 0';
    const params = [companyId];

    if (client_id) {
      whereClause += ` AND p.invoice_id IN (
        SELECT id FROM invoices WHERE client_id = ?
      )`;
      params.push(client_id);
    }
    if (invoice_id) {
      whereClause += ' AND p.invoice_id = ?';
      params.push(invoice_id);
    }

    // Get all payments without pagination
    const [payments] = await pool.execute(
      `SELECT p.*, 
       p.paid_on as payment_date,
       COALESCE(p.payment_gateway, p.offline_payment_method) as payment_method,
       p.remark as note,
       i.invoice_number, c.company_name as client_name, comp.name as company_name,
       pr.project_name
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN companies comp ON p.company_id = comp.id
       LEFT JOIN projects pr ON p.project_id = pr.id
       ${whereClause}
       ORDER BY p.paid_on DESC, p.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_df7335e2') : "Failed to fetch payments"
    });
  }
};

/**
 * Get payment by ID
 * GET /api/v1/payments/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || 1;

    const [payments] = await pool.execute(
      `SELECT p.*, 
       p.paid_on as payment_date,
       COALESCE(p.payment_gateway, p.offline_payment_method) as payment_method,
       p.remark as note,
       i.invoice_number, c.company_name as client_name
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE p.id = ? AND p.is_deleted = 0`,
      [id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_58ad1e2f') : "Payment not found"
      });
    }

    res.json({
      success: true,
      data: payments[0]
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_41bcd582') : "Failed to fetch payment"
    });
  }
};

/**
 * Create single payment
 * POST /api/v1/payments
 */
const create = async (req, res) => {
  try {
    const {
      company_id, project_id, invoice_id, paid_on, amount, currency, exchange_rate,
      transaction_id, payment_gateway, offline_payment_method, payment_method,
      bank_account, receipt_path, remark, note, order_number, client_id
    } = req.body;

    // Validate invoice_id is required (database constraint)
    if (!invoice_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_2c6861a5') : "invoice_id is required for recording a payment"
      });
    }

    // Handle payment_method - map to payment_gateway or offline_payment_method
    const effectivePaymentGateway = payment_gateway || (payment_method && !['Cash', 'Cheque', 'Bank Transfer'].includes(payment_method) ? payment_method : null);
    const effectiveOfflinePaymentMethod = offline_payment_method || (payment_method && ['Cash', 'Cheque', 'Bank Transfer'].includes(payment_method) ? payment_method : null);
    
    // Handle remark/note
    const effectiveRemark = remark || note || null;

    // Insert payment - convert undefined to null for SQL
    const [result] = await pool.execute(
      `INSERT INTO payments (
        company_id, project_id, invoice_id, paid_on, amount, currency,
        exchange_rate, transaction_id, payment_gateway, offline_payment_method,
        bank_account, receipt_path, remark, order_number, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id ?? null,
        project_id ?? null,
        invoice_id ?? null,
        paid_on || new Date().toISOString().split('T')[0],
        amount ? parseFloat(amount) : null,
        currency || 'USD',
        exchange_rate ?? 1.0,
        transaction_id ?? null,
        effectivePaymentGateway ?? null,
        effectiveOfflinePaymentMethod ?? null,
        bank_account ?? null,
        receipt_path ?? null,
        effectiveRemark ?? null,
        order_number ?? null,
        'Complete',
        req.body.user_id || req.query.user_id || req.userId || 1
      ]
    );

    // Update invoice paid/unpaid amounts only if invoice_id and amount are provided
    if (invoice_id && amount && parseFloat(amount) > 0) {
      try {
        const paymentAmount = parseFloat(amount);
        await pool.execute(
          `UPDATE invoices SET
            paid = COALESCE(paid, 0) + ?,
            unpaid = GREATEST(COALESCE(unpaid, total), 0) - ?,
            status = CASE
              WHEN (COALESCE(unpaid, total) - ?) <= 0 THEN 'Paid'
              WHEN (COALESCE(paid, 0) + ?) > 0 AND (COALESCE(unpaid, total) - ?) > 0 THEN 'Partially Paid'
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [paymentAmount, paymentAmount, paymentAmount, paymentAmount, paymentAmount, invoice_id]
        );
      } catch (err) {
        console.warn('Error updating invoice amounts:', err.message);
        // Don't fail payment creation if invoice update fails
      }
    }

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: req.t ? req.t('api_msg_ccd2eea8') : "Payment recorded successfully"
    });
  } catch (error) {
    console.error('Create payment error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_e09fda02') : "Failed to record payment",
      details: error.message
    });
  }
};

/**
 * Create bulk payments
 * POST /api/v1/payments/bulk
 */
const createBulk = async (req, res) => {
  try {
    const { payments } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_f2f3791e') : "payments array is required"
      });
    }

    const createdPayments = [];

    for (const payment of payments) {
      const {
        company_id, invoice_id, payment_date, payment_method, offline_payment_method,
        bank_account, transaction_id, amount_received
      } = payment;

      if (!invoice_id || !payment_date || !amount_received) {
        continue; // Skip invalid payments
      }

      // Insert payment - convert undefined to null for SQL
      const [result] = await pool.execute(
        `INSERT INTO payments (
          company_id, invoice_id, paid_on, amount, currency, exchange_rate,
          transaction_id, payment_gateway, offline_payment_method, bank_account,
          status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_id ?? null,
          invoice_id,
          payment_date,
          amount_received,
          'USD',
          1.0,
          transaction_id ?? null,
          payment_method ?? null,
          offline_payment_method ?? null,
          bank_account ?? null,
          'Complete',
          req.body.user_id || req.query.user_id || null
        ]
      );

      // Update invoice
      await pool.execute(
        `UPDATE invoices SET
          paid = paid + ?,
          unpaid = unpaid - ?,
          status = CASE
            WHEN unpaid - ? <= 0 THEN 'Paid'
            WHEN paid + ? > 0 AND unpaid - ? > 0 THEN 'Partially Paid'
            ELSE status
          END,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [amount_received, amount_received, amount_received, amount_received, amount_received, invoice_id]
      );

      createdPayments.push({ id: result.insertId, invoice_id });
    }

    res.status(201).json({
      success: true,
      data: createdPayments,
      message: `${createdPayments.length} payments recorded successfully`
    });
  } catch (error) {
    console.error('Create bulk payments error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_3c2f43e3') : "Failed to record bulk payments"
    });
  }
};

/**
 * Update payment
 * PUT /api/v1/payments/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const companyId = req.query.company_id || req.body.company_id || 1;
    // Get payment to get invoice_id
    const [payments] = await pool.execute(
      `SELECT invoice_id, amount FROM payments WHERE id = ?`,
      [id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_58ad1e2f') : "Payment not found"
      });
    }

    const oldPayment = payments[0];

    // Build update query
    const allowedFields = [
      'paid_on', 'amount', 'currency', 'exchange_rate', 'transaction_id',
      'payment_gateway', 'offline_payment_method', 'bank_account',
      'receipt_path', 'remark', 'status'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (updateFields.hasOwnProperty(field)) {
        updates.push(`${field} = ?`);
        // Convert undefined to null for SQL
        values.push(updateFields[field] === undefined ? null : updateFields[field]);
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await pool.execute(
        `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // If amount changed, update invoice
      if (updateFields.amount && updateFields.amount !== oldPayment.amount) {
        const amountDiff = updateFields.amount - oldPayment.amount;
        await pool.execute(
          `UPDATE invoices SET
            paid = paid + ?,
            unpaid = unpaid - ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [amountDiff, amountDiff, oldPayment.invoice_id]
        );
      }
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_009009c5') : "Payment updated successfully"
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_1d85636a') : "Failed to update payment"
    });
  }
};

/**
 * Delete payment
 * DELETE /api/v1/payments/:id
 */
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.query.company_id || req.body.company_id || 1;
    // Get payment
    const [payments] = await pool.execute(
      `SELECT invoice_id, amount FROM payments WHERE id = ?`,
      [id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_58ad1e2f') : "Payment not found"
      });
    }

    const payment = payments[0];

    // Delete payment
    await pool.execute(
      `UPDATE payments SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    // Update invoice
    await pool.execute(
      `UPDATE invoices SET
        paid = paid - ?,
        unpaid = unpaid + ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [payment.amount, payment.amount, payment.invoice_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_ba71dede') : "Payment deleted successfully"
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_4cfcb830') : "Failed to delete payment"
    });
  }
};

module.exports = {
  getAll,
  getById,
  getAll,
  create,
  createBulk,
  update,
  delete: deletePayment
};

