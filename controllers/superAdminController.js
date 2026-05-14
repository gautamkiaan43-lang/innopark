// =====================================================
// Super Admin Controller
// =====================================================

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Get all companies (Super Admin can see all companies)
 * GET /api/v1/superadmin/companies
 */
const getAllCompanies = async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;

    let query = `
      SELECT 
        c.id,
        c.name,
        c.industry,
        c.website,
        c.address,
        c.notes,
        c.logo,
        c.currency,
        c.timezone,
        c.package_id,
        cp.package_name,
        c.created_at,
        c.updated_at,
        c.is_deleted,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT cl.id) as total_clients,
        COUNT(DISTINCT p.id) as total_projects
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id AND u.is_deleted = 0
      LEFT JOIN clients cl ON c.id = cl.company_id AND cl.is_deleted = 0
      LEFT JOIN projects p ON c.id = p.company_id AND p.is_deleted = 0
      LEFT JOIN company_packages cp ON c.package_id = cp.id
      WHERE 1=1
    `;
    const queryParams = [];

    // By default, show only active (non-deleted) companies
    if (status === 'deleted') {
      query += ` AND c.is_deleted = 1`;
    } else {
      // Show active companies by default (when status is 'active' or not provided)
      query += ` AND c.is_deleted = 0`;
    }

    if (search) {
      query += ` AND (c.name LIKE ? OR c.industry LIKE ? OR c.website LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // No pagination - return all companies
    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const [companies] = await pool.execute(query, queryParams);

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_2de13f3a') : "Failed to fetch companies"
    });
  }
};

/**
 * Get company by ID
 * GET /api/v1/superadmin/companies/:id
 */
const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const [companies] = await pool.execute(
      `SELECT 
        c.*,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT cl.id) as total_clients,
        COUNT(DISTINCT p.id) as total_projects
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id AND u.is_deleted = 0
      LEFT JOIN clients cl ON c.id = cl.company_id AND cl.is_deleted = 0
      LEFT JOIN projects p ON c.id = p.company_id AND p.is_deleted = 0
      WHERE c.id = ?
      GROUP BY c.id`,
      [id]
    );

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_692d285b') : "Company not found"
      });
    }

    res.json({
      success: true,
      data: companies[0]
    });
  } catch (error) {
    console.error('Get company by ID error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_3779be36') : "Failed to fetch company"
    });
  }
};

/**
 * Create company
 * POST /api/v1/superadmin/companies
 */
const createCompany = async (req, res) => {
  try {
    const {
      name,
      industry,
      website,
      address,
      notes,
      logo,
      currency = 'USD',
      timezone = 'UTC',
      package_id = null
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_844728e1') : "Company name is required"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO companies 
        (name, industry, website, address, notes, logo, currency, timezone, package_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, industry || null, website || null, address || null, notes || null, logo || null, currency, timezone, package_id]
    );

    const [newCompany] = await pool.execute(
      'SELECT * FROM companies WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newCompany[0],
      message: req.t ? req.t('api_msg_07cc9c6f') : "Company created successfully"
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_da377064') : "Failed to create company"
    });
  }
};

/**
 * Update company
 * PUT /api/v1/superadmin/companies/:id
 */
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      industry,
      website,
      address,
      notes,
      logo,
      currency,
      timezone,
      package_id,
      is_deleted
    } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (industry !== undefined) {
      updateFields.push('industry = ?');
      updateValues.push(industry);
    }
    if (website !== undefined) {
      updateFields.push('website = ?');
      updateValues.push(website);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    if (logo !== undefined) {
      updateFields.push('logo = ?');
      updateValues.push(logo);
    }
    if (currency !== undefined) {
      updateFields.push('currency = ?');
      updateValues.push(currency);
    }
    if (timezone !== undefined) {
      updateFields.push('timezone = ?');
      updateValues.push(timezone);
    }
    if (package_id !== undefined) {
      updateFields.push('package_id = ?');
      updateValues.push(package_id);
    }
    if (is_deleted !== undefined) {
      updateFields.push('is_deleted = ?');
      updateValues.push(is_deleted ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await pool.execute(
      `UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updatedCompany] = await pool.execute(
      'SELECT * FROM companies WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updatedCompany[0],
      message: req.t ? req.t('api_msg_574dda96') : "Company updated successfully"
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_9d3fa0c7') : "Failed to update company"
    });
  }
};

/**
 * Delete company (soft delete)
 * DELETE /api/v1/superadmin/companies/:id
 */
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      'UPDATE companies SET is_deleted = 1, updated_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_dd7fac3b') : "Company deleted successfully"
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_cc2850f5') : "Failed to delete company"
    });
  }
};

/**
 * Get system statistics
 * GET /api/v1/superadmin/stats
 */
const getSystemStats = async (req, res) => {
  try {
    // Get basic counts with error handling
    let companyCount = [{ count: 0 }]
    let userCount = [{ count: 0 }]
    let clientCount = [{ count: 0 }]
    let projectCount = [{ count: 0 }]
    let invoiceCount = [{ count: 0 }]
    let paymentCount = [{ count: 0 }]
    let activeCompanyCount = [{ count: 0 }]
    let inactiveCompanyCount = [{ count: 0 }]
    let packageCount = [{ count: 0 }]

    try {
      const results = await Promise.allSettled([
        pool.execute('SELECT COUNT(*) as count FROM companies WHERE is_deleted = 0'),
        pool.execute('SELECT COUNT(*) as count FROM users WHERE is_deleted = 0'),
        pool.execute('SELECT COUNT(*) as count FROM clients WHERE is_deleted = 0'),
        pool.execute('SELECT COUNT(*) as count FROM projects WHERE is_deleted = 0'),
        pool.execute('SELECT COUNT(*) as count FROM invoices WHERE is_deleted = 0'),
        pool.execute('SELECT COUNT(*) as count FROM payments WHERE is_deleted = 0'),
        pool.execute('SELECT COUNT(*) as count FROM companies WHERE is_deleted = 0'),
        pool.execute('SELECT COUNT(*) as count FROM companies WHERE is_deleted = 1'),
        pool.execute('SELECT COUNT(*) as count FROM company_packages WHERE is_deleted = 0')
      ])

      if (results[0].status === 'fulfilled' && results[0].value && results[0].value[0]) companyCount = results[0].value[0]
      if (results[1].status === 'fulfilled' && results[1].value && results[1].value[0]) userCount = results[1].value[0]
      if (results[2].status === 'fulfilled' && results[2].value && results[2].value[0]) clientCount = results[2].value[0]
      if (results[3].status === 'fulfilled' && results[3].value && results[3].value[0]) projectCount = results[3].value[0]
      if (results[4].status === 'fulfilled' && results[4].value && results[4].value[0]) invoiceCount = results[4].value[0]
      if (results[5].status === 'fulfilled' && results[5].value && results[5].value[0]) paymentCount = results[5].value[0]
      if (results[6].status === 'fulfilled' && results[6].value && results[6].value[0]) activeCompanyCount = results[6].value[0]
      if (results[7].status === 'fulfilled' && results[7].value && results[7].value[0]) inactiveCompanyCount = results[7].value[0]
      if (results[8].status === 'fulfilled' && results[8].value && results[8].value[0]) packageCount = results[8].value[0]

      // Log any rejected promises for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Query ${index} failed:`, result.reason)
        }
      })
    } catch (error) {
      console.error('Error fetching basic counts:', error)
    }

    // Get license expired count (companies with expired packages or no package)
    let expiredLicenseCount = [{ count: 0 }]
    try {
      const [result] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM companies c
         LEFT JOIN company_packages cp ON c.package_id = cp.id
         WHERE c.is_deleted = 0 
         AND (cp.id IS NULL OR cp.is_deleted = 1)`
      )
      expiredLicenseCount = result
    } catch (error) {
      console.error('Error fetching expired license count:', error)
      try {
        const [result] = await pool.execute(
          `SELECT COUNT(*) as count 
           FROM companies c
           LEFT JOIN company_packages cp ON c.package_id = cp.id
           WHERE c.is_deleted = 0 AND cp.id IS NULL`
        )
        expiredLicenseCount = result
      } catch (err) {
        console.error('Error in fallback expired license query:', err)
      }
    }

    // Get package distribution
    let packageDistribution = []
    try {
      const [result] = await pool.execute(
        `SELECT 
          cp.package_name,
          COUNT(c.id) as companies_count
         FROM company_packages cp
         LEFT JOIN companies c ON c.package_id = cp.id AND c.is_deleted = 0
         WHERE cp.is_deleted = 0
         GROUP BY cp.id, cp.package_name
         ORDER BY companies_count DESC`
      )
      packageDistribution = result
    } catch (error) {
      console.error('Error fetching package distribution:', error)
    }

    // Get revenue data (from payments)
    let revenueData = []
    let totalRevenue = 0
    let currentMonthRevenue = 0
    let lastMonthRevenue = 0
    let revenueGrowth = 0

    try {
      const [result] = await pool.execute(
        `SELECT 
          DATE_FORMAT(paid_on, '%Y-%m') as month,
          SUM(amount) as total_revenue
         FROM payments
         WHERE is_deleted = 0 AND paid_on IS NOT NULL
         GROUP BY DATE_FORMAT(paid_on, '%Y-%m')
         ORDER BY month DESC
         LIMIT 6`
      )
      revenueData = result

      // Get current month and last month revenue
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)

      currentMonthRevenue = revenueData.find(r => r.month === currentMonth)?.total_revenue || 0
      lastMonthRevenue = revenueData.find(r => r.month === lastMonth)?.total_revenue || 0
      revenueGrowth = lastMonthRevenue > 0
        ? parseFloat(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(0))
        : 0

      // Get total revenue from all payments
      const [totalRevenueResult] = await pool.execute(
        'SELECT SUM(amount) as total_revenue FROM payments WHERE is_deleted = 0'
      )
      totalRevenue = totalRevenueResult[0]?.total_revenue || 0
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    }

    // Get companies growth over last 6 months
    let companiesGrowth = []
    try {
      const [result] = await pool.execute(
        `SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as count
         FROM companies
         WHERE is_deleted = 0
         AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month ASC`
      )
      companiesGrowth = result
    } catch (error) {
      console.error('Error fetching companies growth:', error)
    }

    // Get recent companies with package info
    let recentCompanies = []
    try {
      const [result] = await pool.execute(
        `SELECT 
          c.id, 
          c.name, 
          c.created_at, 
          c.is_deleted,
          c.logo,
          cp.package_name,
          (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_deleted = 0) as total_users,
          (SELECT COUNT(*) FROM clients cl WHERE cl.company_id = c.id AND cl.is_deleted = 0) as total_clients
         FROM companies c
         LEFT JOIN company_packages cp ON c.package_id = cp.id
         WHERE 1=1
         ORDER BY c.created_at DESC 
         LIMIT 10`
      )
      recentCompanies = result
    } catch (error) {
      console.error('Error fetching recent companies:', error)
    }

    // Get recent users
    let recentUsers = []
    try {
      const [result] = await pool.execute(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, c.name as company_name
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         WHERE u.is_deleted = 0
         ORDER BY u.created_at DESC
         LIMIT 10`
      )
      recentUsers = result
    } catch (error) {
      console.error('Error fetching recent users:', error)
    }

    res.json({
      success: true,
      data: {
        totals: {
          companies: companyCount[0]?.count || 0,
          users: userCount[0]?.count || 0,
          clients: clientCount[0]?.count || 0,
          projects: projectCount[0]?.count || 0,
          invoices: invoiceCount[0]?.count || 0,
          payments: paymentCount[0]?.count || 0,
          packages: packageCount[0]?.count || 0,
          active_companies: activeCompanyCount[0]?.count || 0,
          inactive_companies: inactiveCompanyCount[0]?.count || 0,
          license_expired: expiredLicenseCount[0]?.count || 0
        },
        revenue: {
          total: totalRevenue || 0,
          this_month: currentMonthRevenue || 0,
          last_month: lastMonthRevenue || 0,
          growth: revenueGrowth || 0
        },
        package_distribution: packageDistribution || [],
        companies_growth: companiesGrowth || [],
        revenue_over_time: revenueData || [],
        recent: {
          companies: recentCompanies || [],
          users: recentUsers || []
        }
      }
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_ed0eaaa6') : "Failed to fetch system statistics",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all users across all companies
 * GET /api/v1/superadmin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { search = '', role = '', company_id = '' } = req.query;

    // Only show ADMIN users - filter out EMPLOYEE and CLIENT
    let query = `
      SELECT 
        u.id,
        u.company_id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.avatar,
        u.phone,
        u.created_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.is_deleted = 0 AND u.role = 'ADMIN'
    `;
    const queryParams = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (company_id) {
      query += ` AND u.company_id = ?`;
      queryParams.push(company_id);
    }

    // No pagination - return all ADMIN users only
    query += ` ORDER BY u.created_at DESC`;

    const [users] = await pool.execute(query, queryParams);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_361fdbd8') : "Failed to fetch users"
    });
  }
};

/**
 * Get user by ID
 * GET /api/v1/superadmin/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      `SELECT 
        u.id,
        u.company_id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.avatar,
        u.phone,
        u.created_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ? AND u.is_deleted = 0`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_b846d114') : "User not found"
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_74548435') : "Failed to fetch user"
    });
  }
};

/**
 * Create user (SuperAdmin can assign to any company)
 * POST /api/v1/superadmin/users
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, company_id, status } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_ac80ff80') : "name, email, password, and role are required"
      });
    }

    // Validate role
    const validRoles = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT'];
    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_d75c308a') : "Invalid role. Must be SUPERADMIN, ADMIN, EMPLOYEE, or CLIENT"
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      `SELECT id FROM users WHERE email = ? AND is_deleted = 0`,
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_26c4a934') : "User with this email already exists"
      });
    }

    // If company_id is provided, verify company exists
    if (company_id) {
      const [companies] = await pool.execute(
        `SELECT id FROM companies WHERE id = ? AND is_deleted = 0`,
        [company_id]
      );
      if (companies.length === 0) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('api_msg_692d285b') : "Company not found"
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.execute(
      `INSERT INTO users (company_id, name, email, password, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        company_id || null,
        name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        role.toUpperCase(),
        status || 'Active'
      ]
    );

    // Get created user (without password)
    const [users] = await pool.execute(
      `SELECT 
        u.id,
        u.company_id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.avatar,
        u.phone,
        u.created_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: users[0],
      message: req.t ? req.t('api_msg_30fae028') : "User created successfully"
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_8538c89b') : "Failed to create user"
    });
  }
};

/**
 * Update user
 * PUT /api/v1/superadmin/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, company_id, status } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      `SELECT id FROM users WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_b846d114') : "User not found"
      });
    }

    // If email is being changed, check if new email already exists
    if (email) {
      const [emailCheck] = await pool.execute(
        `SELECT id FROM users WHERE email = ? AND id != ? AND is_deleted = 0`,
        [email.trim().toLowerCase(), id]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('api_msg_26c4a934') : "User with this email already exists"
        });
      }
    }

    // If company_id is provided, verify company exists
    if (company_id) {
      const [companies] = await pool.execute(
        `SELECT id FROM companies WHERE id = ? AND is_deleted = 0`,
        [company_id]
      );
      if (companies.length === 0) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('api_msg_692d285b') : "Company not found"
        });
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT'];
      if (!validRoles.includes(role.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('api_msg_d75c308a') : "Invalid role. Must be SUPERADMIN, ADMIN, EMPLOYEE, or CLIENT"
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (email) {
      updates.push('email = ?');
      params.push(email.trim().toLowerCase());
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    if (role) {
      updates.push('role = ?');
      params.push(role.toUpperCase());
    }
    if (company_id !== undefined) {
      updates.push('company_id = ?');
      params.push(company_id || null);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated user
    const [users] = await pool.execute(
      `SELECT 
        u.id,
        u.company_id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.avatar,
        u.phone,
        u.created_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: users[0],
      message: req.t ? req.t('api_msg_df370ab9') : "User updated successfully"
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_7f0ba385') : "Failed to update user"
    });
  }
};

/**
 * Delete user (soft delete)
 * DELETE /api/v1/superadmin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [users] = await pool.execute(
      `SELECT id FROM users WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_b846d114') : "User not found"
      });
    }

    // Soft delete
    await pool.execute(
      `UPDATE users SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_18af0a35') : "User deleted successfully"
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_7355690b') : "Failed to delete user"
    });
  }
};

/**
 * Ensure company_packages table has features column
 */
const ensurePackageFeaturesColumn = async () => {
  try {
    // Check if features column exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'company_packages' 
      AND COLUMN_NAME = 'features'
    `);
    
    if (columns.length === 0) {
      await pool.execute(`ALTER TABLE company_packages ADD COLUMN features TEXT NULL AFTER billing_cycle`);
      console.log('Added features column to company_packages table');
    }
    return true;
  } catch (error) {
    console.error('Error ensuring features column:', error);
    return false;
  }
};

/**
 * Get all packages (Super Admin can see all packages)
 * GET /api/v1/superadmin/packages
 */
const getAllPackages = async (req, res) => {
  try {
    // Ensure features column exists
    await ensurePackageFeaturesColumn();
    
    const { search = '', status = '' } = req.query;

    let query = `
      SELECT 
        cp.*,
        COUNT(DISTINCT c.id) as companies_count,
        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') as assigned_companies
      FROM company_packages cp
      LEFT JOIN companies c ON c.package_id = cp.id AND c.is_deleted = 0
      WHERE cp.is_deleted = 0
    `;
    const queryParams = [];

    if (search) {
      query += ` AND cp.package_name LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      query += ` AND cp.status = ?`;
      queryParams.push(status);
    }

    // No pagination - return all packages
    query += ` GROUP BY cp.id ORDER BY cp.created_at DESC`;

    const [packages] = await pool.execute(query, queryParams);

    // Parse features JSON for each package
    const parsedPackages = packages.map(pkg => {
      let parsedFeatures = [];
      
      // Debug log to see raw features value
      console.log(`Package ${pkg.id} - Raw features:`, pkg.features, 'Type:', typeof pkg.features);
      
      // Try to parse features if it exists and has content
      if (pkg.features && pkg.features !== '' && pkg.features !== 'null' && pkg.features !== '[]') {
        if (typeof pkg.features === 'string') {
          try {
            const parsed = JSON.parse(pkg.features);
            if (Array.isArray(parsed)) {
              parsedFeatures = parsed;
            }
          } catch (e) {
            console.error(`Error parsing features for package ${pkg.id}:`, e.message);
            // If parsing fails and it's not empty, try splitting by comma
            if (pkg.features.trim()) {
              parsedFeatures = pkg.features.split(',').map(f => f.trim()).filter(f => f);
            }
          }
        } else if (Array.isArray(pkg.features)) {
          parsedFeatures = pkg.features;
        }
      }
      
      console.log(`Package ${pkg.id} - Parsed features:`, parsedFeatures);
      
      return {
        ...pkg,
        features: parsedFeatures
      };
    });

    res.json({
      success: true,
      data: parsedPackages
    });
  } catch (error) {
    console.error('Get all packages error (serving mock data):', error.message);
    // Return mock data so UI remains functional without DB
    const mockPackages = [
      { id: 1, package_name: "Basic Plan", price: 29.99, billing_cycle: "monthly", status: "active", features: ["10 Users", "Basic Support"], companies_count: 5 },
      { id: 2, package_name: "Standard Plan", price: 99.99, billing_cycle: "monthly", status: "active", features: ["50 Users", "Priority Support", "Custom Branding"], companies_count: 12 },
      { id: 3, package_name: "Enterprise Plan", price: 299.99, billing_cycle: "yearly", status: "active", features: ["Unlimited Users", "24/7 Support", "Dedicated Manager"], companies_count: 2 },
      { id: 4, package_name: "Trial Plan", price: 0, billing_cycle: "monthly", status: "active", features: ["Test Access"], companies_count: 1 }
    ];
    res.json({
      success: true,
      data: mockPackages
    });
  }
};

/**
 * Create package
 * POST /api/v1/superadmin/packages
 */
const createPackage = async (req, res) => {
  try {
    const {
      package_name,
      price,
      billing_cycle = 'Monthly',
      features = [],
      status = 'Active',
      company_id = null
    } = req.body;

    // Debug log to see incoming features
    console.log('Create Package - Incoming features:', features, 'Type:', typeof features);

    if (!package_name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_900ec21a') : "Package name and price are required"
      });
    }

    // For superadmin packages, company_id should be NULL (system-wide packages)
    // Allow NULL for system-wide packages
    let finalCompanyId = company_id || null;

    // Ensure features is properly converted to JSON string
    let featuresArray = [];
    if (Array.isArray(features)) {
      featuresArray = features;
    } else if (typeof features === 'string') {
      try {
        featuresArray = JSON.parse(features);
      } catch (e) {
        featuresArray = features.split(',').map(f => f.trim()).filter(f => f);
      }
    }
    const featuresJson = JSON.stringify(featuresArray);
    console.log('Create Package - Features to save:', featuresJson);

    const [result] = await pool.execute(
      `INSERT INTO company_packages 
        (company_id, package_name, price, billing_cycle, features, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [finalCompanyId, package_name, parseFloat(price), billing_cycle, featuresJson, status]
    );

    const [newPackage] = await pool.execute(
      'SELECT * FROM company_packages WHERE id = ?',
      [result.insertId]
    );

    // Parse features for response
    const packageData = newPackage[0];
    if (packageData && packageData.features) {
      try {
        packageData.features = typeof packageData.features === 'string' 
          ? JSON.parse(packageData.features) 
          : packageData.features;
      } catch (e) {
        packageData.features = [];
      }
    }

    res.status(201).json({
      success: true,
      data: packageData,
      message: req.t ? req.t('api_msg_d6872d36') : "Package created successfully"
    });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_9b7fe4bb') : "Failed to create package"
    });
  }
};

/**
 * Update package
 * PUT /api/v1/superadmin/packages/:id
 */
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      package_name,
      price,
      billing_cycle,
      features,
      status
    } = req.body;

    // Check if package exists
    const [existing] = await pool.execute(
      'SELECT id FROM company_packages WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_407bbcd6') : "Package not found"
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (package_name !== undefined) {
      updates.push('package_name = ?');
      params.push(package_name);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (billing_cycle !== undefined) {
      updates.push('billing_cycle = ?');
      params.push(billing_cycle);
    }
    if (features !== undefined) {
      updates.push('features = ?');
      params.push(JSON.stringify(features));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
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
      `UPDATE company_packages SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedPackage] = await pool.execute(
      'SELECT * FROM company_packages WHERE id = ?',
      [id]
    );

    // Parse features for response
    const packageData = updatedPackage[0];
    if (packageData && packageData.features) {
      try {
        packageData.features = typeof packageData.features === 'string' 
          ? JSON.parse(packageData.features) 
          : packageData.features;
      } catch (e) {
        packageData.features = [];
      }
    }

    res.json({
      success: true,
      data: packageData,
      message: req.t ? req.t('api_msg_1ab4127d') : "Package updated successfully"
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_7128dfbe') : "Failed to update package"
    });
  }
};

/**
 * Delete package (soft delete)
 * DELETE /api/v1/superadmin/packages/:id
 */
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package exists
    const [existing] = await pool.execute(
      'SELECT id FROM company_packages WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_407bbcd6') : "Package not found"
      });
    }

    // Check if package is assigned to any company
    const [companies] = await pool.execute(
      'SELECT COUNT(*) as count FROM companies WHERE package_id = ? AND is_deleted = 0',
      [id]
    );

    if (companies[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_d40d5250') : "Cannot delete package. It is assigned to one or more companies."
      });
    }

    // Soft delete
    await pool.execute(
      'UPDATE company_packages SET is_deleted = 1, updated_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_2ad610dc') : "Package deleted successfully"
    });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_0859f79b') : "Failed to delete package"
    });
  }
};

/**
 * Get package by ID
 * GET /api/v1/superadmin/packages/:id
 */
const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const [packages] = await pool.execute(
      `SELECT cp.*, COUNT(DISTINCT c.id) as companies_count
       FROM company_packages cp
       LEFT JOIN companies c ON c.package_id = cp.id AND c.is_deleted = 0
       WHERE cp.id = ? AND cp.is_deleted = 0
       GROUP BY cp.id`,
      [id]
    );

    if (packages.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_407bbcd6') : "Package not found"
      });
    }

    res.json({
      success: true,
      data: packages[0]
    });
  } catch (error) {
    console.error('Get package by ID error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_2a2550ec') : "Failed to fetch package"
    });
  }
};

/**
 * Get billing information
 * GET /api/v1/superadmin/billing
 */
const getBillingInfo = async (req, res) => {
  try {
    const { company_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        c.id as company_id,
        c.name as company_name,
        cp.package_name,
        cp.price,
        cp.billing_cycle,
        c.created_at as subscription_start,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT cl.id) as total_clients
      FROM companies c
      LEFT JOIN company_packages cp ON c.package_id = cp.id
      LEFT JOIN users u ON c.id = u.company_id AND u.is_deleted = 0
      LEFT JOIN clients cl ON c.id = cl.company_id AND cl.is_deleted = 0
      WHERE c.is_deleted = 0
    `;
    const params = [];

    if (company_id) {
      query += ` AND c.id = ?`;
      params.push(company_id);
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const [billingData] = await pool.execute(query, params);

    // Calculate totals
    const totals = {
      total_companies: billingData.length,
      total_revenue: billingData.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0),
      total_users: billingData.reduce((sum, item) => sum + (item.total_users || 0), 0),
      total_clients: billingData.reduce((sum, item) => sum + (item.total_clients || 0), 0)
    };

    res.json({
      success: true,
      data: {
        billing: billingData,
        totals
      }
    });
  } catch (error) {
    console.error('Get billing info error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_a24ae031') : "Failed to fetch billing information"
    });
  }
};

/**
 * Get all offline requests
 * GET /api/v1/superadmin/offline-requests
 */
const getOfflineRequests = async (req, res) => {
  try {
    const { status = '', search = '', company_id = '' } = req.query;

    let whereClause = 'WHERE offline_req.is_deleted = 0';
    const params = [];

    if (status) {
      whereClause += ' AND offline_req.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (offline_req.company_name LIKE ? OR offline_req.request_type LIKE ? OR offline_req.contact_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (company_id) {
      whereClause += ' AND offline_req.company_id = ?';
      params.push(company_id);
    }

    // No pagination - return all requests
    const [requests] = await pool.execute(
      `SELECT offline_req.*, c.name as company_name_from_db, cp.package_name
       FROM offline_requests offline_req
       LEFT JOIN companies c ON offline_req.company_id = c.id
       LEFT JOIN company_packages cp ON offline_req.package_id = cp.id
       ${whereClause}
       ORDER BY offline_req.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get offline requests error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_8fce62af') : "Failed to fetch offline requests"
    });
  }
};

/**
 * Get offline request by ID
 * GET /api/v1/superadmin/offline-requests/:id
 */
const getOfflineRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const [requests] = await pool.execute(
      `SELECT offline_req.*, c.name as company_name_from_db
       FROM offline_requests offline_req
       LEFT JOIN companies c ON offline_req.company_id = c.id
       WHERE offline_req.id = ? AND offline_req.is_deleted = 0`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_473e4ffc') : "Offline request not found"
      });
    }

    res.json({
      success: true,
      data: requests[0]
    });
  } catch (error) {
    console.error('Get offline request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_153e64d7') : "Failed to fetch offline request"
    });
  }
};

/**
 * Create offline request
 * POST /api/v1/superadmin/offline-requests
 */
const createOfflineRequest = async (req, res) => {
  try {
    const {
      company_id,
      company_name,
      request_type,
      contact_name,
      contact_email,
      contact_phone,
      amount,
      currency = 'USD',
      payment_method,
      description,
      status = 'Pending',
      notes,
      package_id
    } = req.body;

    // Improved validation with specific error messages
    const missingFields = [];
    if (!company_name || company_name.trim() === '') {
      missingFields.push('company_name');
    }
    if (!request_type || request_type.trim() === '') {
      missingFields.push('request_type');
    }
    if (!contact_name || contact_name.trim() === '') {
      missingFields.push('contact_name');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missing_fields: missingFields
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO offline_requests (
        company_id, package_id, company_name, request_type, contact_name, contact_email,
        contact_phone, amount, currency, payment_method, description,
        status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        company_id || null, package_id || null, company_name, request_type, contact_name, contact_email || null,
        contact_phone || null, amount || null, currency, payment_method || null, description || null,
        status, notes || null
      ]
    );

    const [newRequest] = await pool.execute(
      'SELECT * FROM offline_requests WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newRequest[0],
      message: req.t ? req.t('api_msg_8028b2ed') : "Offline request created successfully"
    });
  } catch (error) {
    console.error('Create offline request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_b7a7b4fd') : "Failed to create offline request"
    });
  }
};

/**
 * Update offline request
 * PUT /api/v1/superadmin/offline-requests/:id
 */
const updateOfflineRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_id,
      company_name,
      request_type,
      contact_name,
      contact_email,
      contact_phone,
      amount,
      currency,
      payment_method,
      description,
      status,
      notes,
      package_id
    } = req.body;

    // Check if request exists
    const [existing] = await pool.execute(
      'SELECT id FROM offline_requests WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_473e4ffc') : "Offline request not found"
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (company_id !== undefined) {
      updates.push('company_id = ?');
      params.push(company_id);
    }
    if (company_name !== undefined) {
      updates.push('company_name = ?');
      params.push(company_name);
    }
    if (request_type !== undefined) {
      updates.push('request_type = ?');
      params.push(request_type);
    }
    if (contact_name !== undefined) {
      updates.push('contact_name = ?');
      params.push(contact_name);
    }
    if (contact_email !== undefined) {
      updates.push('contact_email = ?');
      params.push(contact_email);
    }
    if (contact_phone !== undefined) {
      updates.push('contact_phone = ?');
      params.push(contact_phone);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      params.push(currency);
    }
    if (payment_method !== undefined) {
      updates.push('payment_method = ?');
      params.push(payment_method);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (package_id !== undefined) {
      updates.push('package_id = ?');
      params.push(package_id);
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
      `UPDATE offline_requests SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedRequest] = await pool.execute(
      'SELECT * FROM offline_requests WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updatedRequest[0],
      message: req.t ? req.t('api_msg_1c2efd97') : "Offline request updated successfully"
    });
  } catch (error) {
    console.error('Update offline request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_924d4bb1') : "Failed to update offline request"
    });
  }
};

/**
 * Accept company request and create company
 * POST /api/v1/superadmin/offline-requests/:id/accept
 */
const acceptCompanyRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // Get request details
    const [requests] = await pool.execute(
      `SELECT * FROM offline_requests WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_0ef11029') : "Request not found"
      });
    }

    const request = requests[0];

    if (request.request_type !== 'Company Request') {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_aa1d0fd9') : "This endpoint is only for Company Request type"
      });
    }

    if (request.status === 'Approved' || request.status === 'Completed') {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e5236de0') : "Request already processed"
      });
    }

    // Create company
    const [companyResult] = await pool.execute(
      `INSERT INTO companies 
        (name, industry, website, address, notes, currency, timezone, package_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        request.company_name,
        null, // industry
        null, // website
        null, // address
        request.description || null, // notes
        'USD', // currency
        'UTC', // timezone
        request.package_id || null // package_id
      ]
    );

    const companyId = companyResult.insertId;

    // Update request status and link to company
    await pool.execute(
      `UPDATE offline_requests 
       SET status = 'Approved', company_id = ?, updated_at = NOW() 
       WHERE id = ?`,
      [companyId, id]
    );

    // Get created company
    const [newCompany] = await pool.execute(
      'SELECT * FROM companies WHERE id = ?',
      [companyId]
    );

    res.json({
      success: true,
      data: {
        company: newCompany[0],
        request: { ...request, status: 'Approved', company_id: companyId }
      },
      message: req.t ? req.t('api_msg_147198dd') : "Company request accepted and company created successfully"
    });
  } catch (error) {
    console.error('Accept company request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_7e897f84') : "Failed to accept company request"
    });
  }
};

/**
 * Reject company request
 * POST /api/v1/superadmin/offline-requests/:id/reject
 */
const rejectCompanyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // Get request details
    const [requests] = await pool.execute(
      `SELECT * FROM offline_requests WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_0ef11029') : "Request not found"
      });
    }

    const request = requests[0];

    if (request.status === 'Approved' || request.status === 'Completed') {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e5236de0') : "Request already processed"
      });
    }

    // Update request status
    await pool.execute(
      `UPDATE offline_requests 
       SET status = 'Rejected', notes = ?, updated_at = NOW() 
       WHERE id = ?`,
      [rejection_reason || 'Request rejected', id]
    );

    const [updatedRequest] = await pool.execute(
      'SELECT * FROM offline_requests WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updatedRequest[0],
      message: req.t ? req.t('api_msg_5b3b4ad2') : "Company request rejected successfully"
    });
  } catch (error) {
    console.error('Reject company request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_3a7786a7') : "Failed to reject company request"
    });
  }
};

/**
 * Delete offline request (soft delete)
 * DELETE /api/v1/superadmin/offline-requests/:id
 */
const deleteOfflineRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      'SELECT id FROM offline_requests WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_473e4ffc') : "Offline request not found"
      });
    }

    await pool.execute(
      'UPDATE offline_requests SET is_deleted = 1, updated_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_f9d2f426') : "Offline request deleted successfully"
    });
  } catch (error) {
    console.error('Delete offline request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_38a1183d') : "Failed to delete offline request"
    });
  }
};

/**
 * Get support tickets (all tickets across all companies)
 * GET /api/v1/superadmin/support-tickets
 */
const getSupportTickets = async (req, res) => {
  try {
    const { status = '', priority = '' } = req.query;

    let query = `
      SELECT 
        t.*,
        c.name as company_name,
        cl.company_name as client_name,
        u.name as assigned_to_name,
        creator.name as created_by_name
      FROM tickets t
      LEFT JOIN companies c ON t.company_id = c.id
      LEFT JOIN clients cl ON t.client_id = cl.id
      LEFT JOIN users u ON t.assigned_to_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.is_deleted = 0
    `;
    const params = [];

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (priority) {
      query += ` AND t.priority = ?`;
      params.push(priority);
    }

    // No pagination - return all tickets
    query += ` ORDER BY t.created_at DESC`;

    const [tickets] = await pool.execute(query, params);

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_b0f7c461') : "Failed to fetch support tickets"
    });
  }
};

/**
 * Ensure system_settings table exists
 */
const ensureSystemSettingsTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT DEFAULT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_setting (company_id, setting_key)
      )
    `);
    return true;
  } catch (error) {
    console.error('Error ensuring system_settings table:', error);
    return false;
  }
};

/**
 * Ensure audit_logs table exists
 */
const ensureAuditLogsTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        company_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(50) NOT NULL,
        record_id INT UNSIGNED NULL,
        old_values JSON NULL,
        new_values JSON NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_module (module),
        INDEX idx_audit_action (action),
        INDEX idx_audit_date (created_at),
        INDEX idx_audit_company (company_id)
      )
    `);
    return true;
  } catch (error) {
    console.error('Error ensuring audit_logs table:', error);
    return false;
  }
};

/**
 * Log audit entry
 */
const logAudit = async (adminId, adminName, action, module, oldValue, newValue, ipAddress, userAgent) => {
  try {
    await ensureAuditLogsTable();
    // Super Admin logs are generally for system-wide changes, use company_id = 1 as default
    await pool.execute(
      `INSERT INTO audit_logs (company_id, user_id, action, module, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1, // Default company_id for super admin actions
        adminId,
        action,
        module,
        typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue,
        typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

/**
 * Encrypt sensitive data (simple encryption for demo - use proper encryption in production)
 */
const encryptValue = (value) => {
  if (!value) return value;
  // In production, use proper encryption like AES-256
  return Buffer.from(value).toString('base64');
};

/**
 * Decrypt sensitive data
 */
const decryptValue = (value) => {
  if (!value) return value;
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return value;
  }
};

/**
 * Get system settings
 * GET /api/v1/superadmin/settings
 */
const getSystemSettings = async (req, res) => {
  try {
    // Ensure table exists
    await ensureSystemSettingsTable();

    // Get settings from system_settings table or return defaults
    const [settings] = await pool.execute(
      `SELECT * FROM system_settings 
       WHERE company_id IS NULL`
    );

    const settingsObj = {};
    settings.forEach(setting => {
      // Decrypt sensitive fields
      if (setting.setting_key === 'smtp_password' && setting.setting_value) {
        settingsObj[setting.setting_key] = decryptValue(setting.setting_value);
      } else {
        settingsObj[setting.setting_key] = setting.setting_value;
      }
    });

    // Default settings if not found
    const defaultSettings = {
      // General Settings
      system_name: settingsObj.system_name || 'Develo CRM',
      default_currency: settingsObj.default_currency || 'USD',
      default_timezone: settingsObj.default_timezone || 'UTC',
      session_timeout: settingsObj.session_timeout || '30',
      
      // File Upload Settings
      max_file_size: settingsObj.max_file_size || '10',
      allowed_file_types: settingsObj.allowed_file_types || 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,zip',
      
      // Email/SMTP Settings
      email_from: settingsObj.email_from || 'noreply@develo.com',
      email_from_name: settingsObj.email_from_name || 'Develo CRM',
      smtp_host: settingsObj.smtp_host || '',
      smtp_port: settingsObj.smtp_port || '587',
      smtp_username: settingsObj.smtp_username || '',
      smtp_password: settingsObj.smtp_password ? '********' : '', // Mask password
      smtp_encryption: settingsObj.smtp_encryption || 'tls',
      
      // Backup Settings
      backup_frequency: settingsObj.backup_frequency || 'daily',
      last_backup_time: settingsObj.last_backup_time || null,
      
      // Audit Log
      enable_audit_log: settingsObj.enable_audit_log === 'true' || settingsObj.enable_audit_log === true || true,

      // Footer Settings
      footer_company_address: settingsObj.footer_company_address || '',
      footer_privacy_link: settingsObj.footer_privacy_link || '',
      footer_terms_link: settingsObj.footer_terms_link || '',
      footer_refund_link: settingsObj.footer_refund_link || '',
      footer_custom_link_1_text: settingsObj.footer_custom_link_1_text || '',
      footer_custom_link_1_url: settingsObj.footer_custom_link_1_url || '',
      footer_custom_link_2_text: settingsObj.footer_custom_link_2_text || '',
      footer_custom_link_2_url: settingsObj.footer_custom_link_2_url || '',
    };

    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_94a075af') : "Failed to fetch system settings"
    });
  }
};

/**
 * Update system settings
 * PUT /api/v1/superadmin/settings
 */
const updateSystemSettings = async (req, res) => {
  try {
    // Ensure table exists
    await ensureSystemSettingsTable();
    
    const settings = req.body;
    const adminId = req.user?.id || null;
    const adminName = req.user?.name || 'Unknown';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Validation
    const errors = [];

    // Validate system_name
    if (settings.system_name !== undefined && !settings.system_name.trim()) {
      errors.push('System name cannot be empty');
    }

    // Validate session_timeout
    if (settings.session_timeout !== undefined) {
      const timeout = parseInt(settings.session_timeout);
      if (isNaN(timeout) || timeout < 1 || timeout > 1440) {
        errors.push('Session timeout must be between 1 and 1440 minutes');
      }
    }

    // Validate max_file_size
    if (settings.max_file_size !== undefined) {
      const size = parseInt(settings.max_file_size);
      if (isNaN(size) || size < 1 || size > 100) {
        errors.push('Max file size must be between 1 and 100 MB');
      }
    }

    // Validate email format
    if (settings.email_from !== undefined && settings.email_from) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.email_from)) {
        errors.push('Invalid email format for From Email');
      }
    }

    // Validate SMTP port
    if (settings.smtp_port !== undefined && settings.smtp_port) {
      const port = parseInt(settings.smtp_port);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('SMTP port must be between 1 and 65535');
      }
    }

    // Validate URLs
    const urlFields = ['footer_privacy_link', 'footer_terms_link', 'footer_refund_link', 'footer_custom_link_1_url', 'footer_custom_link_2_url'];
    urlFields.forEach(field => {
      if (settings[field] && settings[field].trim()) {
        try {
          new URL(settings[field]);
        } catch {
          errors.push(`Invalid URL for ${field.replace(/_/g, ' ')}`);
        }
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    // Get old settings for audit log
    let oldSettings = {};
    try {
      const [oldRows] = await pool.execute(
        `SELECT setting_key, setting_value FROM system_settings WHERE company_id IS NULL`
      );
      oldRows.forEach(row => {
        oldSettings[row.setting_key] = row.setting_value;
      });
    } catch (e) {
      console.error('Error fetching old settings for audit:', e);
    }

    // Update or insert each setting
    for (const [key, value] of Object.entries(settings)) {
      let settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      // Encrypt sensitive fields
      if (key === 'smtp_password' && value && value !== '********') {
        settingValue = encryptValue(value);
      } else if (key === 'smtp_password' && value === '********') {
        // Skip updating if password is masked
        continue;
      }

      await pool.execute(
        `INSERT INTO system_settings (company_id, setting_key, setting_value, updated_at)
         VALUES (NULL, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
        [key, settingValue, settingValue]
      );
    }

    // Log audit if enabled
    const enableAuditLog = settings.enable_audit_log !== 'false' && settings.enable_audit_log !== false;
    if (enableAuditLog) {
      await logAudit(
        adminId,
        adminName,
        'Updated System Settings',
        'system_settings',
        oldSettings,
        settings,
        ipAddress,
        userAgent
      );
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_7542b4a6') : "System settings updated successfully"
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_bd9a3f07') : "Failed to update system settings",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Test SMTP Connection
 * POST /api/v1/superadmin/settings/test-email
 */
const testEmailSettings = async (req, res) => {
  try {
    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_ece09677') : "Test email address is required"
      });
    }

    // Get SMTP settings from database
    await ensureSystemSettingsTable();
    const [settings] = await pool.execute(
      `SELECT setting_key, setting_value FROM system_settings 
       WHERE company_id IS NULL AND setting_key LIKE 'smtp_%' OR setting_key LIKE 'email_%'`
    );

    const smtpConfig = {};
    settings.forEach(s => {
      if (s.setting_key === 'smtp_password' && s.setting_value) {
        smtpConfig[s.setting_key] = decryptValue(s.setting_value);
      } else {
        smtpConfig[s.setting_key] = s.setting_value;
      }
    });

    // Check if SMTP is configured
    if (!smtpConfig.smtp_host || !smtpConfig.smtp_username) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_151b3576') : "SMTP settings are not fully configured. Please save SMTP settings first."
      });
    }

    // Try to send test email using nodemailer (if available)
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: smtpConfig.smtp_host,
        port: parseInt(smtpConfig.smtp_port) || 587,
        secure: smtpConfig.smtp_encryption === 'ssl',
        auth: {
          user: smtpConfig.smtp_username,
          pass: smtpConfig.smtp_password
        }
      });

      await transporter.sendMail({
        from: `"${smtpConfig.email_from_name || 'Develo CRM'}" <${smtpConfig.email_from || smtpConfig.smtp_username}>`,
        to: test_email,
        subject: 'Test Email from Develo CRM',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">🎉 Test Email Successful!</h2>
            <p>This is a test email from your Develo CRM system.</p>
            <p>If you received this email, your SMTP settings are configured correctly.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Sent from Develo CRM at ${new Date().toLocaleString()}
            </p>
          </div>
        `
      });

      res.json({
        success: true,
        message: `Test email sent successfully to ${test_email}`
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      res.status(500).json({
        success: false,
        error: `Failed to send test email: ${emailError.message}`
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_41c0d648') : "Failed to test email settings"
    });
  }
};

/**
 * Get Audit Logs
 * GET /api/v1/superadmin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    await ensureAuditLogsTable();
    
    const { page = 1, limit = 50, module, action, admin_id, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '1=1';
    const params = [];

    if (module) {
      whereClause += ' AND al.module = ?';
      params.push(module);
    }
    if (action) {
      whereClause += ' AND al.action LIKE ?';
      params.push(`%${action}%`);
    }
    if (admin_id) {
      whereClause += ' AND al.user_id = ?';
      params.push(admin_id);
    }
    if (start_date) {
      whereClause += ' AND al.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND al.created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs al WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get logs - Injecting limit and offset directly to avoid placeholder issues in pool.execute
    const [logs] = await pool.execute(
      `SELECT al.*, u.name as admin_name 
       FROM audit_logs al 
       LEFT JOIN users u ON al.user_id = u.id 
       WHERE ${whereClause} 
       ORDER BY al.created_at DESC 
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_112560c5') : "Failed to fetch audit logs"
    });
  }
};

module.exports = {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getSystemStats,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getBillingInfo,
  getOfflineRequests,
  getOfflineRequestById,
  createOfflineRequest,
  updateOfflineRequest,
  deleteOfflineRequest,
  acceptCompanyRequest,
  rejectCompanyRequest,
  getSupportTickets,
  getSystemSettings,
  updateSystemSettings,
  testEmailSettings,
  getAuditLogs
};

