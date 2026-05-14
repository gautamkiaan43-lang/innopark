// =====================================================
// Email Template Renderer Utility
// Replaces placeholders in email templates with actual data
// =====================================================

const pool = require('../config/db');

/**
 * Render email template by replacing placeholders with data
 * Supports {KEY} format placeholders
 * 
 * @param {string} template_key - Template key (e.g., 'contract_sent', 'invoice_sent')
 * @param {object} dataObject - Data object with keys matching placeholders
 * @param {number} company_id - Company ID
 * @returns {Promise<{subject: string, body: string}>} Rendered template
 */
const renderEmailTemplate = async (template_key, dataObject = {}, company_id = 1) => {
  try {
    // Fetch template from database
    const [templates] = await pool.execute(
      `SELECT * FROM email_templates 
       WHERE template_key = ? 
       AND company_id = ? 
       AND is_deleted = 0 
       AND is_active = 1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [template_key, company_id]
    );

    let template;
    
    if (templates.length === 0) {
      // Fallback to default template if not found
      console.warn(`Template '${template_key}' not found, using default`);
      template = getDefaultTemplate(template_key);
    } else {
      template = templates[0];
    }

    // Replace placeholders in subject
    let renderedSubject = template.subject || '';
    Object.keys(dataObject).forEach(key => {
      const placeholder = `{${key}}`;
      const value = dataObject[key] || '';
      renderedSubject = renderedSubject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // Replace placeholders in body
    let renderedBody = template.body || '';
    Object.keys(dataObject).forEach(key => {
      const placeholder = `{${key}}`;
      const value = dataObject[key] || '';
      // Replace all occurrences
      renderedBody = renderedBody.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return {
      subject: renderedSubject,
      body: renderedBody,
      template_id: template.id
    };
  } catch (error) {
    console.error('Error rendering email template:', error);
    // Return fallback template
    const fallback = getDefaultTemplate(template_key);
    return {
      subject: fallback.subject,
      body: fallback.body,
      template_id: null
    };
  }
};

/**
 * Get default template if custom template not found
 */
const getDefaultTemplate = (template_key) => {
  const defaults = {
    contract_sent: {
      subject: 'Contract #{CONTRACT_ID}',
      body: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Hello {CONTACT_FIRST_NAME},</h2>
          <p>Here is your contract #{CONTRACT_ID}.</p>
          <p><a href="{PUBLIC_CONTRACT_URL}">View Contract</a></p>
          <p>Public URL: {PUBLIC_CONTRACT_URL}</p>
          <p>{SIGNATURE}</p>
        </div>
      `
    },
    contract_accepted: {
      subject: 'Contract #{CONTRACT_ID} Accepted',
      body: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Contract Accepted</h2>
          <p>Your contract #{CONTRACT_ID} has been accepted.</p>
          <p>{SIGNATURE}</p>
        </div>
      `
    },
    contract_rejected: {
      subject: 'Contract #{CONTRACT_ID} Rejected',
      body: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Contract Rejected</h2>
          <p>Your contract #{CONTRACT_ID} has been rejected.</p>
          <p>{SIGNATURE}</p>
        </div>
      `
    },
    estimate_sent: {
      subject: 'Estimate #{ESTIMATE_NUMBER}',
      body: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Hello {CONTACT_FIRST_NAME},</h2>
          <p>Here is your estimate #{ESTIMATE_NUMBER}.</p>
          <p><a href="{PUBLIC_ESTIMATE_URL}">View Estimate</a></p>
          <p>Amount: {ESTIMATE_AMOUNT}</p>
          <p>{SIGNATURE}</p>
        </div>
      `
    },
    invoice_sent: {
      subject: 'Invoice #{INVOICE_NUMBER}',
      body: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Hello {CONTACT_FIRST_NAME},</h2>
          <p>Here is your invoice #{INVOICE_NUMBER}.</p>
          <p><a href="{PUBLIC_INVOICE_URL}">View Invoice</a></p>
          <p>Amount: {INVOICE_AMOUNT}</p>
          <p>{SIGNATURE}</p>
        </div>
      `
    },
    proposal_sent: {
      subject: 'Proposal #{PROPOSAL_NUMBER}',
      body: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Hello {CONTACT_FIRST_NAME},</h2>
          <p>Here is your proposal #{PROPOSAL_NUMBER}.</p>
          <p><a href="{PUBLIC_PROPOSAL_URL}">View Proposal</a></p>
          <p>Amount: {PROPOSAL_AMOUNT}</p>
          <p>{SIGNATURE}</p>
        </div>
      `
    },
    reminder_sent: {
      subject: 'Reminder: {REMINDER_TITLE}',
      body: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Reminder</h2>
          <p>{REMINDER_MESSAGE}</p>
          <p>{SIGNATURE}</p>
        </div>
      `
    }
  };

  return defaults[template_key] || {
    subject: 'Notification',
    body: '<div style="padding: 20px;"><p>{MESSAGE}</p></div>'
  };
};

module.exports = {
  renderEmailTemplate,
  getDefaultTemplate
};

