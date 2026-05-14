// =====================================================
// Item Controller
// =====================================================

const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Get all items
 * GET /api/v1/items
 */
const getAll = async (req, res) => {
  try {
    const { category, search } = req.query;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;
    
    let whereClause = 'WHERE i.company_id = ? AND i.is_deleted = 0';
    const params = [companyId];
    
    if (category && category !== 'All') {
      whereClause += ' AND i.category = ?';
      params.push(category);
    }
    
    if (search) {
      whereClause += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.category LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const [items] = await pool.execute(
      `SELECT i.*, 
              CONCAT('/uploads/', i.image_path) as image_url
       FROM items i
       ${whereClause}
       ORDER BY i.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_5924b3d1') : "Failed to fetch items"
    });
  }
};

/**
 * Get item by ID
 * GET /api/v1/items/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    const [items] = await pool.execute(
      `SELECT i.*, 
              CONCAT('/uploads/', i.image_path) as image_url
       FROM items i
       WHERE i.id = ? AND i.company_id = ? AND i.is_deleted = 0`,
      [id, companyId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_857f49a8') : "Item not found"
      });
    }

    res.json({
      success: true,
      data: items[0]
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_36454fc1') : "Failed to fetch item"
    });
  }
};

/**
 * Create item
 * POST /api/v1/items
 */
const create = async (req, res) => {
  try {
    // Handle both JSON and FormData
    const {
      title,
      description,
      category,
      unit_type,
      rate,
      show_in_client_portal
    } = req.body;

    const companyId = req.body.company_id || req.query.company_id || req.companyId || 1;

    if (!title || !category || !unit_type || !rate) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9edbeb6') : "Title, category, unit_type, and rate are required"
      });
    }

    // Handle file upload
    let imagePath = null;
    if (req.file) {
      imagePath = `items/${req.file.filename}`;
    }

    const [result] = await pool.execute(
      `INSERT INTO items (
        company_id, title, description, category, unit_type, rate,
        show_in_client_portal, image_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        companyId,
        title,
        description || null,
        category,
        unit_type,
        parseFloat(rate),
        show_in_client_portal ? 1 : 0,
        imagePath
      ]
    );

    const itemId = result.insertId;

    // Get created item
    const [items] = await pool.execute(
      `SELECT i.*, 
              CONCAT('/uploads/', i.image_path) as image_url
       FROM items i
       WHERE i.id = ?`,
      [itemId]
    );

    res.status(201).json({
      success: true,
      data: items[0],
      message: req.t ? req.t('api_msg_e46394d3') : "Item created successfully"
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to create item'
    });
  }
};

/**
 * Update item
 * PUT /api/v1/items/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      unit_type,
      rate,
      show_in_client_portal
    } = req.body;

    const companyId = req.body.company_id || req.query.company_id || req.companyId || 1;

    // Check if item exists
    const [items] = await pool.execute(
      `SELECT * FROM items WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_857f49a8') : "Item not found"
      });
    }

    const existingItem = items[0];

    // Handle file upload
    let imagePath = existingItem.image_path;
    if (req.file) {
      // Delete old image if exists
      if (existingItem.image_path) {
        const oldImagePath = path.join(__dirname, '../uploads', existingItem.image_path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = `items/${req.file.filename}`;
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (unit_type !== undefined) {
      updates.push('unit_type = ?');
      values.push(unit_type);
    }
    if (rate !== undefined) {
      updates.push('rate = ?');
      values.push(parseFloat(rate));
    }
    if (show_in_client_portal !== undefined) {
      updates.push('show_in_client_portal = ?');
      values.push(show_in_client_portal ? 1 : 0);
    }
    if (imagePath !== undefined) {
      updates.push('image_path = ?');
      values.push(imagePath);
    }

    updates.push('updated_at = NOW()');
    values.push(id, companyId);

    await pool.execute(
      `UPDATE items SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`,
      values
    );

    // Get updated item
    const [updatedItems] = await pool.execute(
      `SELECT i.*, 
              CONCAT('/uploads/', i.image_path) as image_url
       FROM items i
       WHERE i.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updatedItems[0],
      message: req.t ? req.t('api_msg_a12ebc97') : "Item updated successfully"
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to update item'
    });
  }
};

/**
 * Delete item (soft delete)
 * DELETE /api/v1/items/:id
 */
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;

    // Check if item exists
    const [items] = await pool.execute(
      `SELECT * FROM items WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_857f49a8') : "Item not found"
      });
    }

    const item = items[0];

    // Delete image file if exists
    if (item.image_path) {
      const imagePath = path.join(__dirname, '../uploads', item.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Soft delete
    await pool.execute(
      `UPDATE items SET is_deleted = 1, updated_at = NOW() WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_a8ee2d15') : "Item deleted successfully"
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_04957503') : "Failed to delete item"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteItem,
};

