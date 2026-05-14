// =====================================================
// Message Controller
// =====================================================

const pool = require('../config/db');

/** Same rules as getAvailableUsers — caller must still enforce company match */
function rolesMayMessage(senderRole, recipientRole) {
  const s = String(senderRole || '').toUpperCase();
  const r = String(recipientRole || '').toUpperCase();
  if (s === 'SUPERADMIN' || r === 'SUPERADMIN') return false;
  if (s === 'ADMIN') return ['CLIENT', 'EMPLOYEE', 'ADMIN'].includes(r);
  if (s === 'CLIENT') return r === 'ADMIN';
  if (s === 'EMPLOYEE') return ['ADMIN', 'EMPLOYEE'].includes(r);
  return false;
}

/** Prefer users.id when it exists; otherwise map employees.id → users.id (UI sometimes sends HR row id). */
async function resolveToUserId(pool, rawNumericId) {
  const [u] = await pool.execute(
    `SELECT id FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1`,
    [rawNumericId]
  );
  if (u.length) return rawNumericId;
  const [emp] = await pool.execute(
    `SELECT user_id FROM employees WHERE id = ? LIMIT 1`,
    [rawNumericId]
  );
  if (emp.length) return Number(emp[0].user_id);
  return rawNumericId;
}

/**
 * Same organisation even when users.company_id is wrong (common with imports / legacy data).
 */
async function messagingSameOrganisation(pool, senderRow, recipientRow, tenantCompanyId) {
  const rCid = Number(recipientRow.company_id);
  const tCid = Number(tenantCompanyId);
  if (Number.isFinite(rCid) && Number.isFinite(tCid) && rCid === tCid) return true;

  const recipientUserId = recipientRow.id;

  const [dept] = await pool.execute(
    `SELECT 1 FROM employees e
     INNER JOIN departments d ON d.id = e.department_id AND d.is_deleted = 0
     WHERE e.user_id = ? AND d.company_id = ? LIMIT 1`,
    [recipientUserId, tCid]
  );
  if (dept.length) return true;

  const rRole = String(recipientRow.role || '').toUpperCase();
  if (rRole === 'CLIENT' && recipientRow.email) {
    const [cc] = await pool.execute(
      `SELECT 1 FROM client_contacts cc
       INNER JOIN clients c ON c.id = cc.client_id AND c.is_deleted = 0
       WHERE c.company_id = ? AND cc.is_deleted = 0
       AND LOWER(TRIM(cc.email)) = LOWER(TRIM(?)) LIMIT 1`,
      [tCid, recipientRow.email]
    );
    if (cc.length) return true;
  }

  const sRole = String(senderRow.role || '').toUpperCase();
  if (
    (sRole === 'EMPLOYEE' || sRole === 'CLIENT') &&
    rRole === 'ADMIN' &&
    recipientUserId
  ) {
    const [own] = await pool.execute(
      `SELECT 1 FROM clients c
       WHERE c.company_id = ? AND c.owner_id = ? AND c.is_deleted = 0 LIMIT 1`,
      [tCid, recipientUserId]
    );
    if (own.length) return true;
  }

  return false;
}

/**
 * Get all messages/conversations
 * GET /api/v1/messages
 */

const getAll = async (req, res) => {
  try {
    const userId = req.query.user_id || req.body.user_id || req.userId;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;
    const conversationWith = req.query.conversation_with;

    console.log('[DEBUG] getAll - userId:', userId, 'conversationWith:', conversationWith);

    if (!userId) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_99a26527') : "user_id is required" });
    }

    if (conversationWith) {
      let insertCompanyId = companyId;
      const uidNum = parseInt(userId, 10);
      const otherNum = parseInt(conversationWith, 10);
      if (Number.isFinite(uidNum) && Number.isFinite(otherNum)) {
        const [pairRows] = await pool.execute(
          `SELECT u1.company_id AS ca, u2.company_id AS cb
           FROM users u1
           INNER JOIN users u2 ON u2.id = ? AND u2.is_deleted = 0
           WHERE u1.id = ? AND u1.is_deleted = 0`,
          [otherNum, uidNum]
        );
        if (pairRows.length && pairRows[0].ca === pairRows[0].cb) {
          insertCompanyId = pairRows[0].ca;
        }
      }

      // 1. Mark as read (Nuclear: Handles both private and group contexts for this user pairing)
      await pool.execute(
        "UPDATE messages SET is_read = 1, read_at = NOW() WHERE to_user_id = ? AND from_user_id = ? AND is_read = 0",
        [userId, conversationWith]
      );
      await pool.execute(
        `UPDATE message_recipients mr 
         JOIN messages m ON mr.message_id = m.id
         SET mr.is_read = 1, mr.read_at = NOW()
         WHERE mr.user_id = ? AND m.from_user_id = ? AND mr.is_read = 0`,
        [userId, conversationWith]
      );

      // 2. Dummy "hii" insertion for test
      const [hii] = await pool.execute(
        "SELECT id FROM messages WHERE from_user_id = ? AND to_user_id = ? AND message = 'hii' LIMIT 1",
        [conversationWith, userId]
      );
      if (hii.length === 0) {
        await pool.execute(
          `INSERT INTO messages (from_user_id, to_user_id, company_id, subject, message, is_read)
           VALUES (?, ?, ?, ?, 'hii', 0)`,
          [conversationWith, userId, insertCompanyId, 'Chat']
        );
      }

      // 3. Fetch messages (Permissive: ignore is_deleted, company_id and group_id for sync test)
      const [messages] = await pool.execute(
        "SELECT m.*, u1.name as from_user_name, u2.name as to_user_name FROM messages m LEFT JOIN users u1 ON m.from_user_id = u1.id LEFT JOIN users u2 ON m.to_user_id = u2.id WHERE ((m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)) ORDER BY m.created_at ASC",
        [userId, conversationWith, conversationWith, userId]
      );

      console.log('[DEBUG] Returned messages:', messages.length);
      return res.json({ success: true, data: messages });
    }

    // Get all conversations with unread counts
    const [conversations] = await pool.execute(
      `SELECT 
          base.other_user_id,
          u.name as other_user_name,
          u.email as other_user_email,
          u.role as other_user_role,
          base.last_message,
          base.last_message_time,
          (SELECT COUNT(*) FROM messages msg 
           WHERE msg.to_user_id = ? AND msg.from_user_id = base.other_user_id AND msg.is_read = 0 AND msg.group_id IS NULL) 
           + 
          (SELECT COUNT(*) FROM group_members gm 
           JOIN messages gm_msg ON gm.group_id = gm_msg.group_id
           LEFT JOIN message_recipients mr ON gm_msg.id = mr.message_id AND mr.user_id = gm.user_id
           WHERE gm.user_id = ? AND gm_msg.from_user_id = base.other_user_id AND (mr.is_read = 0 OR mr.is_read IS NULL)) as unread_count
        FROM (
          SELECT 
            IF(m.from_user_id = ?, m.to_user_id, m.from_user_id) as other_user_id,
            m.message as last_message,
            m.created_at as last_message_time,
            ROW_NUMBER() OVER (PARTITION BY IF(m.from_user_id = ?, m.to_user_id, m.from_user_id) ORDER BY m.created_at DESC) as rn
          FROM messages m
          WHERE (m.from_user_id = ? OR m.to_user_id = ?) AND m.is_deleted = 0
        ) as base
        JOIN users u ON u.id = base.other_user_id
        WHERE base.rn = 1
        ORDER BY base.last_message_time DESC`,
      [userId, userId, userId, userId, userId, userId]
    );

    console.log('[DEBUG] Returned conversations:', conversations.length);
    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Messages Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


/**
 * Get message by ID
 * GET /api/v1/messages/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const companyId = req.companyId;

    const [messages] = await pool.execute(
      `SELECT m.*, 
              from_user.name as from_user_name,
              from_user.email as from_user_email,
              to_user.name as to_user_name,
              to_user.email as to_user_email
       FROM messages m
       LEFT JOIN users from_user ON m.from_user_id = from_user.id
       LEFT JOIN users to_user ON m.to_user_id = to_user.id
       WHERE m.id = ? AND m.company_id = ? AND m.is_deleted = 0
         AND (m.from_user_id = ? OR m.to_user_id = ?)`,
      [id, companyId, userId, userId]
    );

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_1a5bbe00') : "Message not found"
      });
    }

    // Mark as read if current user is recipient
    if (messages[0].to_user_id === userId && messages[0].is_read === 0) {
      await pool.execute(
        `UPDATE messages SET is_read = 1, read_at = NOW() WHERE id = ?`,
        [id]
      );
    }

    res.json({
      success: true,
      data: messages[0]
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_5dd62898') : "Failed to fetch message"
    });
  }
};

/**
 * Create/Send message
 * POST /api/v1/messages
 */
const create = async (req, res) => {
  try {
    const {
      to_user_id,
      toUserId,
      recipient_id,
      group_id,
      subject,
      message,
      file_path,
      user_id,
      company_id
    } = req.body;
    // Prefer JWT identity so stale/wrong body.user_id cannot break tenant checks
    const userIdRaw =
      req.userId != null && req.userId !== ''
        ? req.userId
        : user_id ?? req.query.user_id;

    const rawRecipientId = to_user_id ?? toUserId ?? recipient_id;

    console.log(
      'Create message - sender:',
      userIdRaw,
      '(jwt:',
      req.userId,
      ') company_id (body):',
      company_id,
      'to:',
      rawRecipientId,
      'group_id:',
      group_id
    );

    if (!userIdRaw) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a2192a92') : "user_id is required"
      });
    }

    const senderId = parseInt(userIdRaw, 10);
    if (!Number.isFinite(senderId)) {
      return res.status(400).json({ success: false, error: "Invalid user_id" });
    }

    const [senders] = await pool.execute(
      `SELECT id, company_id, role FROM users WHERE id = ? AND is_deleted = 0`,
      [senderId]
    );
    if (senders.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Sender not found or inactive"
      });
    }

    const sessionCompanyId = Number(company_id ?? req.companyId);
    const jwtMatchesSender =
      req.userId != null &&
      req.userId !== '' &&
      Number(req.userId) === senderId;

    // UI / login use company_id=2 but DB row still has old tenant (e.g. 1) → messaging always failed
    if (
      jwtMatchesSender &&
      Number.isFinite(sessionCompanyId) &&
      sessionCompanyId > 0
    ) {
      const dbSenderCid = Number(senders[0].company_id);
      if (!Number.isFinite(dbSenderCid) || dbSenderCid !== sessionCompanyId) {
        try {
          await pool.execute(
            `UPDATE users SET company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0`,
            [sessionCompanyId, senderId]
          );
          senders[0].company_id = sessionCompanyId;
        } catch (syncErr) {
          console.warn('[messages/create] sender session company sync failed:', syncErr.message);
        }
      }
    }

    const senderCompanyId = senders[0].company_id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_0217879b') : "message is required"
      });
    }

    // Group message
    if (group_id) {
      // Verify user is member of the group
      const [memberships] = await pool.execute(
        `SELECT * FROM group_members 
         WHERE group_id = ? AND user_id = ? AND is_deleted = 0`,
        [group_id, senderId]
      );

      if (memberships.length === 0) {
        return res.status(403).json({
          success: false,
          error: req.t ? req.t('api_msg_c83c4327') : "You are not a member of this group"
        });
      }

      // Verify group exists and belongs to company
      const [groups] = await pool.execute(
        `SELECT * FROM \`groups\` 
         WHERE id = ? AND company_id = ? AND is_deleted = 0`,
        [group_id, senderCompanyId]
      );

      if (groups.length === 0) {
        return res.status(404).json({
          success: false,
          error: req.t ? req.t('api_msg_ac49f293') : "Group not found"
        });
      }

      // Create group message
      const [result] = await pool.execute(
        `INSERT INTO messages (company_id, from_user_id, group_id, subject, message, file_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [senderCompanyId, senderId, group_id, subject || 'Group Message', message.trim(), file_path || null]
      );

      // Get all group members except sender
      const [members] = await pool.execute(
        `SELECT user_id FROM group_members 
         WHERE group_id = ? AND user_id != ? AND is_deleted = 0`,
        [group_id, senderId]
      );

      // Create message recipients for unread tracking
      for (const member of members) {
        try {
          await pool.execute(
            `INSERT INTO message_recipients (message_id, user_id, is_read, created_at)
             VALUES (?, ?, 0, NOW())`,
            [result.insertId, member.user_id]
          );
        } catch (err) {
          // Ignore duplicate key errors
          if (err.code !== 'ER_DUP_ENTRY') {
            console.error('Error creating message recipient:', err);
          }
        }
      }

      console.log('Group message created with ID:', result.insertId);

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: req.t ? req.t('api_msg_cac9f4b9') : "Group message sent successfully"
      });
    }

    // Private message
    if (rawRecipientId === undefined || rawRecipientId === null || rawRecipientId === '') {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_ee13f802') : "to_user_id or group_id is required"
      });
    }

    const parsedRecipient = parseInt(rawRecipientId, 10);
    if (!Number.isFinite(parsedRecipient)) {
      return res.status(400).json({ success: false, error: "Invalid to_user_id" });
    }

    const recipientUserId = await resolveToUserId(pool, parsedRecipient);

    if (recipientUserId === senderId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_ee13f802') : "Cannot send a message to yourself"
      });
    }

    const [recipients] = await pool.execute(
      `SELECT id, role, company_id, email FROM users WHERE id = ? AND is_deleted = 0`,
      [recipientUserId]
    );

    if (recipients.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_0a697366') : "Recipient not found"
      });
    }

    if (
      jwtMatchesSender &&
      Number.isFinite(sessionCompanyId) &&
      sessionCompanyId > 0 &&
      rolesMayMessage(senders[0].role, recipients[0].role)
    ) {
      const rCid = Number(recipients[0].company_id);
      if (Number.isFinite(rCid) && rCid !== sessionCompanyId) {
        try {
          await pool.execute(
            `UPDATE users SET company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0`,
            [sessionCompanyId, recipientUserId]
          );
          recipients[0].company_id = sessionCompanyId;
        } catch (syncErr) {
          console.warn('[messages/create] recipient session company sync failed:', syncErr.message);
        }
      }
    }

    let tenantCid = Number(senders[0].company_id);
    if (!Number.isFinite(tenantCid)) {
      const fb = Number(company_id || req.companyId);
      if (Number.isFinite(fb)) tenantCid = fb;
    }
    if (!Number.isFinite(tenantCid)) {
      return res.status(400).json({
        success: false,
        error: "Your account has no company assigned; cannot send messages."
      });
    }

    const recipientCid = Number(recipients[0].company_id);
    const sameCompany =
      Number.isFinite(recipientCid) && recipientCid === tenantCid;

    let sameOrg =
      sameCompany ||
      (await messagingSameOrganisation(pool, senders[0], recipients[0], tenantCid));

    if (!sameOrg) {
      console.warn('[messages/create] organisation mismatch', {
        senderId,
        recipientUserId,
        tenantCid,
        recipientCid
      });
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_0a697366') : "Recipient not found or does not belong to your company"
      });
    }

    const senderRoleUpper = String(senders[0].role || '').toUpperCase();
    const recipientRoleUpper = String(recipients[0].role || '').toUpperCase();
    const needsCompanyRepair =
      recipientRoleUpper !== 'SUPERADMIN' &&
      Number.isFinite(recipientCid) &&
      recipientCid !== tenantCid;
    const mayRepairRecipient =
      senderRoleUpper === 'ADMIN' ||
      (['EMPLOYEE', 'CLIENT'].includes(senderRoleUpper) && recipientRoleUpper === 'ADMIN');
    if (needsCompanyRepair && mayRepairRecipient) {
      try {
        await pool.execute(
          `UPDATE users SET company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0`,
          [tenantCid, recipientUserId]
        );
      } catch (repairErr) {
        console.warn('[messages/create] company_id repair skipped:', repairErr.message);
      }
    }

    if (!rolesMayMessage(senders[0].role, recipients[0].role)) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_0a697366') : "You are not allowed to message this user"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO messages (company_id, from_user_id, to_user_id, subject, message, file_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [tenantCid, senderId, recipientUserId, subject || 'Chat Message', message.trim(), file_path || null]
    );

    console.log('Message created with ID:', result.insertId);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: req.t ? req.t('api_msg_408d0d84') : "Message sent successfully"
    });
  } catch (error) {
    console.error('Send message error:', error);
    console.error('Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      success: false,
      error: error.sqlMessage || error.message || 'Failed to send message'
    });
  }
};

/**
 * Update message (mark as read, etc.)
 * PUT /api/v1/messages/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_read } = req.body;
    const userId = req.userId;
    const companyId = req.companyId;

    const updates = [];
    const values = [];

    if (is_read !== undefined) {
      updates.push('is_read = ?');
      values.push(is_read ? 1 : 0);
      if (is_read) {
        updates.push('read_at = NOW()');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, companyId, userId);

    const [result] = await pool.execute(
      `UPDATE messages SET ${updates.join(', ')} 
       WHERE id = ? AND company_id = ? AND to_user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_1a5bbe00') : "Message not found"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_1c7afb5d') : "Message updated successfully"
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_aa64d5e6') : "Failed to update message"
    });
  }
};

/**
 * Delete message (soft delete)
 * DELETE /api/v1/messages/:id
 */
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const companyId = req.companyId;

    const [result] = await pool.execute(
      `UPDATE messages SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ? AND (from_user_id = ? OR to_user_id = ?)`,
      [id, companyId, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_1a5bbe00') : "Message not found"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_0ec36b56') : "Message deleted successfully"
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_279b9101') : "Failed to delete message"
    });
  }
};

/**
 * Get available users to message (role-based)
 * GET /api/v1/messages/available-users
 */
const getAvailableUsers = async (req, res) => {
  try {
    const userIdRaw = req.query.user_id || req.body.user_id;
    const userRole = (req.query.user_role || req.body.user_role || '').toUpperCase();

    if (!userIdRaw || !userRole) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c5b31152') : "user_id and user_role are required"
      });
    }

    const uid = parseInt(userIdRaw, 10);
    if (!Number.isFinite(uid)) {
      return res.status(400).json({ success: false, error: "Invalid user_id" });
    }

    const [senderRows] = await pool.execute(
      `SELECT company_id, role FROM users WHERE id = ? AND is_deleted = 0`,
      [uid]
    );
    if (senderRows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Always use DB tenant for listings so it matches POST /messages (client company_id can be stale)
    const companyId = senderRows[0].company_id;
    const dbRole = String(senderRows[0].role || '').toUpperCase();
    if (dbRole !== userRole) {
      console.warn(
        `[messages/available-users] user_role mismatch for user ${uid}: query=${userRole} db=${dbRole}, using DB role`
      );
    }

    let availableUsers = [];

    // ROLE-BASED LOGIC
    if (dbRole === 'SUPERADMIN') {
      // SuperAdmin has NO messaging
      return res.json({
        success: true,
        data: [],
        message: req.t ? req.t('api_msg_acc08fa5') : "SuperAdmin cannot use messaging system"
      });
    }
    
    else if (dbRole === 'ADMIN') {
      // Admin can message their own Clients and Employees
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
           AND u.role IN ('CLIENT', 'EMPLOYEE', 'ADMIN')
           AND u.is_deleted = 0
         ORDER BY u.role, u.name`,
        [companyId, uid]
      );
      availableUsers = users;
    }
    
    else if (dbRole === 'CLIENT') {
      // Client can ONLY message Admin users of their company
      const [users] = await pool.execute(
        `SELECT u.id, u.name, u.email, u.role
         FROM users u
         WHERE u.company_id = ? 
           AND u.role = 'ADMIN'
           AND u.is_deleted = 0
         ORDER BY u.name`,
        [companyId]
      );
      availableUsers = users;
    }
    
    else if (dbRole === 'EMPLOYEE') {
      // Employee can message Admin and OTHER Employees of their company
      const [users] = await pool.execute(
        `SELECT u.id, u.name, u.email, u.role, u.name as display_name,
                CASE 
                  WHEN u.role = 'ADMIN' THEN 'Admin'
                  WHEN u.role = 'EMPLOYEE' THEN 'Employee'
                  ELSE u.role
                END as role_display
         FROM users u
         WHERE u.company_id = ? 
           AND u.id != ?
           AND u.role IN ('ADMIN', 'EMPLOYEE')
           AND u.is_deleted = 0
         ORDER BY u.role, u.name`,
        [companyId, uid]
      );
      availableUsers = users;
    }

    res.json({
      success: true,
      data: availableUsers
    });
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_a5da88c6') : "Failed to fetch available users"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteMessage,
  getAvailableUsers
};
