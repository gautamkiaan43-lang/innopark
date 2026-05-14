// =====================================================
// Group Controller
// =====================================================

const pool = require('../config/db');

/**
 * Get available users for group creation
 * GET /api/v1/groups/available-users
 */
const getAvailableUsers = async (req, res) => {
  try {
    const userId = req.query.user_id || req.body.user_id;
    const companyId = req.query.company_id || req.body.company_id;
    const userRole = req.query.user_role || req.body.user_role;
    
    if (!userId || !companyId || !userRole) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c5b31152') : "user_id, company_id, and user_role are required"
      });
    }

    let availableUsers = [];

    // Only ADMIN can create groups and add members
    if (userRole === 'ADMIN') {
      // Admin can add Clients and Employees to groups
      const [users] = await pool.execute(
        `SELECT u.id, 
                u.name, 
                u.email, 
                u.role,
                u.name as display_name,
                CASE 
                  WHEN u.role = 'CLIENT' THEN 'Client'
                  WHEN u.role = 'EMPLOYEE' THEN 'Employee'
                  ELSE u.role
                END as role_display
         FROM users u
         WHERE u.company_id = ? 
           AND u.id != ?
           AND u.role IN ('CLIENT', 'EMPLOYEE')
           AND u.is_deleted = 0
         ORDER BY u.role, u.name`,
        [companyId, userId]
      );
      availableUsers = users;
    } else {
      // Other roles cannot create groups
      return res.json({
        success: true,
        data: [],
        message: req.t ? req.t('api_msg_b008cf11') : "Only admins can create groups"
      });
    }

    res.json({
      success: true,
      data: availableUsers
    });
  } catch (error) {
    console.error('Get available users for group error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to fetch available users'
    });
  }
};

/**
 * Get all groups for a user
 * GET /api/v1/groups
 */
const getAll = async (req, res) => {
  try {
    const userId = req.query.user_id || req.body.user_id || null;
    const companyId = req.query.company_id || req.body.company_id || 1;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id and company_id are required"
      });
    }

    // Get all groups where user is a member
    const [groups] = await pool.execute(
      `SELECT g.*, 
              creator.name as creator_name,
              creator.email as creator_email,
              COUNT(DISTINCT gm.user_id) as member_count,
              (SELECT COUNT(*) 
               FROM messages m 
               WHERE m.group_id = g.id 
                 AND m.is_deleted = 0 
                 AND m.id NOT IN (
                   SELECT mr.message_id 
                   FROM message_recipients mr 
                   WHERE mr.user_id = ? AND mr.is_read = 1
                 )
               AND m.from_user_id != ?) as unread_count,
              (SELECT m.message 
               FROM messages m 
               WHERE m.group_id = g.id 
                 AND m.is_deleted = 0 
               ORDER BY m.created_at DESC 
               LIMIT 1) as last_message,
              (SELECT m.created_at 
               FROM messages m 
               WHERE m.group_id = g.id 
                 AND m.is_deleted = 0 
               ORDER BY m.created_at DESC 
               LIMIT 1) as last_message_time
       FROM \`groups\` g
       INNER JOIN group_members gm ON g.id = gm.group_id
       LEFT JOIN users creator ON g.created_by = creator.id
       WHERE g.company_id = ? 
         AND g.is_deleted = 0
         AND gm.user_id = ?
         AND gm.is_deleted = 0
       GROUP BY g.id
       ORDER BY last_message_time DESC, g.created_at DESC`,
      [userId, userId, companyId, userId]
    );

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to fetch groups'
    });
  }
};

/**
 * Get group by ID
 * GET /api/v1/groups/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.user_id || req.body.user_id;
    const companyId = req.query.company_id || req.body.company_id;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id and company_id are required"
      });
    }

    // Check if user is member of the group
    const [memberships] = await pool.execute(
      `SELECT * FROM group_members 
       WHERE group_id = ? AND user_id = ? AND is_deleted = 0`,
      [id, userId]
    );

    if (memberships.length === 0) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_c83c4327') : "You are not a member of this group"
      });
    }

    // Get group details with members
    const [groups] = await pool.execute(
      `SELECT g.*, 
              creator.name as creator_name,
              creator.email as creator_email
       FROM \`groups\` g
       LEFT JOIN users creator ON g.created_by = creator.id
       WHERE g.id = ? AND g.company_id = ? AND g.is_deleted = 0`,
      [id, companyId]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_ac49f293') : "Group not found"
      });
    }

    // Get group members
    const [members] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, gm.joined_at
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ? AND gm.is_deleted = 0 AND u.is_deleted = 0
       ORDER BY gm.joined_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...groups[0],
        members
      }
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to fetch group'
    });
  }
};

/**
 * Create a new group
 * POST /api/v1/groups
 */
const create = async (req, res) => {
  try {
    const { name, description, member_ids, user_id, company_id } = req.body;
    const userId = user_id || req.userId || req.query.user_id;
    const companyId = company_id || req.companyId || req.query.company_id;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id and company_id are required"
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e049be18') : "Group name is required"
      });
    }

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_f6e84901') : "At least one member is required"
      });
    }

    // Verify all members belong to the same company
    const placeholders = member_ids.map(() => '?').join(',');
    const [members] = await pool.execute(
      `SELECT id FROM users 
       WHERE id IN (${placeholders}) 
         AND company_id = ? 
         AND is_deleted = 0`,
      [...member_ids, companyId]
    );

    if (members.length !== member_ids.length) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_f1be3d4b') : "Some members do not belong to your company"
      });
    }

    // Create group
    const [groupResult] = await pool.execute(
      `INSERT INTO \`groups\` (company_id, name, description, created_by, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [companyId, name.trim(), description || null, userId]
    );

    const groupId = groupResult.insertId;

    // Add creator as member
    await pool.execute(
      `INSERT INTO group_members (group_id, user_id, joined_at)
       VALUES (?, ?, NOW())`,
      [groupId, userId]
    );

    // Add other members
    for (const memberId of member_ids) {
      if (memberId !== userId) {
        await pool.execute(
          `INSERT INTO group_members (group_id, user_id, joined_at)
           VALUES (?, ?, NOW())`,
          [groupId, memberId]
        );
      }
    }

    // Get created group with members
    const [createdGroups] = await pool.execute(
      `SELECT g.*, 
              creator.name as creator_name,
              creator.email as creator_email
       FROM \`groups\` g
       LEFT JOIN users creator ON g.created_by = creator.id
       WHERE g.id = ?`,
      [groupId]
    );

    const [membersList] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, gm.joined_at
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ? AND gm.is_deleted = 0
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdGroups[0],
        members: membersList
      },
      message: req.t ? req.t('api_msg_6835df39') : "Group created successfully"
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to create group'
    });
  }
};

/**
 * Update group (name, description)
 * PUT /api/v1/groups/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, user_id, company_id } = req.body;
    const userId = user_id || req.userId || req.query.user_id;
    const companyId = company_id || req.companyId || req.query.company_id;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id and company_id are required"
      });
    }

    // Check if user is creator or admin
    const [groups] = await pool.execute(
      `SELECT * FROM \`groups\` 
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_ac49f293') : "Group not found"
      });
    }

    // Only creator can update group
    if (groups[0].created_by !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_b150d180') : "Only group creator can update the group"
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    values.push(id, companyId);

    await pool.execute(
      `UPDATE \`groups\` SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      values
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_e3c7f474') : "Group updated successfully"
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to update group'
    });
  }
};

/**
 * Add members to group
 * POST /api/v1/groups/:id/members
 */
const addMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { member_ids, user_id, company_id } = req.body;
    const userId = user_id || req.userId || req.query.user_id;
    const companyId = company_id || req.companyId || req.query.company_id;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id and company_id are required"
      });
    }

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_f6e84901') : "At least one member is required"
      });
    }

    // Check if user is creator
    const [groups] = await pool.execute(
      `SELECT * FROM \`groups\` 
       WHERE id = ? AND company_id = ? AND created_by = ? AND is_deleted = 0`,
      [id, companyId, userId]
    );

    if (groups.length === 0) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_b8a1e24a') : "Only group creator can add members"
      });
    }

    // Verify all members belong to the same company
    const placeholders = member_ids.map(() => '?').join(',');
    const [members] = await pool.execute(
      `SELECT id FROM users 
       WHERE id IN (${placeholders}) 
         AND company_id = ? 
         AND is_deleted = 0`,
      [...member_ids, companyId]
    );

    if (members.length !== member_ids.length) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_f1be3d4b') : "Some members do not belong to your company"
      });
    }

    // Add members (skip if already exists)
    let addedCount = 0;
    for (const memberId of member_ids) {
      try {
        await pool.execute(
          `INSERT INTO group_members (group_id, user_id, joined_at)
           VALUES (?, ?, NOW())`,
          [id, memberId]
        );
        addedCount++;
      } catch (err) {
        // Member might already exist, skip
        if (err.code !== 'ER_DUP_ENTRY') {
          throw err;
        }
      }
    }

    res.json({
      success: true,
      message: `${addedCount} member(s) added successfully`,
      data: { added_count: addedCount }
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to add members'
    });
  }
};

/**
 * Remove member from group
 * DELETE /api/v1/groups/:id/members/:memberId
 */
const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.query.user_id || req.body.user_id;
    const companyId = req.query.company_id || req.body.company_id;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id and company_id are required"
      });
    }

    // Check if user is creator or removing themselves
    const [groups] = await pool.execute(
      `SELECT * FROM \`groups\` 
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_ac49f293') : "Group not found"
      });
    }

    const isCreator = groups[0].created_by === parseInt(userId);
    const isRemovingSelf = parseInt(memberId) === parseInt(userId);

    if (!isCreator && !isRemovingSelf) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_1bcc05e6') : "Only group creator can remove members"
      });
    }

    // Cannot remove creator
    if (groups[0].created_by === parseInt(memberId)) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c6c2b831') : "Cannot remove group creator"
      });
    }

    await pool.execute(
      `UPDATE group_members 
       SET is_deleted = 1 
       WHERE group_id = ? AND user_id = ?`,
      [id, memberId]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_9d0c654c') : "Member removed successfully"
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to remove member'
    });
  }
};

/**
 * Delete group (soft delete)
 * DELETE /api/v1/groups/:id
 */
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.user_id || req.body.user_id;
    const companyId = req.query.company_id || req.body.company_id;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id and company_id are required"
      });
    }

    // Check if user is creator
    const [groups] = await pool.execute(
      `SELECT * FROM \`groups\` 
       WHERE id = ? AND company_id = ? AND created_by = ? AND is_deleted = 0`,
      [id, companyId, userId]
    );

    if (groups.length === 0) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_b06c3333') : "Only group creator can delete the group"
      });
    }

    await pool.execute(
      `UPDATE \`groups\` SET is_deleted = 1, updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_1636f811') : "Group deleted successfully"
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to delete group'
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  addMembers,
  removeMember,
  deleteGroup,
  getAvailableUsers
};

