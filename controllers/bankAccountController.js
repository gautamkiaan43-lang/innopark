// =====================================================
// Bank Account Controller
// =====================================================

const pool = require('../config/db');

/**
 * Get all bank accounts
 * GET /api/v1/bank-accounts
 */
const getAll = async (req, res) => {
  try {
    // Get company_id with default fallback
    const filterCompanyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    let whereClause = 'WHERE ba.is_deleted = 0';
    const params = [];

    if (filterCompanyId) {
      whereClause += ' AND ba.company_id = ?';
      params.push(filterCompanyId);
    }

    // Get all bank accounts without pagination
    const [accounts] = await pool.execute(
      `SELECT ba.*, c.name as company_name
       FROM bank_accounts ba
       LEFT JOIN companies c ON ba.company_id = c.id
       ${whereClause}
       ORDER BY ba.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_6debbef1') : "Failed to fetch bank accounts"
    });
  }
};

/**
 * Get bank account by ID
 * GET /api/v1/bank-accounts/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    // Get company_id with default fallback
    const filterCompanyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    let whereClause = 'WHERE ba.id = ? AND ba.is_deleted = 0';
    const params = [id];

    if (filterCompanyId) {
      whereClause += ' AND ba.company_id = ?';
      params.push(filterCompanyId);
    }

    const [accounts] = await pool.execute(
      `SELECT ba.*, c.name as company_name
       FROM bank_accounts ba
       LEFT JOIN companies c ON ba.company_id = c.id
       ${whereClause}`,
      params
    );

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_9b9b7c4f') : "Bank account not found"
      });
    }

    res.json({
      success: true,
      data: accounts[0]
    });
  } catch (error) {
    console.error('Get bank account error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_d8e1323f') : "Failed to fetch bank account"
    });
  }
};

/**
 * Create bank account
 * POST /api/v1/bank-accounts
 */
const create = async (req, res) => {
  try {
    const {
      account_name,
      account_number,
      bank_name,
      bank_code,
      branch_name,
      branch_code,
      swift_code,
      iban,
      account_type,
      routing_number,
      currency = 'USD',
      opening_balance = 0,
      current_balance = 0,
      address,
      city,
      state,
      zip,
      country,
      contact_person,
      phone,
      email,
      notes,
      status
    } = req.body;

    // Removed required validations - allow empty data
    const companyId = req.body.company_id || req.companyId || 1;

    console.log('Creating bank account with data:', { companyId, account_name, bank_name });

    // Count: 26 columns total (24 data + 2 timestamps)
    // Remove created_at and updated_at from column list since they have defaults
    const [result] = await pool.execute(
      `INSERT INTO bank_accounts (
        company_id, account_name, account_number, bank_name, bank_code,
        branch_name, branch_code, swift_code, iban, account_type, routing_number,
        currency, opening_balance, current_balance, address, city, state, zip, country,
        contact_person, phone, email, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, 
        account_name || null, 
        account_number || null, 
        bank_name || null, 
        bank_code || null,
        branch_name || null, 
        branch_code || null, 
        swift_code || null, 
        iban || null, 
        account_type || null,
        routing_number || null,
        currency || 'USD', 
        parseFloat(opening_balance) || 0, 
        parseFloat(current_balance) || parseFloat(opening_balance) || 0,
        address || null,
        city || null,
        state || null,
        zip || null,
        country || null,
        contact_person || null,
        phone || null,
        email || null,
        notes || null,
        status || 'Active'
      ]
    );

    const [newAccount] = await pool.execute(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newAccount[0],
      message: req.t ? req.t('api_msg_910e2448') : "Bank account created successfully"
    });
  } catch (error) {
    console.error('Create bank account error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_12c36db8') : "Failed to create bank account",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update bank account
 * PUT /api/v1/bank-accounts/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      account_name,
      account_number,
      bank_name,
      bank_code,
      branch_name,
      branch_code,
      swift_code,
      iban,
      account_type,
      routing_number,
      currency,
      opening_balance,
      current_balance,
      address,
      city,
      state,
      zip,
      country,
      contact_person,
      phone,
      email,
      notes,
      status
    } = req.body;

    const filterCompanyId = req.body.company_id || req.companyId;

    // Check if account exists
    let whereClause = 'WHERE id = ? AND is_deleted = 0';
    const checkParams = [id];

    if (filterCompanyId) {
      whereClause += ' AND company_id = ?';
      checkParams.push(filterCompanyId);
    }

    const [existing] = await pool.execute(
      `SELECT id FROM bank_accounts ${whereClause}`,
      checkParams
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_9b9b7c4f') : "Bank account not found"
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (account_name !== undefined) {
      updates.push('account_name = ?');
      params.push(account_name);
    }
    if (account_number !== undefined) {
      updates.push('account_number = ?');
      params.push(account_number);
    }
    if (bank_name !== undefined) {
      updates.push('bank_name = ?');
      params.push(bank_name);
    }
    if (bank_code !== undefined) {
      updates.push('bank_code = ?');
      params.push(bank_code);
    }
    if (branch_name !== undefined) {
      updates.push('branch_name = ?');
      params.push(branch_name);
    }
    if (branch_code !== undefined) {
      updates.push('branch_code = ?');
      params.push(branch_code);
    }
    if (swift_code !== undefined) {
      updates.push('swift_code = ?');
      params.push(swift_code);
    }
    if (iban !== undefined) {
      updates.push('iban = ?');
      params.push(iban || null);
    }
    if (account_type !== undefined) {
      updates.push('account_type = ?');
      params.push(account_type || null);
    }
    if (routing_number !== undefined) {
      updates.push('routing_number = ?');
      params.push(routing_number || null);
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      params.push(currency || 'USD');
    }
    if (opening_balance !== undefined) {
      updates.push('opening_balance = ?');
      params.push(parseFloat(opening_balance) || 0);
    }
    if (current_balance !== undefined) {
      updates.push('current_balance = ?');
      params.push(parseFloat(current_balance) || 0);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address || null);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      params.push(city || null);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      params.push(state || null);
    }
    if (zip !== undefined) {
      updates.push('zip = ?');
      params.push(zip || null);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      params.push(country || null);
    }
    if (contact_person !== undefined) {
      updates.push('contact_person = ?');
      params.push(contact_person || null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone || null);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email || null);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status || 'Active');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(
      `UPDATE bank_accounts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedAccount] = await pool.execute(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updatedAccount[0],
      message: req.t ? req.t('api_msg_4d4c07dc') : "Bank account updated successfully"
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_24ed0cde') : "Failed to update bank account"
    });
  }
};

/**
 * Delete bank account (soft delete)
 * DELETE /api/v1/bank-accounts/:id
 */
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if account exists (without company_id check for flexibility)
    const [existing] = await pool.execute(
      `SELECT id FROM bank_accounts WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_8db49797') : "Bank account not found or already deleted"
      });
    }

    // Soft delete
    const [result] = await pool.execute(
      'UPDATE bank_accounts SET is_deleted = 1, updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_9b9b7c4f') : "Bank account not found"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_1a1c3b08') : "Bank account deleted successfully"
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_024a5797') : "Failed to delete bank account"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteAccount
};

