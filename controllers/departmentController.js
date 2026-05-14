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
    
    let whereClause = 'WHERE d.company_id = ? AND d.is_deleted = 0';
    const params = [filterCompanyId];
    
    console.log('=== GET DEPARTMENTS REQUEST ===');
    console.log('Query params:', req.query);
    console.log('Filter company_id:', filterCompanyId);
    console.log('req.companyId:', req.companyId);
    console.log('Where clause:', whereClause);
    console.log('Params:', params);

    // Get all departments without pagination
    const [departments] = await pool.execute(
      `SELECT d.*, c.name as company_name,
       COALESCE((SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id), 0) as total_employees
       FROM departments d
       LEFT JOIN companies c ON d.company_id = c.id
       ${whereClause}
       ORDER BY d.name`,
      params
    );
    
    console.log('Total departments found:', departments.length);
    console.log('Departments:', JSON.stringify(departments, null, 2));
    
    res.json({ 
      success: true, 
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      companyId: req.companyId
    });
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_4524fe05') : "Failed to fetch departments",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const create = async (req, res) => {
  try {
    const { name, company_id } = req.body;
    
    console.log('=== CREATE DEPARTMENT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('req.companyId:', req.companyId);
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_c2529329') : "Department name is required" });
    }
    
    // Use company_id from request body, fallback to req.companyId if not provided
    const finalCompanyId = company_id || req.companyId;
    
    if (!finalCompanyId) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_21b48d8a') : "Company is required" });
    }
    
    console.log('Final company_id to use:', finalCompanyId);
    
    const [result] = await pool.execute(
      `INSERT INTO departments (company_id, name) VALUES (?, ?)`,
      [finalCompanyId, name.trim()]
    );
    
    console.log('Department created with ID:', result.insertId);
    
    // Fetch the created department with company name
    const [newDepartment] = await pool.execute(
      `SELECT d.*, c.name as company_name,
       COALESCE((SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id), 0) as total_employees
       FROM departments d
       LEFT JOIN companies c ON d.company_id = c.id
       WHERE d.id = ?`,
      [result.insertId]
    );
    
    console.log('Created department data:', JSON.stringify(newDepartment[0], null, 2));
    
    res.status(201).json({ 
      success: true, 
      data: newDepartment[0],
      message: req.t ? req.t('api_msg_0bbd319c') : "Department created successfully"
    });
  } catch (error) {
    console.error('Error creating department:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_acffe608') : "Failed to create department",
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

    const [departments] = await pool.execute(
      `SELECT d.*, c.name as company_name,
       COALESCE((SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id), 0) as total_employees
       FROM departments d
       LEFT JOIN companies c ON d.company_id = c.id
       WHERE d.id = ? AND d.company_id = ? AND d.is_deleted = 0`,
      [id, companyId]
    );
    
    if (departments.length === 0) {
      return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_baacae70') : "Department not found" });
    }
    
    res.json({ success: true, data: departments[0] });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_13345364') : "Failed to fetch department",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company_id } = req.body;
    
    console.log('=== UPDATE DEPARTMENT REQUEST ===');
    console.log('Department ID:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Query params:', req.query);
    
    if (!name) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_c2529329') : "Department name is required" });
    }
    
    // Get company_id from multiple sources
    const finalCompanyId = req.query.company_id || req.body.company_id || req.companyId;
    
    if (!finalCompanyId) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });
    }
    
    console.log('Final company_id to use:', finalCompanyId);
    
    const updateFields = ['name = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const updateValues = [name.trim()];
    
    // Update company_id if explicitly provided and different
    if (company_id !== undefined && company_id !== finalCompanyId) {
      updateFields.push('company_id = ?');
      updateValues.push(company_id);
    }
    
    updateValues.push(id, finalCompanyId);
    
    console.log('Update query:', `UPDATE departments SET ${updateFields.join(', ')} WHERE id = ? AND company_id = ? AND is_deleted = 0`);
    console.log('Update values:', updateValues);
    
    const [result] = await pool.execute(
      `UPDATE departments SET ${updateFields.join(', ')} WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      updateValues
    );
    
    console.log('Update result:', { affectedRows: result.affectedRows, changedRows: result.changedRows });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_4a9dd4b7') : "Department not found or no changes made" });
    }
    
    // Fetch updated department
    const [updatedDept] = await pool.execute(
      `SELECT d.*, c.name as company_name,
       COALESCE((SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id), 0) as total_employees
       FROM departments d
       LEFT JOIN companies c ON d.company_id = c.id
       WHERE d.id = ?`,
      [id]
    );
    
    res.json({ 
      success: true, 
      data: updatedDept[0],
      message: req.t ? req.t('api_msg_94c33719') : "Department updated successfully" 
    });
  } catch (error) {
    console.error('Error updating department:', error);
    console.error('Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
    res.status(500).json({ 
      success: false, 
      error: error.sqlMessage || error.message || 'Failed to update department' 
    });
  }
};

const deleteDept = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get company_id from multiple sources
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });
    }
    
    console.log('Deleting department:', id, 'for company:', companyId);
    
    const [result] = await pool.execute(
      `UPDATE departments SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );
    
    console.log('Delete result:', { affectedRows: result.affectedRows });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_c28f49c2') : "Department not found or already deleted" });
    }
    
    res.json({ success: true, message: req.t ? req.t('api_msg_06c7feac') : "Department deleted successfully" });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ 
      success: false, 
      error: error.sqlMessage || error.message || 'Failed to delete department' 
    });
  }
};

module.exports = { getAll, create, getById, update, deleteDept };

