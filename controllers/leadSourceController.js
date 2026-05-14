// =====================================================
// Lead Source Controller (configurable lead channels)
// =====================================================

const pool = require('../config/db');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || req.user?.company_id;

const getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    if (!company_id) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });

    const [rows] = await pool.execute(
      `SELECT * FROM lead_sources WHERE company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY display_order ASC, name ASC`,
      [company_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lead sources getAll:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_59fab9dd') : "Failed to fetch lead sources" });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = getCompanyId(req);
    const [rows] = await pool.execute(
      'SELECT * FROM lead_sources WHERE id = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)',
      [id, company_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_ebe661a8') : "Lead source not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Lead source getById:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_3027fead') : "Failed to fetch lead source" });
  }
};

const create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    if (!company_id) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });

    const { name, slug, display_order } = req.body;
    if (!name) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_6d13c984') : "name is required" });

    const slugVal = slug || String(name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const order = display_order ?? 0;

    const [result] = await pool.execute(
      'INSERT INTO lead_sources (company_id, name, slug, display_order) VALUES (?, ?, ?, ?)',
      [company_id, name, slugVal, order]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name, slug: slugVal, display_order: order } });
  } catch (err) {
    console.error('Lead source create:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_4bc08fb5') : "Failed to create lead source" });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = getCompanyId(req);
    const { name, slug, display_order } = req.body;

    const [result] = await pool.execute(
      'UPDATE lead_sources SET name = COALESCE(?, name), slug = COALESCE(?, slug), display_order = COALESCE(?, display_order) WHERE id = ? AND company_id = ?',
      [name ?? null, slug ?? null, display_order ?? null, id, company_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_ebe661a8') : "Lead source not found" });
    res.json({ success: true, data: { id, updated: true } });
  } catch (err) {
    console.error('Lead source update:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_fea97c40') : "Failed to update lead source" });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = getCompanyId(req);
    const [result] = await pool.execute(
      'UPDATE lead_sources SET is_deleted = 1 WHERE id = ? AND company_id = ?',
      [id, company_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_ebe661a8') : "Lead source not found" });
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    console.error('Lead source delete:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_3128ab10') : "Failed to delete lead source" });
  }
};

module.exports = { getAll, getById, create, update, remove };
