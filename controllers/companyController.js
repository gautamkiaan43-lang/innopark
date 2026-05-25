// =====================================================
// Company Controller
// =====================================================

const pool = require('../config/db');
const settingsService = require('../services/settingsService');
const customFieldService = require('../services/customFieldService');

/**
 * Ensure companies table has all required columns
 * Auto-adds email and phone columns if they don't exist
 */
const ensureTableColumns = async () => {
  try {
    // Check if email column exists
    const [emailColumns] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'email'
    `);

    if (emailColumns.length === 0) {
      await pool.execute(`ALTER TABLE companies ADD COLUMN email VARCHAR(255) NULL AFTER name`);
      console.log('Added email column to companies table');
    }

    // Check if phone column exists
    const [phoneColumns] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'phone'
    `);

    if (phoneColumns.length === 0) {
      await pool.execute(`ALTER TABLE companies ADD COLUMN phone VARCHAR(50) NULL AFTER email`);
      console.log('Added phone column to companies table');
    }

    return true;
  } catch (error) {
    console.error('Error ensuring company table columns:', error);
    return false;
  }
};

// =====================================================
// Organization Wrapper Model (satisfies Mongoose findById spec)
// =====================================================
const Organization = {
  findById: async (id) => {
    if (!id) return null;
    
    // Check if the id is numeric (SQL ID)
    if (/^\d+$/.test(id)) {
      // First check if it is a company (tenant company)
      const [companies] = await pool.execute(
        `SELECT * FROM companies WHERE id = ? AND is_deleted = 0`,
        [id]
      );
      if (companies.length > 0) {
        return { ...companies[0], _type: 'company' };
      }
      
      // If not, check if it is a client (customer organization)
      const [clients] = await pool.execute(
        `SELECT * FROM clients WHERE id = ? AND is_deleted = 0`,
        [id]
      );
      if (clients.length > 0) {
        return { ...clients[0], _type: 'client' };
      }
    }
    
    return null;
  }
};

/**
 * Get all companies
 * GET /api/v1/companies
 */
const getAll = async (req, res) => {
  const userRole = req.user?.role || 'ADMIN';
  const companyId = req.companyId || req.query.company_id || null;
  const { search, lead_id } = req.query;

  try {
    if (userRole !== 'SUPERADMIN') {
      // Logic for Admin/Employee (Clients)
      try {
        let whereClause = 'WHERE is_deleted = 0 AND company_id = ?';
        const params = [companyId];

        if (search) {
          whereClause += ' AND (company_name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern, searchPattern);
        }

        const [clients] = await pool.execute(
          `SELECT id, company_name as name, industry, email, phone_number as phone, website, address, city, state, zip, country, 
                  status, created_at, updated_at, is_deleted, company_id
           FROM clients 
           ${whereClause}
           ORDER BY created_at DESC`,
          params
        );

        // Get custom fields for each client
        for (let client of clients) {
          client.custom_fields = await customFieldService.getCustomFieldsWithValues(companyId, 'Clients', client.id);
        }

        return res.json({ success: true, data: clients });
      } catch (clientError) {
        console.error('Get clients error:', clientError);
        return res.status(500).json({ success: false, error: clientError.message || 'Failed to fetch clients' });
      }
    } else {
      // Logic for SuperAdmin (Companies)
      try {
        let whereClause = 'WHERE is_deleted = 0';
        const params = [];

        if (lead_id) {
          whereClause += ' AND lead_id = ?';
          params.push(lead_id);
        }

        if (search) {
          whereClause += ' AND name LIKE ?';
          params.push(`%${search}%`);
        }

        const [companies] = await pool.execute(
          `SELECT * FROM companies 
           ${whereClause}
           ORDER BY created_at DESC`,
          params
        );

        const defaultLogo = await settingsService.getSetting('company_logo', null);

        // Get custom fields for each company
        const companiesWithCF = await Promise.all(companies.map(async (c) => {
          const custom_fields = await customFieldService.getCustomFieldsWithValues(c.id, 'Companies', c.id);
          return {
            ...c,
            logo: c.logo || defaultLogo,
            custom_fields
          };
        }));

        return res.json({
          success: true,
          data: companiesWithCF
        });
      } catch (companyError) {
        console.error('Get companies error:', companyError);
        return res.status(500).json({ success: false, error: companyError.message || 'Failed to fetch companies' });
      }
    }
  } catch (error) {
    console.error('Critical getAll error:', error);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_e9cf3193') : "Internal server error" });
  }
};

/**
 * Get company by ID
 * GET /api/v1/companies/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || 'ADMIN';
    const companyId = req.companyId || req.query.company_id || null; // From JWT auth

    const customerOrganizationId = id || req.query.customerOrganizationId || req.body.customerOrganizationId || null;
    
    // 2. Add console logs
    console.log('--- Customer Organization Debug Log ---');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.params:', JSON.stringify(req.params, null, 2));
    console.log('customerOrganizationId:', customerOrganizationId);

    // 4. Validate customerOrganizationId
    let isIdInvalid = false;
    let validationErrorMsg = null;

    if (customerOrganizationId === undefined || customerOrganizationId === null || customerOrganizationId === '') {
      isIdInvalid = true;
      validationErrorMsg = "Customer organization ID is undefined or null";
    } else {
      const idStr = String(customerOrganizationId);
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(idStr);
      const isNumericId = /^\d+$/.test(idStr);

      if (isMongoId) {
        console.warn(`⚠️ Warning: MongoDB ObjectId format detected: ${customerOrganizationId}. This system uses MySQL integer IDs.`);
        isIdInvalid = true;
        validationErrorMsg = "Invalid MongoDB ObjectId for MySQL system";
      } else if (!isNumericId) {
        isIdInvalid = true;
        validationErrorMsg = "Invalid organization ID format";
      }
    }

    if (isIdInvalid) {
      console.error(`❌ Validation failed: ${validationErrorMsg}`);
      return res.status(404).json({
        success: false,
        error: "Customer organization not found"
      });
    }

    // 3. Verify if organization exists using Organization.findById
    const organization = await Organization.findById(customerOrganizationId);
    if (!organization) {
      console.error(`❌ Organization with ID ${customerOrganizationId} not found in database.`);
      return res.status(404).json({
        success: false,
        error: "Customer organization not found"
      });
    }

    if (userRole !== 'SUPERADMIN') {
      // Check if the requested ID is the user's own company ID.
      // If it is, we return the tenant company record from the 'companies' table.
      if (String(id) === String(companyId) && organization._type === 'company') {
        const company = organization;
        if (!company.logo) {
          company.logo = await settingsService.getSetting('company_logo', null);
        }
        // Get custom fields using service
        company.custom_fields = await customFieldService.getCustomFieldsWithValues(company.id, 'Companies', company.id);

        return res.json({
          success: true,
          data: company
        });
      }

      // If it's not the user's own company, check if it exists in the 'clients' table
      // AND verify it belongs to the user's company (tenant isolation)
      if (organization._type !== 'client' || organization.company_id !== companyId) {
        console.error(`❌ Organization with ID ${customerOrganizationId} is not a valid client of company ${companyId}`);
        return res.status(404).json({
          success: false,
          error: "Customer organization not found"
        });
      }

      const client = organization;
      client.name = client.company_name;
      // Get custom fields using service
      client.custom_fields = await customFieldService.getCustomFieldsWithValues(companyId, 'Clients', client.id);

      return res.json({
        success: true,
        data: client
      });
    }

    // For SuperAdmin
    await ensureTableColumns();

    if (organization._type !== 'company') {
      return res.status(404).json({
        success: false,
        error: "Company not found"
      });
    }

    const company = organization;
    if (!company.logo) {
      company.logo = await settingsService.getSetting('company_logo', null);
    }

    // Get custom fields using service
    company.custom_fields = await customFieldService.getCustomFieldsWithValues(company.id, 'Companies', company.id);

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Get company by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company details'
    });
  }
};

/**
 * Create new company
 * POST /api/v1/companies
 */
const create = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      industry,
      website,
      address,
      city,
      state,
      country,
      notes,
      logo,
      currency = 'USD',
      timezone = 'UTC',
      lead_id,
      custom_fields = {}
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_844728e1') : "Company name is required"
      });
    }

    const userRole = req.user?.role || 'ADMIN';
    const companyIdFromToken = req.companyId || req.body.company_id || req.query.company_id;

    let result;
    if (userRole === 'SUPERADMIN') {
      [result] = await pool.execute(
        `INSERT INTO companies (name, email, phone, industry, website, address, notes, logo, currency, timezone, lead_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email ?? null, phone ?? null, industry ?? null, website ?? null, address ?? null, notes ?? null, logo ?? null, currency, timezone, lead_id ?? null]
      );
    } else {
      // Create Client (Customer Organization) for Admins
      if (!companyIdFromToken) {
        return res.status(400).json({ success: false, error: "company_id is required for non-superadmins" });
      }

      const ownerId = req.userId || req.body.user_id || 1;

      [result] = await pool.execute(
        `INSERT INTO clients (company_name, industry, email, phone_number, website, address, city, state, country, status, company_id, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, industry ?? null, email ?? null, phone ?? null, website ?? null, address ?? null, city ?? null, state ?? null, country ?? 'United States', 'Active', companyIdFromToken, ownerId]
      );
    }

    const companyId = result.insertId;
    const [newCompany] = await pool.execute(
      userRole === 'SUPERADMIN' 
        ? `SELECT * FROM companies WHERE id = ?`
        : `SELECT id, company_name as name, industry, email, phone_number as phone, website, address, city, state, country, status FROM clients WHERE id = ?`,
      [companyId]
    );
    const moduleId = (userRole === 'SUPERADMIN') ? 'Companies' : 'Clients';
    const recordId = companyId;
    const companyIdToUse = (userRole === 'SUPERADMIN') ? companyId : companyIdFromToken;
    
    await customFieldService.saveCustomFields(companyIdToUse, moduleId, recordId, custom_fields);

    res.status(201).json({
      success: true,
      data: newCompany[0],
      message: req.t ? req.t('api_msg_07cc9c6f') : "Company created successfully"
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create company'
    });
  }
};

/**
 * Update company
 * PUT /api/v1/companies/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      industry,
      website,
      address,
      notes,
      logo,
      currency,
      timezone,
      package_id,
      custom_fields
    } = req.body;

    const customerOrganizationId = id;
    
    // Add logs
    console.log('--- Customer Organization Debug Log ---');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.params:', JSON.stringify(req.params, null, 2));
    console.log('customerOrganizationId:', customerOrganizationId);

    // Validate ID
    let isIdInvalid = false;
    let validationErrorMsg = null;

    if (!customerOrganizationId) {
      isIdInvalid = true;
      validationErrorMsg = "Customer organization ID is undefined or null";
    } else {
      const idStr = String(customerOrganizationId);
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(idStr);
      const isNumericId = /^\d+$/.test(idStr);

      if (isMongoId) {
        console.warn(`⚠️ Warning: MongoDB ObjectId format detected: ${customerOrganizationId}. This system uses MySQL integer IDs.`);
        isIdInvalid = true;
        validationErrorMsg = "Invalid MongoDB ObjectId for MySQL system";
      } else if (!isNumericId) {
        isIdInvalid = true;
        validationErrorMsg = "Invalid organization ID format";
      }
    }

    if (isIdInvalid) {
      console.error(`❌ Validation failed: ${validationErrorMsg}`);
      return res.status(404).json({
        success: false,
        error: "Customer organization not found"
      });
    }

    // Verify if organization exists using Organization.findById
    const organization = await Organization.findById(customerOrganizationId);
    if (!organization) {
      console.error(`❌ Organization with ID ${customerOrganizationId} not found in database.`);
      return res.status(404).json({
        success: false,
        error: "Customer organization not found"
      });
    }

    const userRole = req.user?.role || 'ADMIN';
    const companyId = req.companyId || req.body.company_id || req.query.company_id || null;

    // Enforce tenant isolation for non-superadmins
    if (userRole !== 'SUPERADMIN') {
      if (organization._type !== 'client' || organization.company_id !== companyId) {
        console.error(`❌ Organization with ID ${customerOrganizationId} does not belong to company ${companyId}`);
        return res.status(404).json({
          success: false,
          error: "Customer organization not found"
        });
      }
    } else {
      if (organization._type !== 'company') {
        return res.status(404).json({
          success: false,
          error: "Company not found"
        });
      }
    }

    const tableName = (userRole === 'SUPERADMIN') ? 'companies' : 'clients';
    const nameColumn = (userRole === 'SUPERADMIN') ? 'name' : 'company_name';
    const phoneColumn = (userRole === 'SUPERADMIN') ? 'phone' : 'phone_number';

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push(`${nameColumn} = ?`);
      updateValues.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email || null);
    }
    if (phone !== undefined) {
      updateFields.push(`${phoneColumn} = ?`);
      updateValues.push(phone || null);
    }
    if (industry !== undefined) {
      updateFields.push('industry = ?');
      updateValues.push(industry || null);
    }
    if (website !== undefined) {
      updateFields.push('website = ?');
      updateValues.push(website || null);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address || null);
    }
    if (notes !== undefined && userRole === 'SUPERADMIN') {
      updateFields.push('notes = ?');
      updateValues.push(notes || null);
    }
    if (logo !== undefined && userRole === 'SUPERADMIN') {
      updateFields.push('logo = ?');
      updateValues.push(logo);
    }
    if (currency !== undefined && userRole === 'SUPERADMIN') {
      updateFields.push('currency = ?');
      updateValues.push(currency);
    }
    if (timezone !== undefined && userRole === 'SUPERADMIN') {
      updateFields.push('timezone = ?');
      updateValues.push(timezone);
    }
    if (package_id !== undefined && userRole === 'SUPERADMIN') {
      updateFields.push('package_id = ?');
      updateValues.push(package_id || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    const whereClause = (userRole === 'SUPERADMIN') 
      ? 'WHERE id = ?' 
      : 'WHERE id = ? AND company_id = ?';
    
    const whereValues = (userRole === 'SUPERADMIN') 
      ? [id] 
      : [id, companyId];

    await pool.execute(
      `UPDATE ${tableName} 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       ${whereClause}`,
      [...updateValues, ...whereValues]
    );

    // Save custom fields using service
    if (custom_fields) {
      const module = (userRole === 'SUPERADMIN') ? 'Companies' : 'Clients';
      const effectiveCompanyId = (module === 'Companies') ? id : companyId;
      await customFieldService.saveCustomFields(effectiveCompanyId, module, id, custom_fields);
    }

    const [updated] = await pool.execute(
      (userRole === 'SUPERADMIN')
        ? `SELECT * FROM companies WHERE id = ?`
        : `SELECT id, company_name as name, industry, email, phone_number as phone, website, address, city, state, country, status FROM clients WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updated[0],
      message: req.t ? req.t('api_msg_574dda96') : "Company updated successfully"
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update company'
    });
  }
};

/**
 * Delete company (soft delete)
 * DELETE /api/v1/companies/:id
 */
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || 'ADMIN';
    const companyId = req.companyId || req.query.company_id || null;

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Customer organization not found"
      });
    }

    if (userRole !== 'SUPERADMIN') {
      if (organization._type !== 'client' || organization.company_id !== companyId) {
        return res.status(404).json({
          success: false,
          error: "Customer organization not found"
        });
      }
      
      await pool.execute(
        `UPDATE clients 
         SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
      );
    } else {
      if (organization._type !== 'company') {
        return res.status(404).json({
          success: false,
          error: "Company not found"
        });
      }

      await pool.execute(
        `UPDATE companies 
         SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
      );
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_dd7fac3b') : "Company deleted successfully"
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete company'
    });
  }
};

/**
 * Get company with linked contacts and activities
 * GET /api/v1/companies/:id/details
 */
const getCompanyWithDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get company
    const [companies] = await pool.execute(
      `SELECT * FROM companies WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_692d285b') : "Company not found"
      });
    }

    const company = companies[0];
    if (!company.logo) {
      company.logo = await settingsService.getSetting('company_logo', null);
    }

    // Get linked contacts from company_contacts
    const [contacts] = await pool.execute(
      `SELECT * FROM company_contacts
       WHERE company_id = ? AND is_deleted = 0
       ORDER BY is_primary DESC, created_at DESC`,
      [id]
    );
    company.contacts = contacts;

    // Get activities count
    const [activityCount] = await pool.execute(
      `SELECT COUNT(*) as count FROM activities 
       WHERE entity_type = 'company' AND entity_id = ? AND is_deleted = 0`,
      [id]
    );
    company.activities_count = activityCount[0].count;

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company details'
    });
  }
};

/**
 * Get company activities
 * GET /api/v1/companies/:id/activities
 */
const getCompanyActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    let whereClause = 'WHERE entity_type = ? AND entity_id = ? AND is_deleted = 0';
    const params = ['company', id];

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
    console.error('Get company activities error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_b2bb6964') : "Failed to fetch activities"
    });
  }
};

/**
 * Add activity to company
 * POST /api/v1/companies/:id/activities
 */
const addCompanyActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, follow_up_at, meeting_link, is_pinned, assigned_to } = req.body;
    const userId = req.userId;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_93c21665') : "type and description are required"
      });
    }

    let assigneeId = (() => {
        let val = assigned_to;
        if (Array.isArray(val)) val = val[0];
        else if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
            try { const p = JSON.parse(val); if (Array.isArray(p)) val = p[0]; } catch(e) { val = val.replace(/[\[\]]/g, ''); }
        }
        return (val && val !== '') ? val : null;
    })();
    if (!assigneeId) {
        assigneeId = userId;
    }

    // Insert activity
    const [result] = await pool.execute(
      `INSERT INTO activities (
        type, description, reference_type, reference_id, entity_type, entity_id,
        company_id, lead_id, contact_id, deal_id,
        created_by, assigned_to, follow_up_at, meeting_link, is_pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type, description, 'company', id, 'company', id,
        id, null, null, null,
        userId, assigneeId, follow_up_at || null, meeting_link || null, is_pinned || 0
      ]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: req.t ? req.t('api_msg_cdef6d1c') : "Activity added successfully"
    });
  } catch (error) {
    console.error('Add company activity error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_c761316c') : "Failed to add activity"
    });
  }
};

/**
 * Add contact to company
 * POST /api/v1/companies/:id/contacts
 */
const addContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, job_title, email, phone, is_primary } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_b8d89881') : "Name and email are required"
      });
    }

    // Check if company exists
    const [companies] = await pool.execute(
      `SELECT id FROM companies WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_692d285b') : "Company not found"
      });
    }

    // If setting as primary, unset other primary contacts
    if (is_primary) {
      await pool.execute(
        `UPDATE company_contacts SET is_primary = 0 WHERE company_id = ?`,
        [id]
      );
    }

    // Insert contact
    const [result] = await pool.execute(
      `INSERT INTO company_contacts (
        company_id, name, job_title, email, phone, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, job_title, email, phone, is_primary ? 1 : 0]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: req.t ? req.t('api_msg_ff375ac2') : "Contact added successfully"
    });
  } catch (error) {
    console.error('Add company contact error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_5de94db4') : "Failed to add contact"
    });
  }
};

/**
 * Get company contacts
 * GET /api/v1/companies/:id/contacts
 */
const getContacts = async (req, res) => {
  try {
    const { id } = req.params;

    const [contacts] = await pool.execute(
      `SELECT * FROM company_contacts
       WHERE company_id = ? AND is_deleted = 0
       ORDER BY is_primary DESC, created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('Get company contacts error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_b4210ea5') : "Failed to fetch contacts"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteCompany,
  getCompanyWithDetails,
  getCompanyActivities,
  addCompanyActivity,
  addContact,
  getContacts
};

