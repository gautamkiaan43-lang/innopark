const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { status, client_id } = req.query;
    
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;
    let whereClause = 'WHERE s.company_id = ? AND s.is_deleted = 0';
    const params = [companyId];

    // Filter by client_id - directly use client_id if provided
    // Parse client_id to ensure it's a number
    const parsedClientId = client_id ? parseInt(client_id, 10) : null;
    
    if (parsedClientId && !isNaN(parsedClientId)) {
      // First try direct client_id match in subscriptions table (most common case)
      whereClause += ' AND s.client_id = ?';
      params.push(parsedClientId);
      
      console.log(`Filtering subscriptions by client_id: ${parsedClientId}, company_id: ${companyId}`);
      
      // Also verify client exists (optional check, doesn't block results)
      try {
        const [clientCheck] = await pool.execute(
          'SELECT id FROM clients WHERE id = ? AND company_id = ? AND is_deleted = 0 LIMIT 1',
          [parsedClientId, companyId]
        );
        if (clientCheck.length === 0) {
          console.log(`Warning: client_id ${parsedClientId} not found in clients table, but still filtering subscriptions`);
        }
      } catch (err) {
        console.warn('Error checking client:', err.message);
      }
    } else if (client_id) {
      console.warn(`Invalid client_id provided: ${client_id}, skipping client filter`);
    }

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    // Get all subscriptions without pagination
    // Use COALESCE for columns that might not exist
    const [subscriptions] = await pool.execute(
      `SELECT s.*, 
              s.plan as title,
              s.plan as plan_name,
              c.company_name as client_name,
              s.created_at as first_billing_date
       FROM subscriptions s
       LEFT JOIN clients c ON s.client_id = c.id
       ${whereClause}
       ORDER BY s.created_at DESC`,
      params
    );

    console.log(`Fetched ${subscriptions.length} subscriptions for client_id: ${client_id}, company_id: ${companyId}`);

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_9191ac91') : "Failed to fetch subscriptions",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const create = async (req, res) => {
  try {
    const { client_id, plan, amount, billing_cycle, next_billing_date } = req.body;

    // Removed required validations - allow empty data

    // Calculate next_billing_date if not provided
    let nextBillingDate = next_billing_date;
    if (!nextBillingDate) {
      const today = new Date();
      if (billing_cycle === 'Monthly') {
        today.setMonth(today.getMonth() + 1);
      } else if (billing_cycle === 'Quarterly') {
        today.setMonth(today.getMonth() + 3);
      } else if (billing_cycle === 'Yearly') {
        today.setFullYear(today.getFullYear() + 1);
      } else {
        // Default to monthly
        today.setMonth(today.getMonth() + 1);
      }
      nextBillingDate = today.toISOString().split('T')[0];
    }

    // Insert subscription - convert undefined to null for SQL
    const companyIdForInsert = req.companyId ?? req.body.company_id ?? req.query.company_id ?? null;
    const clientIdForInsert = client_id ?? req.body.client_id ?? null;
    
    console.log('Creating subscription with:', { 
      companyIdForInsert, 
      clientIdForInsert, 
      plan, 
      amount, 
      billing_cycle,
      reqBody: req.body,
      reqQuery: req.query,
      reqCompanyId: req.companyId
    });
    
    if (!clientIdForInsert) {
      console.warn('Warning: client_id is null or undefined when creating subscription');
    }
    
    const [result] = await pool.execute(
      `INSERT INTO subscriptions (
        company_id, client_id, plan, amount, billing_cycle, status, next_billing_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        companyIdForInsert,
        clientIdForInsert,
        plan ?? null,
        amount ?? null,
        billing_cycle || 'Monthly',
        'Active',
        nextBillingDate ?? null
      ]
    );

    console.log('Subscription created with ID:', result.insertId, 'client_id:', clientIdForInsert, 'company_id:', companyIdForInsert);

    // Get created subscription with all fields
    const [subscriptions] = await pool.execute(
      `SELECT s.*, 
              s.plan as title,
              s.plan as plan_name,
              c.company_name as client_name,
              s.created_at as first_billing_date
       FROM subscriptions s
       LEFT JOIN clients c ON s.client_id = c.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    const createdSubscription = subscriptions[0];
    console.log('Created subscription data:', {
      id: createdSubscription.id,
      client_id: createdSubscription.client_id,
      company_id: createdSubscription.company_id,
      plan: createdSubscription.plan
    });

    // Verify the subscription was created correctly
    if (!createdSubscription) {
      console.error('Error: Subscription was not found after creation');
      return res.status(500).json({
        success: false,
        error: req.t ? req.t('api_msg_cf8801dc') : "Subscription created but could not be retrieved"
      });
    }

    res.status(201).json({ 
      success: true, 
      data: createdSubscription,
      message: req.t ? req.t('api_msg_a11176ba') : "Subscription created successfully"
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_94729ce4') : "Failed to create subscription"
    });
  }
};

/**
 * Update subscription
 * PUT /api/v1/subscriptions/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Get company_id from body, query, or req.companyId
    const companyId = req.body.company_id || req.query.company_id || req.companyId;

    // Check if subscription exists
    const [subscriptions] = await pool.execute(
      `SELECT id FROM subscriptions WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_7c53de50') : "Subscription not found"
      });
    }

    // Build update query
    const allowedFields = ['plan', 'amount', 'billing_cycle', 'status', 'next_billing_date', 'client_id'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (updateFields.hasOwnProperty(field)) {
        updates.push(`${field} = ?`);
        // Convert undefined to null for SQL
        const value = updateFields[field] === undefined ? null : updateFields[field];
        // Parse amount if it's a number field
        if (field === 'amount' && value !== null) {
          values.push(parseFloat(value) || null);
        } else {
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e9f00744') : "No valid fields to update"
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, companyId);

    await pool.execute(
      `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`,
      values
    );

    // Get updated subscription
    const [updatedSubscriptions] = await pool.execute(
      `SELECT * FROM subscriptions WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updatedSubscriptions[0],
      message: req.t ? req.t('api_msg_80536771') : "Subscription updated successfully"
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_a577c1dc') : "Failed to update subscription",
      details: error.message
    });
  }
};

/**
 * Cancel subscription
 * PUT /api/v1/subscriptions/:id/cancel
 */
const cancel = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subscription exists
    const [subscriptions] = await pool.execute(
      `SELECT id, status FROM subscriptions WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, req.companyId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_7c53de50') : "Subscription not found"
      });
    }

    const subscription = subscriptions[0];

    // Check if already cancelled
    if (subscription.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_f31f67bf') : "Subscription is already cancelled"
      });
    }

    // Update subscription status to Cancelled
    await pool.execute(
      `UPDATE subscriptions 
       SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND company_id = ?`,
      [id, req.companyId]
    );

    // Get updated subscription
    const [updatedSubscriptions] = await pool.execute(
      `SELECT * FROM subscriptions WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updatedSubscriptions[0],
      message: req.t ? req.t('api_msg_3b73c07c') : "Subscription cancelled successfully"
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_0e1248f1') : "Failed to cancel subscription"
    });
  }
};

/**
 * Delete subscription (soft delete)
 * DELETE /api/v1/subscriptions/:id
 */
const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    // Check if subscription exists
    const [subscriptions] = await pool.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_7c53de50') : "Subscription not found"
      });
    }

    // Soft delete
    await pool.execute(
      `UPDATE subscriptions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_a3eb72c4') : "Subscription deleted successfully"
    });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_f721a811') : "Failed to delete subscription"
    });
  }
};

module.exports = { getAll, create, update, cancel, delete: deleteSubscription };

