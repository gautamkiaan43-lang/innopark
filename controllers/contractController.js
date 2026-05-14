const pool = require('../config/db');

/**
 * Normalize unit value to valid ENUM values
 * Valid values: 'Pcs', 'Kg', 'Hours', 'Days'
 */
const normalizeUnit = (unit) => {
  const validUnits = ['Pcs', 'Kg', 'Hours', 'Days'];
  
  if (!unit || unit === '') {
    return 'Pcs'; // Default
  }
  
  // If already valid, return as is
  if (validUnits.includes(unit)) {
    return unit;
  }
  
  // Normalize to valid ENUM value
  const unitLower = String(unit).toLowerCase().trim();
  if (unitLower.includes('pc') || unitLower.includes('piece')) {
    return 'Pcs';
  } else if (unitLower.includes('kg') || unitLower.includes('kilogram')) {
    return 'Kg';
  } else if (unitLower.includes('hour')) {
    return 'Hours';
  } else if (unitLower.includes('day')) {
    return 'Days';
  } else {
    return 'Pcs'; // Default fallback
  }
};

const calculateTotals = (items, discount, discountType) => {
  let subTotal = 0;
  let taxAmount = 0;

  if (items && Array.isArray(items) && items.length > 0) {
    items.forEach(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;

      const itemSubtotal = quantity * unitPrice;
      const itemTax = itemSubtotal * (taxRate / 100);

      subTotal += itemSubtotal;
      taxAmount += itemTax;
    });
  }

  // Contract specific: discount might not be in schema yet, but good to have logic ready. 
  // However, contracts schema shows 'amount' but not explicitly sub_total/discount/tax_amount columns in the CREATE TABLE usually.
  // Wait, the schema shows `amount`, `tax` (string), `second_tax` (string). It does NOT show sub_total, discount_amount, tax_amount columns like estimates.
  // The 'amount' in contracts seems to be the Total Value. 
  // I should adjust to update 'amount' based on the calculation.

  const total = subTotal + taxAmount; // ignoring discount for now as it's not in schema

  return {
    sub_total: subTotal, // Not stored in contracts
    tax_amount: taxAmount, // Not stored separately as amount
    total: total
  };
};

const generateContractNumber = async (companyId) => {
  const [result] = await pool.execute(`SELECT COUNT(*) as count FROM contracts WHERE company_id = ?`, [companyId]);
  const nextNum = (result[0].count || 0) + 1;
  return `CONTRACT #${nextNum}`;
};

const getAll = async (req, res) => {
  try {
    const { status, lead_id } = req.query;

    // Admin must provide company_id - required for filtering
    const filterCompanyId = req.query.company_id || req.body.company_id || req.companyId;

    if (!filterCompanyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    let whereClause = 'WHERE c.company_id = ? AND c.is_deleted = 0';
    const params = [filterCompanyId];

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    if (lead_id) {
      whereClause += ' AND c.lead_id = ?';
      params.push(parseInt(lead_id));
    }

    // Get all contracts without pagination
    const [contracts] = await pool.execute(
      `SELECT c.*, 
              cl.company_name as client_name,
              p.project_name,
              l.company_name as lead_name,
              l.person_name as lead_person_name
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN projects p ON c.project_id = p.id
       LEFT JOIN leads l ON c.lead_id = l.id
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    );

    // Fetch items for each contract (optional, but good for list view if needed, maybe expensive)
    // For now, let's NOT fetch items in getAll to keep it fast.

    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_32dc0b15') : "Failed to fetch contracts" });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [contracts] = await pool.execute(
      `SELECT c.*, cl.company_name as client_name, p.project_name
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND c.is_deleted = 0`,
      [id]
    );

    if (contracts.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_8e1a48e5') : "Contract not found"
      });
    }

    const contract = contracts[0];

    // Get contract items
    const [items] = await pool.execute(
      `SELECT * FROM contract_items WHERE contract_id = ?`,
      [id]
    );
    contract.items = items || [];

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_934f0aa0') : "Failed to fetch contract"
    });
  }
};

const create = async (req, res) => {
  try {
    let {
      title, contract_date, valid_until, client_id, project_id,
      lead_id, tax, second_tax, note, file_path, amount, status, items
    } = req.body;

    // Parse items if it's a JSON string (from FormData)
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
    }

    const companyId = req.body.company_id || req.query.company_id || req.companyId || 1;
    const contract_number = await generateContractNumber(companyId);

    // Get created_by from various sources - body, query, req.userId, or default to 1 (admin)
    const effectiveCreatedBy = req.body.user_id || req.query.user_id || req.userId || 1;

    // Handle file upload
    let finalFilePath = file_path || null;
    if (req.file) {
      const path = require('path');
      finalFilePath = `/uploads/${req.file.filename}`;
    }

    // Set default values for required fields
    const today = new Date().toISOString().split('T')[0];
    const defaultValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    // Normalize status
    let normalizedStatus = 'Draft';
    if (status && status !== '') {
      const statusLower = status.toLowerCase();
      const statusMap = { 'draft': 'Draft', 'sent': 'Sent', 'accepted': 'Accepted', 'rejected': 'Rejected', 'expired': 'Expired' };
      normalizedStatus = statusMap[statusLower] || 'Draft';
    }

    // Calculate total amount if items are provided
    let finalAmount = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : 0;
    if (items && Array.isArray(items) && items.length > 0) {
      const totals = calculateTotals(items);
      finalAmount = totals.total;
    }

    const connection = await pool.getConnection();
    let contractId;

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO contracts (
          company_id, contract_number, title, contract_date, valid_until,
          client_id, project_id, lead_id, tax, second_tax, note, file_path,
          amount, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          contract_number,
          (title && title !== '') ? title : `Contract ${contract_number}`,
          (contract_date && contract_date !== '') ? contract_date : today,
          (valid_until && valid_until !== '') ? valid_until : defaultValidUntil,
          (client_id && client_id !== '') ? client_id : null,
          (project_id && project_id !== '') ? project_id : null,
          (lead_id && lead_id !== '') ? lead_id : null,
          (tax && tax !== '') ? tax : null,
          (second_tax && second_tax !== '') ? second_tax : null,
          (note && note !== '') ? note : null,
          finalFilePath,
          finalAmount,
          normalizedStatus,
          effectiveCreatedBy
        ]
      );

      contractId = result.insertId;

      // Handle Items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          // Normalize unit to valid ENUM value
          const normalizedUnit = normalizeUnit(item.unit);
          
          await connection.execute(
            `INSERT INTO contract_items 
             (contract_id, item_name, description, quantity, unit, unit_price, tax, tax_rate, amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contractId,
              item.item_name || '',
              item.description || '',
              item.quantity || 1,
              normalizedUnit,
              item.unit_price || 0,
              item.tax || '',
              item.tax_rate || 0,
              item.amount || 0
            ]
          );
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Get created contract
    const [contracts] = await pool.execute(
      `SELECT * FROM contracts WHERE id = ?`,
      [contractId]
    );
    const contract = contracts[0];
    // Add items
    const [savedItems] = await pool.execute(
      `SELECT * FROM contract_items WHERE contract_id = ?`,
      [contractId]
    );
    contract.items = savedItems || [];

    res.status(201).json({
      success: true,
      data: contract,
      message: req.t ? req.t('api_msg_312d1f9b') : "Contract created successfully"
    });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_af1c847a') : "Failed to create contract", details: error.message });
  }
};

/**
 * Update contract
 * PUT /api/v1/contracts/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      title, contract_date, valid_until, client_id, project_id,
      lead_id, tax, second_tax, note, file_path, amount, status, items
    } = req.body;

    // Parse items if it's a JSON string (from FormData)
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
    }

    // Check if contract exists
    const [contracts] = await pool.execute(
      `SELECT id FROM contracts WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (contracts.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_8e1a48e5') : "Contract not found"
      });
    }

    // Handle file upload
    let finalFilePath = file_path || undefined;
    if (req.file) {
      const path = require('path');
      finalFilePath = `/uploads/${req.file.filename}`;
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let finalAmount = amount;
      if (items && Array.isArray(items)) {
        const totals = calculateTotals(items);
        finalAmount = totals.total; // Auto-update amount from items
      }

      // Build update query
      const updates = [];
      const values = [];

      if (title !== undefined) updates.push('title = ?'), values.push(title);
      if (contract_date !== undefined) updates.push('contract_date = ?'), values.push(contract_date);
      if (valid_until !== undefined) updates.push('valid_until = ?'), values.push(valid_until);
      if (client_id !== undefined) updates.push('client_id = ?'), values.push(client_id);
      if (project_id !== undefined) updates.push('project_id = ?'), values.push(project_id);
      if (lead_id !== undefined) updates.push('lead_id = ?'), values.push(lead_id);
      if (tax !== undefined) updates.push('tax = ?'), values.push(tax);
      if (second_tax !== undefined) updates.push('second_tax = ?'), values.push(second_tax);
      if (note !== undefined) updates.push('note = ?'), values.push(note);
      if (finalFilePath !== undefined) updates.push('file_path = ?'), values.push(finalFilePath);
      if (finalAmount !== undefined) updates.push('amount = ?'), values.push(finalAmount);
      if (status !== undefined) updates.push('status = ?'), values.push(status);

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await connection.execute(
          `UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Handle Items
      if (items && Array.isArray(items)) {
        // Delete existing items
        await connection.execute('DELETE FROM contract_items WHERE contract_id = ?', [id]);

        // Insert new items
        for (const item of items) {
          // Normalize unit to valid ENUM value
          const normalizedUnit = normalizeUnit(item.unit);
          
          await connection.execute(
            `INSERT INTO contract_items 
             (contract_id, item_name, description, quantity, unit, unit_price, tax, tax_rate, amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              item.item_name || '',
              item.description || '',
              item.quantity || 1,
              normalizedUnit,
              item.unit_price || 0,
              item.tax || '',
              item.tax_rate || 0,
              item.amount || 0
            ]
          );
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Get updated contract with client name
    const [updatedContracts] = await pool.execute(
      `SELECT c.*, cl.company_name as client_name
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.id = ?`,
      [id]
    );
    const updatedContract = updatedContracts[0];

    // Get items
    const [updatedItems] = await pool.execute(
      `SELECT * FROM contract_items WHERE contract_id = ?`,
      [id]
    );
    updatedContract.items = updatedItems || [];

    res.json({
      success: true,
      data: updatedContract,
      message: req.t ? req.t('api_msg_647d0727') : "Contract updated successfully"
    });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_ce2e34e4') : "Failed to update contract"
    });
  }
};

/**
 * Update contract status
 * PUT /api/v1/contracts/:id/status
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    // Validation
    if (!status) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_75cd6d17') : "status is required"
      });
    }

    // Validate status value
    const validStatuses = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check if contract exists and get full details with client info
    const [contracts] = await pool.execute(
      `SELECT c.*, cl.email as client_email, cl.company_name as client_name, cl.name as client_contact_name
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.id = ? AND c.is_deleted = 0`,
      [id]
    );

    if (contracts.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_8e1a48e5') : "Contract not found"
      });
    }

    const contract = contracts[0];

    // Update contract status
    await pool.execute(
      `UPDATE contracts 
       SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, id]
    );

    // Send email notification if status is Accepted or Rejected
    if ((status === 'Accepted' || status === 'Rejected') && contract.client_email) {
      try {
        const { renderEmailTemplate } = require('../utils/emailTemplateRenderer');
        const { sendEmail: sendEmailUtil } = require('../utils/emailService');

        // Determine template key based on status
        const templateKey = status === 'Accepted' ? 'contract_accepted' : 'contract_rejected';

        // Get company info for template
        const [companies] = await pool.execute(
          `SELECT name, email, address, phone FROM companies WHERE id = ?`,
          [companyId]
        );
        const company = companies[0] || {};

        // Build public contract URL
        const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/view/contract/${id}`;

        // Build data object for template
        const templateData = {
          CONTRACT_ID: contract.contract_number || `CONT-${contract.id}`,
          CONTRACT_NUMBER: contract.contract_number || `CONT-${contract.id}`,
          CONTRACT_TITLE: contract.title || 'Contract',
          CONTACT_FIRST_NAME: contract.client_contact_name?.split(' ')[0] || contract.client_name?.split(' ')[0] || 'Valued Customer',
          PUBLIC_CONTRACT_URL: publicUrl,
          CONTRACT_AMOUNT: `$${parseFloat(contract.amount || contract.total || 0).toFixed(2)}`,
          COMPANY_NAME: company.name || 'Our Company',
          SIGNATURE: process.env.EMAIL_SIGNATURE || 'Best regards,<br>Your Team'
        };

        // Render template
        const rendered = await renderEmailTemplate(templateKey, templateData, companyId);
        
        // Send email
        await sendEmailUtil({
          to: contract.client_email,
          subject: rendered.subject,
          html: rendered.body,
          text: rendered.body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
        });

        console.log(`✅ Contract ${status.toLowerCase()} email sent to ${contract.client_email}`);
      } catch (emailError) {
        // Log error but don't fail the status update
        console.error('Error sending contract status email:', emailError);
        // Continue with the response even if email fails
      }
    }

    // Get updated contract
    const [updatedContracts] = await pool.execute(
      `SELECT c.*, cl.email as client_email, cl.company_name as client_name
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.id = ?`,
      [id]
    );

    if (!updatedContracts || updatedContracts.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_d7e11659') : "Contract not found after update"
      });
    }

    const updatedContract = updatedContracts[0];

    // Get items
    let items = [];
    try {
      const [itemsResult] = await pool.execute(
        `SELECT * FROM contract_items WHERE contract_id = ?`,
        [id]
      );
      items = itemsResult || [];
    } catch (itemsError) {
      // If contract_items table doesn't exist or query fails, just use empty array
      console.warn('Could not fetch contract items:', itemsError.message);
      items = [];
    }
    updatedContract.items = items;

    res.json({
      success: true,
      data: updatedContract,
      message: req.t ? req.t('api_msg_60757137') : "Contract status updated successfully"
    });
  } catch (error) {
    console.error('Update contract status error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_69f0397b') : "Failed to update contract status",
      details: error.message
    });
  }
};

const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `UPDATE contracts SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_8e1a48e5') : "Contract not found"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_057b04ab') : "Contract deleted successfully"
    });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_f62aaa46') : "Failed to delete contract"
    });
  }
};

/**
 * Get contract PDF
 * GET /api/v1/contracts/:id/pdf
 */
const getPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || 1;

    const [contracts] = await pool.execute(
      `SELECT c.*, 
              cl.company_name as client_name,
              p.project_name,
              comp.name as company_name,
              comp.address as company_address
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN projects p ON c.project_id = p.id
       LEFT JOIN companies comp ON c.company_id = comp.id
       WHERE c.id = ? AND c.company_id = ? AND c.is_deleted = 0`,
      [id, companyId]
    );

    if (contracts.length === 0) {
      return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_8e1a48e5') : "Contract not found" });
    }

    const contract = contracts[0];

    // Get items
    const [items] = await pool.execute(
      `SELECT * FROM contract_items WHERE contract_id = ?`,
      [id]
    );
    contract.items = items || [];

    // For now, return JSON. In production, you would generate actual PDF using libraries like pdfkit or puppeteer
    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=contract-${contract.contract_number || contract.id}.json`);
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    res.json({
      success: true,
      data: contract,
      message: req.t ? req.t('api_msg_cb75e169') : "PDF generation will be implemented with pdfkit or puppeteer"
    });
  } catch (error) {
    console.error('Get contract PDF error:', error);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_53ac43e9') : "Failed to generate PDF" });
  }
};

/**
 * Send contract by email
 * POST /api/v1/contracts/:id/send-email
 */
const sendEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { to, cc, bcc, subject, message } = req.body;
    const companyId = req.query.company_id || req.body.company_id || 1;

    // Get contract with client contact email
    const [contracts] = await pool.execute(
      `SELECT c.*, 
              cl.company_name as client_name,
              COALESCE(
                (SELECT email FROM client_contacts WHERE client_id = cl.id AND is_primary = 1 AND is_deleted = 0 LIMIT 1),
                (SELECT email FROM client_contacts WHERE client_id = cl.id AND is_deleted = 0 LIMIT 1)
              ) as client_email,
              comp.name as company_name
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN companies comp ON c.company_id = comp.id
       WHERE c.id = ? AND c.company_id = ? AND c.is_deleted = 0`,
      [id, companyId]
    );

    if (contracts.length === 0) {
      return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_8e1a48e5') : "Contract not found" });
    }

    const contract = contracts[0];

    // Generate public URL
    const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/contracts/${id}`;

    // Use email template renderer
    const { renderEmailTemplate } = require('../utils/emailTemplateRenderer');
    const { sendEmail: sendEmailUtil } = require('../utils/emailService');

    // Build data object for template
    const templateData = {
      CONTRACT_ID: contract.contract_number || `CONT-${contract.id}`,
      CONTRACT_NUMBER: contract.contract_number || `CONT-${contract.id}`,
      CONTRACT_TITLE: contract.title || 'Contract',
      CONTACT_FIRST_NAME: contract.client_name?.split(' ')[0] || 'Valued Customer',
      PUBLIC_CONTRACT_URL: publicUrl,
      CONTRACT_AMOUNT: `$${parseFloat(contract.total || 0).toFixed(2)}`,
      COMPANY_NAME: contract.company_name || 'Our Company',
      SIGNATURE: process.env.EMAIL_SIGNATURE || 'Best regards,<br>Your Team'
    };

    // Render template (or use provided message)
    let emailSubject, emailHTML;
    if (message) {
      // Use custom message if provided
      emailSubject = subject || `Contract ${contract.contract_number}`;
      emailHTML = message;
    } else {
      // Use template - try contract_sent
      try {
        const rendered = await renderEmailTemplate('contract_sent', templateData, contract.company_id);
        emailSubject = subject || rendered.subject || `Contract ${contract.contract_number}`;
        emailHTML = rendered.body || `<p>Contract ${contract.contract_number} - Amount: ${templateData.CONTRACT_AMOUNT}</p>`;
      } catch (templateError) {
        console.warn('Template rendering error:', templateError.message);
        // Fallback to basic template
        emailSubject = subject || `Contract ${contract.contract_number}`;
        emailHTML = `<div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Contract ${templateData.CONTRACT_NUMBER}</h2>
          <p>Hello ${templateData.CONTACT_FIRST_NAME},</p>
          <p>Please find your contract details below:</p>
          <p><strong>Amount:</strong> ${templateData.CONTRACT_AMOUNT}</p>
          <p><a href="${templateData.PUBLIC_CONTRACT_URL}">View Contract</a></p>
          <p>${templateData.SIGNATURE}</p>
        </div>`;
      }
    }

    // Send email
    const recipientEmail = to || contract.client_email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_4a2ce470') : "Recipient email is required" });
    }

    // Handle CC and BCC from request body
    const emailOptions = {
      to: recipientEmail,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject: emailSubject,
      html: emailHTML,
      text: `Please view the contract at: ${publicUrl}`
    };

    console.log('=== SENDING CONTRACT EMAIL ===');
    console.log('Email options:', { ...emailOptions, html: emailOptions.html ? 'HTML provided' : 'No HTML' });

    const emailResult = await sendEmailUtil(emailOptions);

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      return res.status(500).json({ 
        success: false, 
        error: emailResult.error || 'Failed to send contract email',
        details: process.env.NODE_ENV === 'development' ? emailResult.message : undefined
      });
    }

    // Update contract status to 'Sent' if it's Draft
    if (contract.status === 'Draft' || contract.status === 'draft') {
      try {
        await pool.execute(
          `UPDATE contracts SET status = 'Sent', sent_at = NOW() WHERE id = ?`,
          [id]
        );
      } catch (updateError) {
        console.warn('Failed to update contract status:', updateError.message);
        // Don't fail the request if status update fails
      }
    }

    console.log('✅ Contract email sent successfully');

    res.json({ 
      success: true, 
      message: req.t ? req.t('api_msg_b265c66e') : "Contract sent successfully",
      data: { email: recipientEmail, messageId: emailResult.messageId }
    });
  } catch (error) {
    console.error('=== SEND CONTRACT EMAIL ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_8b87299b') : "Failed to send contract email",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { getAll, getById, create, update, updateStatus, delete: deleteContract, getPDF, sendEmail };

