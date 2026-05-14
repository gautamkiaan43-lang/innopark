const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    // Admin must provide company_id - required for filtering
    const filterCompanyId = req.query.company_id || req.body.company_id || req.companyId;
    
    if (!filterCompanyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }
    
    let whereClause = 'WHERE p.company_id = ? AND p.is_deleted = 0';
    const params = [filterCompanyId];

    // Get all positions without pagination
    const [positions] = await pool.execute(
      `SELECT p.*, 
              d.name as department_name,
              c.name as company_name,
              COALESCE((SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id), 0) as total_employees
       FROM positions p
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN companies c ON p.company_id = c.id
       ${whereClause}
       ORDER BY p.name`,
      params
    );
    
    res.json({ 
      success: true, 
      data: positions
    });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_27573372') : "Failed to fetch positions",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Admin must provide company_id - required for filtering
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });
    }

    const [positions] = await pool.execute(
      `SELECT p.*, 
              d.name as department_name,
              c.name as company_name,
              COALESCE((SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id), 0) as total_employees
       FROM positions p
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN companies c ON p.company_id = c.id
       WHERE p.id = ? AND p.company_id = ? AND p.is_deleted = 0`,
      [id, companyId]
    );
    
    if (positions.length === 0) {
      return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_fb17bb43') : "Position not found" });
    }
    
    res.json({ success: true, data: positions[0] });
  } catch (error) {
    console.error('Get position error:', error);
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_52b67cdd') : "Failed to fetch position",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const create = async (req, res) => {
  try {
    const { name, department_id, description, company_id } = req.body;
    
    console.log('=== CREATE POSITION REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('req.companyId:', req.companyId);
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_a659fd82') : "Position name is required" });
    }
    
    // Use company_id from request body, fallback to req.companyId if not provided
    const finalCompanyId = company_id || req.companyId;
    
    if (!finalCompanyId) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_21b48d8a') : "Company is required" });
    }
    
    console.log('Final company_id to use:', finalCompanyId);

    const [result] = await pool.execute(
      `INSERT INTO positions (company_id, name, department_id, description) 
       VALUES (?, ?, ?, ?)`,
      [finalCompanyId, name.trim(), department_id || null, description || null]
    );
    
    console.log('Position created with ID:', result.insertId);
    
    // Fetch the created position with company and department names
    const [newPosition] = await pool.execute(
      `SELECT p.*, 
              d.name as department_name,
              c.name as company_name,
              COALESCE((SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id), 0) as total_employees
       FROM positions p
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN companies c ON p.company_id = c.id
       WHERE p.id = ?`,
      [result.insertId]
    );
    
    console.log('Created position data:', JSON.stringify(newPosition[0], null, 2));
    
    res.status(201).json({ 
      success: true, 
      data: newPosition[0],
      message: req.t ? req.t('api_msg_10db1f90') : "Position created successfully"
    });
  } catch (error) {
    console.error('Create position error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create position',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department_id, description, company_id } = req.body;
    
    console.log('=== UPDATE POSITION REQUEST ===');
    console.log('Position ID:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Query params:', req.query);
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_a659fd82') : "Position name is required" });
    }

    // Get company_id from multiple sources
    const finalCompanyId = req.query.company_id || company_id || req.companyId;
    
    if (!finalCompanyId) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });
    }
    
    console.log('Final company_id to use:', finalCompanyId);

    const updateFields = ['name = ?', 'department_id = ?', 'description = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const updateValues = [name.trim(), department_id ? parseInt(department_id) : null, description || null];
    
    updateValues.push(id, finalCompanyId);
    
    console.log('Update query:', `UPDATE positions SET ${updateFields.join(', ')} WHERE id = ? AND company_id = ? AND is_deleted = 0`);
    console.log('Update values:', updateValues);
    
    const [result] = await pool.execute(
      `UPDATE positions 
       SET ${updateFields.join(', ')}
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      updateValues
    );
    
    console.log('Update result:', { affectedRows: result.affectedRows, changedRows: result.changedRows });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_32d2dc8c') : "Position not found or no changes made" });
    }
    
    // Fetch updated position with company and department names
    const [updatedPosition] = await pool.execute(
      `SELECT p.*, 
              d.name as department_name,
              c.name as company_name,
              COALESCE((SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id), 0) as total_employees
       FROM positions p
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN companies c ON p.company_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    
    res.json({ 
      success: true, 
      data: updatedPosition[0],
      message: req.t ? req.t('api_msg_a83b274f') : "Position updated successfully" 
    });
  } catch (error) {
    console.error('Update position error:', error);
    console.error('Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
    res.status(500).json({ 
      success: false, 
      error: error.sqlMessage || error.message || 'Failed to update position'
    });
  }
};

const deletePosition = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get company_id from multiple sources
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" 
      });
    }
    
    console.log('Deleting position:', id, 'for company:', companyId);
    
    const [result] = await pool.execute(
      `UPDATE positions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );
    
    console.log('Delete result:', { affectedRows: result.affectedRows });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: req.t ? req.t('api_msg_961df1dd') : "Position not found or already deleted" 
      });
    }
    
    res.json({ success: true, message: req.t ? req.t('api_msg_cf387ffa') : "Position deleted successfully" });
  } catch (error) {
    console.error('Delete position error:', error);
    console.error('Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
    res.status(500).json({ 
      success: false, 
      error: error.sqlMessage || error.message || 'Failed to delete position'
    });
  }
};

module.exports = { getAll, getById, create, update, deletePosition };

