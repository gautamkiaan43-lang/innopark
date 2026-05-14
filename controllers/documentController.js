const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Get all documents for current user
 * GET /api/v1/documents
 */
const getAll = async (req, res) => {
  try {
    const { category, lead_id, project_id, client_id } = req.query;
    
    const companyId = req.query.company_id || req.body.company_id || 1;
    const userId = req.query.user_id || req.body.user_id || null;

    let whereClause = 'WHERE d.is_deleted = 0';
    const params = [];

    // Filter by company
    if (companyId) {
      whereClause += ' AND d.company_id = ?';
      params.push(companyId);
    }

    // For employees/clients, only show their own documents
    if (userId) {
      whereClause += ' AND d.user_id = ?';
      params.push(userId);
    }

    // Filter by lead_id
    if (lead_id) {
      whereClause += ' AND d.lead_id = ?';
      params.push(lead_id);
    }

    // Filter by project_id
    if (project_id) {
      whereClause += ' AND d.project_id = ?';
      params.push(project_id);
    }

    // Filter by client_id
    if (client_id) {
      whereClause += ' AND d.client_id = ?';
      params.push(client_id);
    }

    if (category) {
      whereClause += ' AND d.category = ?';
      params.push(category);
    }

    // Get all documents without pagination
    const [documents] = await pool.execute(
      `SELECT d.*, u.name as user_name
       FROM documents d
       LEFT JOIN users u ON d.user_id = u.id
       ${whereClause}
       ORDER BY d.created_at DESC`,
      params
    );

    // Format file size
    const formattedDocuments = documents.map(doc => ({
      ...doc,
      size: doc.file_size ? formatFileSize(doc.file_size) : '-',
      date: formatDate(doc.created_at),
    }));

    res.json({
      success: true,
      data: formattedDocuments
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_72ae1aaa') : "Failed to fetch documents"
    });
  }
};

/**
 * Get document by ID
 * GET /api/v1/documents/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;
    const userId = req.query.user_id || req.body.user_id || req.userId || null;
    const userRole = req.query.role || req.body.role || req.user?.role || null;

    let whereClause = 'WHERE d.id = ? AND d.company_id = ? AND d.is_deleted = 0';
    const params = [id, companyId];

    // For employees/clients, only allow access to their own documents
    if ((userRole === 'EMPLOYEE' || userRole === 'CLIENT') && userId) {
      whereClause += ' AND d.user_id = ?';
      params.push(userId);
    }

    const [documents] = await pool.execute(
      `SELECT d.*, u.name as user_name
       FROM documents d
       LEFT JOIN users u ON d.user_id = u.id
       ${whereClause}`,
      params
    );

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_9d4ed206') : "Document not found"
      });
    }

    const doc = documents[0];
    res.json({
      success: true,
      data: {
        ...doc,
        size: doc.file_size ? formatFileSize(doc.file_size) : '-',
        date: formatDate(doc.created_at),
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_11cd3b01') : "Failed to fetch document"
    });
  }
};

/**
 * Create/Upload document
 * POST /api/v1/documents
 */
const create = async (req, res) => {
  try {
    const { title, name, category, description, company_id, user_id, lead_id, project_id, client_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a6e960c7') : "File is required"
      });
    }

    const companyId = company_id || req.query.company_id || req.body.company_id || req.companyId || 1;
    const userId = user_id || req.query.user_id || req.body.user_id || req.userId || null;

    // Get file info
    const filePath = file.path;
    const fileName = file.originalname;
    const fileSize = file.size;
    const fileType = path.extname(fileName).toLowerCase();
    
    // Use title, name, or original filename as the document title
    const documentTitle = title || name || fileName;

    const [result] = await pool.execute(
      `INSERT INTO documents (
        company_id, user_id, title, category, file_path, file_name, file_size, file_type, description, lead_id, project_id, client_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        userId,
        documentTitle,
        category || null,
        filePath,
        fileName,
        fileSize,
        fileType,
        description || null,
        lead_id || null,
        project_id || null,
        client_id || null
      ]
    );

    const [documents] = await pool.execute(
      `SELECT d.*, u.name as user_name
       FROM documents d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [result.insertId]
    );

    const doc = documents[0];
    res.status(201).json({
      success: true,
      data: {
        ...doc,
        size: doc.file_size ? formatFileSize(doc.file_size) : '-',
        date: formatDate(doc.created_at),
      },
      message: req.t ? req.t('api_msg_5bc4799d') : "Document uploaded successfully"
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_225bdd87') : "Failed to upload document"
    });
  }
};

/**
 * Delete document
 * DELETE /api/v1/documents/:id
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.query.company_id || req.body.company_id || req.companyId || null;
    const userId = req.query.user_id || req.body.user_id || req.userId || null;
    const userRole = req.query.role || req.body.role || req.user?.role || null;

    console.log('Delete document request:', { id, companyId, userId, userRole });

    // First check if document exists at all
    const [existCheck] = await pool.execute(
      'SELECT id, company_id, user_id, is_deleted FROM documents WHERE id = ?',
      [id]
    );

    if (existCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_9d4ed206') : "Document not found"
      });
    }

    const docInfo = existCheck[0];

    // Check if already deleted
    if (docInfo.is_deleted === 1) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_8094ce08') : "Document already deleted"
      });
    }

    // Get document with permissions check
    let whereClause = 'WHERE d.id = ? AND d.is_deleted = 0';
    const params = [id];

    // Only filter by company_id if provided
    if (companyId) {
      whereClause += ' AND d.company_id = ?';
      params.push(companyId);
    }

    // For employees/clients, only allow deletion of their own documents
    if ((userRole === 'EMPLOYEE' || userRole === 'CLIENT') && userId) {
      whereClause += ' AND d.user_id = ?';
      params.push(userId);
    }

    const [documents] = await pool.execute(
      `SELECT d.* FROM documents d ${whereClause}`,
      params
    );

    if (documents.length === 0) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_bdf4474c') : "You do not have permission to delete this document"
      });
    }

    const doc = documents[0];

    // Soft delete
    await pool.execute(
      `UPDATE documents SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    // Optionally delete physical file
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (err) {
        console.error('Error deleting file:', err);
        // Continue even if file deletion fails
      }
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_66da71c6') : "Document deleted successfully"
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_e162871c') : "Failed to delete document"
    });
  }
};

/**
 * Download document
 * GET /api/v1/documents/:id/download
 */
const download = async (req, res) => {
  try {
    const { id } = req.params;

    // Handle case where company_id might be an array (duplicate query params)
    let companyId = req.query.company_id || req.body.company_id || req.companyId || 1;
    if (Array.isArray(companyId)) {
      companyId = companyId[0]; // Take first value if array
    }
    const userId = req.query.user_id || req.body.user_id || req.userId || null;
    const userRole = req.query.role || req.body.role || req.user?.role || null;

    let whereClause = 'WHERE d.id = ? AND d.is_deleted = 0';
    const params = [id];

    // Add company filter if provided
    if (companyId) {
      whereClause += ' AND d.company_id = ?';
      params.push(companyId);
    }

    // For employees/clients, only allow download of their own documents
    if ((userRole === 'EMPLOYEE' || userRole === 'CLIENT') && userId) {
      whereClause += ' AND d.user_id = ?';
      params.push(userId);
    }

    const [documents] = await pool.execute(
      `SELECT d.* FROM documents d ${whereClause}`,
      params
    );

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_9d4ed206') : "Document not found"
      });
    }

    const doc = documents[0];
    const filePath = doc.file_path || doc.file_url || doc.url;
    const fileName = doc.file_name || doc.name || doc.title || `document-${id}`;

    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_087d2c35') : "File path not found"
      });
    }

    // Check if file_path is a URL (external file)
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Redirect to the external URL for download
      return res.redirect(filePath);
    }

    // For local files, check if file exists
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
    
    // Also try uploads directory
    const uploadsPath = path.join(__dirname, '..', 'uploads', path.basename(filePath));
    
    let finalPath = null;
    if (fs.existsSync(absolutePath)) {
      finalPath = absolutePath;
    } else if (fs.existsSync(filePath)) {
      finalPath = filePath;
    } else if (fs.existsSync(uploadsPath)) {
      finalPath = uploadsPath;
    }

    if (!finalPath) {
      console.error('File not found at paths:', { absolutePath, filePath, uploadsPath });
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_4f5f9cc2') : "File not found on server. The file may have been moved or deleted."
      });
    }

    // Set content disposition header for download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.download(finalPath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_3a889d38') : "Failed to download file"
          });
        }
      }
    });
  } catch (error) {
    console.error('Download document error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download document'
    });
  }
};

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

module.exports = {
  getAll,
  getById,
  create,
  deleteDocument,
  download
};

