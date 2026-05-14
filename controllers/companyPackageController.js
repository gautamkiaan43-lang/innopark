// =====================================================
// Company Package Controller
// =====================================================

const pool = require('../config/db');

/**
 * Get all company packages
 * GET /api/v1/company-packages
 */
const getAll = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.body.company_id || 1;

    const { status } = req.query;

    let whereClause = 'WHERE cp.company_id = ? AND cp.is_deleted = 0';
    const params = [companyId];

    if (status) {
      whereClause += ' AND cp.status = ?';
      params.push(status);
    }

    // Get all packages without pagination
    const [packages] = await pool.execute(
      `SELECT cp.*,
              COUNT(DISTINCT c.id) as companies_count,
              GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') as assigned_companies,
              CAST(cp.features AS CHAR) as features_json
       FROM company_packages cp
       LEFT JOIN companies c ON c.package_id = cp.id AND c.is_deleted = 0
       ${whereClause}
       GROUP BY cp.id
       ORDER BY cp.created_at DESC`,
      params
    );

    // Parse JSON features safely and format assigned companies
    const packagesWithFeatures = packages.map(pkg => {
      try {
        const assignedCompanies = pkg.assigned_companies 
          ? pkg.assigned_companies.split(', ').filter(name => name.trim())
          : [];
        
        // Handle features parsing - MySQL JSON columns return as objects or strings
        let parsedFeatures = [];
        if (pkg.features_json) {
          try {
            parsedFeatures = JSON.parse(pkg.features_json);
            if (!Array.isArray(parsedFeatures)) {
              parsedFeatures = [];
            }
          } catch (e) {
            console.error('Error parsing features_json for package:', pkg.id, e);
            parsedFeatures = [];
          }
        } else if (pkg.features) {
          if (typeof pkg.features === 'string') {
            try {
              parsedFeatures = JSON.parse(pkg.features);
              if (!Array.isArray(parsedFeatures)) {
                parsedFeatures = [];
              }
            } catch (e) {
              console.error('Error parsing features string for package:', pkg.id, e);
              parsedFeatures = [];
            }
          } else if (Array.isArray(pkg.features)) {
            parsedFeatures = pkg.features;
          } else if (typeof pkg.features === 'object') {
            // MySQL JSON might return as object, convert to array if needed
            parsedFeatures = Object.values(pkg.features);
          }
        }
        
        // Remove temporary features_json field
        const { features_json, ...packageData } = pkg;
        
        return {
          ...packageData,
          features: Array.isArray(parsedFeatures) ? parsedFeatures : [],
          companies_count: parseInt(pkg.companies_count) || 0,
          assigned_companies: assignedCompanies
        };
      } catch (parseError) {
        console.error('Error parsing features for package:', pkg.id, parseError);
        return {
          ...pkg,
          features: [],
          companies_count: parseInt(pkg.companies_count) || 0,
          assigned_companies: pkg.assigned_companies ? pkg.assigned_companies.split(', ').filter(name => name.trim()) : []
        };
      }
    });

    res.json({
      success: true,
      data: packagesWithFeatures
    });
  } catch (error) {
    console.error('Get company packages error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.companyId
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company packages',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get package by ID
 * GET /api/v1/company-packages/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [packages] = await pool.execute(
      `SELECT cp.*,
              COUNT(DISTINCT c.id) as companies_count,
              GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') as assigned_companies,
              CAST(cp.features AS CHAR) as features_json
       FROM company_packages cp
       LEFT JOIN companies c ON c.package_id = cp.id AND c.is_deleted = 0
       WHERE cp.id = ? AND cp.company_id = ? AND cp.is_deleted = 0
       GROUP BY cp.id`,
      [id, req.companyId]
    );

    if (packages.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_407bbcd6') : "Package not found"
      });
    }

    const pkg = packages[0];
    console.log('Raw package from DB (getById):', JSON.stringify(pkg, null, 2));
    console.log('Features JSON from DB:', pkg.features_json);
    
    // Parse features - handle MySQL JSON column format
    let parsedFeatures = [];
    if (pkg.features_json) {
      try {
        parsedFeatures = JSON.parse(pkg.features_json);
        if (!Array.isArray(parsedFeatures)) {
          parsedFeatures = [];
        }
      } catch (e) {
        console.error('Error parsing features_json:', e);
        parsedFeatures = [];
      }
    } else if (pkg.features) {
      if (typeof pkg.features === 'string') {
        try {
          parsedFeatures = JSON.parse(pkg.features);
          if (!Array.isArray(parsedFeatures)) {
            parsedFeatures = [];
          }
        } catch (e) {
          console.error('Error parsing features string:', e);
          parsedFeatures = [];
        }
      } else if (Array.isArray(pkg.features)) {
        parsedFeatures = pkg.features;
      } else if (typeof pkg.features === 'object') {
        parsedFeatures = Object.values(pkg.features);
      }
    }
    
    console.log('Final parsed features (getById):', parsedFeatures);
    pkg.features = parsedFeatures;
    delete pkg.features_json; // Remove temporary field
    pkg.companies_count = parseInt(pkg.companies_count) || 0;
    pkg.assigned_companies = pkg.assigned_companies 
      ? pkg.assigned_companies.split(', ').filter(name => name.trim())
      : [];

    res.json({
      success: true,
      data: pkg
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
 * Create new package
 * POST /api/v1/company-packages
 */
const create = async (req, res) => {
  try {
    console.log('=== CREATE PACKAGE REQUEST ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Features received:', req.body.features);
    console.log('Features type:', typeof req.body.features);
    console.log('Is array?', Array.isArray(req.body.features));
    
    const {
      package_name,
      price,
      billing_cycle = 'Monthly',
      features = [],
      status = 'Active'
    } = req.body;

    if (!package_name || price === undefined) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_900ec21a') : "Package name and price are required"
      });
    }

    // Ensure features is always an array - handle all possible formats
    let featuresArray = [];
    if (Array.isArray(features)) {
      featuresArray = features;
    } else if (typeof features === 'string') {
      try {
        featuresArray = JSON.parse(features);
        if (!Array.isArray(featuresArray)) {
          featuresArray = [];
        }
      } catch (e) {
        console.error('Error parsing features string:', e);
        featuresArray = [];
      }
    } else if (features && typeof features === 'object') {
      featuresArray = Object.values(features);
    }
    
    const featuresJson = JSON.stringify(featuresArray);

    console.log('Processed features array:', featuresArray);
    console.log('Features JSON to store:', featuresJson);

    const [result] = await pool.execute(
      `INSERT INTO company_packages 
       (company_id, package_name, price, billing_cycle, features, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.companyId,
        package_name,
        parseFloat(price),
        billing_cycle,
        featuresJson,
        status
      ]
    );

    const [newPackage] = await pool.execute(
      `SELECT cp.*,
              COUNT(DISTINCT c.id) as companies_count,
              GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') as assigned_companies,
              CAST(cp.features AS CHAR) as features_json
       FROM company_packages cp
       LEFT JOIN companies c ON c.package_id = cp.id AND c.is_deleted = 0
       WHERE cp.id = ?
       GROUP BY cp.id`,
      [result.insertId]
    );

    const pkg = newPackage[0];
    console.log('Raw package from DB:', JSON.stringify(pkg, null, 2));
    console.log('Features from DB (raw):', pkg.features);
    console.log('Features JSON from DB:', pkg.features_json);
    console.log('Features type:', typeof pkg.features);
    
    // Parse features - handle MySQL JSON column format
    let parsedFeatures = [];
    if (pkg.features_json) {
      try {
        parsedFeatures = JSON.parse(pkg.features_json);
        if (!Array.isArray(parsedFeatures)) {
          parsedFeatures = [];
        }
      } catch (e) {
        console.error('Error parsing features_json:', e);
        parsedFeatures = [];
      }
    } else if (pkg.features) {
      if (typeof pkg.features === 'string') {
        try {
          parsedFeatures = JSON.parse(pkg.features);
          if (!Array.isArray(parsedFeatures)) {
            parsedFeatures = [];
          }
        } catch (e) {
          console.error('Error parsing features string:', e);
          parsedFeatures = [];
        }
      } else if (Array.isArray(pkg.features)) {
        parsedFeatures = pkg.features;
      } else if (typeof pkg.features === 'object') {
        parsedFeatures = Object.values(pkg.features);
      }
    }
    
    console.log('Final parsed features:', parsedFeatures);
    pkg.features = parsedFeatures;
    delete pkg.features_json; // Remove temporary field
    pkg.companies_count = parseInt(pkg.companies_count) || 0;
    pkg.assigned_companies = pkg.assigned_companies 
      ? pkg.assigned_companies.split(', ').filter(name => name.trim())
      : [];

    res.status(201).json({
      success: true,
      data: pkg,
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
 * PUT /api/v1/company-packages/:id
 */
const update = async (req, res) => {
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
      `SELECT id FROM company_packages 
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, req.companyId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_407bbcd6') : "Package not found"
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (package_name !== undefined) {
      updateFields.push('package_name = ?');
      updateValues.push(package_name);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(parseFloat(price));
    }
    if (billing_cycle !== undefined) {
      updateFields.push('billing_cycle = ?');
      updateValues.push(billing_cycle);
    }
    if (features !== undefined) {
      // Ensure features is always an array
      const featuresArray = Array.isArray(features) ? features : [];
      const featuresJson = featuresArray.length > 0 ? JSON.stringify(featuresArray) : JSON.stringify([]);
      updateFields.push('features = ?');
      updateValues.push(featuresJson);
      console.log('Updating package with features:', featuresArray);
      console.log('Features JSON:', featuresJson);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    await pool.execute(
      `UPDATE company_packages 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`,
      [...updateValues, id, req.companyId]
    );

    const [updated] = await pool.execute(
      `SELECT cp.*,
              COUNT(DISTINCT c.id) as companies_count,
              GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') as assigned_companies,
              CAST(cp.features AS CHAR) as features_json
       FROM company_packages cp
       LEFT JOIN companies c ON c.package_id = cp.id AND c.is_deleted = 0
       WHERE cp.id = ? AND cp.company_id = ?
       GROUP BY cp.id`,
      [id, req.companyId]
    );

    const pkg = updated[0];
    console.log('Raw package from DB (update):', JSON.stringify(pkg, null, 2));
    console.log('Features JSON from DB:', pkg.features_json);
    
    // Parse features - handle MySQL JSON column format
    let parsedFeatures = [];
    if (pkg.features_json) {
      try {
        parsedFeatures = JSON.parse(pkg.features_json);
        if (!Array.isArray(parsedFeatures)) {
          parsedFeatures = [];
        }
      } catch (e) {
        console.error('Error parsing features_json:', e);
        parsedFeatures = [];
      }
    } else if (pkg.features) {
      if (typeof pkg.features === 'string') {
        try {
          parsedFeatures = JSON.parse(pkg.features);
          if (!Array.isArray(parsedFeatures)) {
            parsedFeatures = [];
          }
        } catch (e) {
          console.error('Error parsing features string:', e);
          parsedFeatures = [];
        }
      } else if (Array.isArray(pkg.features)) {
        parsedFeatures = pkg.features;
      } else if (typeof pkg.features === 'object') {
        parsedFeatures = Object.values(pkg.features);
      }
    }
    
    console.log('Final parsed features (update):', parsedFeatures);
    pkg.features = parsedFeatures;
    delete pkg.features_json; // Remove temporary field
    pkg.companies_count = parseInt(pkg.companies_count) || 0;
    pkg.assigned_companies = pkg.assigned_companies 
      ? pkg.assigned_companies.split(', ').filter(name => name.trim())
      : [];

    res.json({
      success: true,
      data: pkg,
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
 * DELETE /api/v1/company-packages/:id
 */
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      `SELECT id FROM company_packages 
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, req.companyId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_407bbcd6') : "Package not found"
      });
    }

    await pool.execute(
      `UPDATE company_packages 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`,
      [id, req.companyId]
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

module.exports = {
  getAll,
  getById,
  create,
  update,
  deletePackage
};

