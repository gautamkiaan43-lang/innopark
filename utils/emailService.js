// =====================================================
// Email Service Utility
// =====================================================

/**
 * Send email (placeholder - integrate with your email service)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @param {Array} options.attachments - Attachments (optional)
 */
const nodemailer = require('nodemailer');

// Create transporter (singleton pattern)
let transporter = null;

const createTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Only create transporter if credentials are provided
  if (smtpConfig.auth.user && smtpConfig.auth.pass) {
    transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection on startup
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP Connection Error:', error.message);
        console.warn('⚠️  Email service not configured. Emails will be logged only.');
      } else {
        console.log('✅ SMTP Server ready to send emails');
      }
    });
  } else {
    console.warn('⚠️  SMTP credentials not configured. Emails will be logged only.');
  }

  return transporter;
};

const sendEmail = async (options) => {
  try {
    console.log('=== EMAIL SERVICE CALLED ===');
    console.log('To:', options.to);
    console.log('CC:', options.cc);
    console.log('BCC:', options.bcc);
    console.log('Subject:', options.subject);
    console.log('Has HTML:', !!options.html);
    console.log('Has Text:', !!options.text);

    const emailTransporter = createTransporter();

    // If transporter is not configured, log and return success (for development)
    if (!emailTransporter) {
      console.log('⚠️  Email Service (Development Mode - SMTP Not Configured)');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('HTML:', options.html ? 'Content provided' : 'No HTML');
      console.log('Text:', options.text || 'No text');
      console.log('Attachments:', options.attachments?.length || 0);

      // In production, this should fail
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          error: 'SMTP configuration is required in production environment',
          message: 'Email service not configured'
        };
      }

      return {
        success: true,
        message: 'Email logged to console (SMTP not configured)',
        messageId: `dev-${Date.now()}`
      };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '"CRM Worksuite" <noreply@crmworksuite.com>',
      to: options.to,
      subject: options.subject,
      html: options.html || options.text,
      text: options.text || (options.html ? options.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : ''),
      attachments: options.attachments || []
    };

    // Only include CC and BCC if provided
    if (options.cc) {
      mailOptions.cc = options.cc;
    }
    if (options.bcc) {
      mailOptions.bcc = options.bcc;
    }

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      cc: mailOptions.cc,
      bcc: mailOptions.bcc,
      subject: mailOptions.subject
    });

    const info = await emailTransporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);
    console.log('Response:', info.response);

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ EMAIL SENDING FAILED ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error response:', error.response);
    console.error('Error stack:', error.stack);
    
    // Don't throw error - return failure so calling code can handle gracefully
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      code: error.code,
      message: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? {
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      } : undefined
    };
  }
};

/**
 * Generate proposal email HTML
 */
const generateProposalEmailHTML = (proposal, publicUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Proposal: ${proposal.estimate_number || 'PROP#001'}</h1>
        </div>
        <div class="content">
          <p>Dear ${proposal.client_name || 'Client'},</p>
          <p>We are pleased to present the following proposal for your consideration.</p>
          <p><strong>Proposal Number:</strong> ${proposal.estimate_number || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(proposal.estimate_date || Date.now()).toLocaleDateString()}</p>
          <p><strong>Valid Until:</strong> ${proposal.valid_till ? new Date(proposal.valid_till).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Total Amount:</strong> ${proposal.currency || '$'}${parseFloat(proposal.total || 0).toFixed(2)}</p>
          <p style="margin-top: 30px;">
            <a href="${publicUrl}" class="button">View Proposal</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate estimate email HTML
 */
const generateEstimateEmailHTML = (estimate, publicUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Estimate: ${estimate.estimate_number || 'EST#001'}</h1>
        </div>
        <div class="content">
          <p>Dear ${estimate.client_name || 'Client'},</p>
          <p>Please find attached the estimate for your review.</p>
          <p><strong>Estimate Number:</strong> ${estimate.estimate_number || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(estimate.estimate_date || Date.now()).toLocaleDateString()}</p>
          <p><strong>Valid Until:</strong> ${estimate.valid_till ? new Date(estimate.valid_till).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Total Amount:</strong> ${estimate.currency || '$'}${parseFloat(estimate.total || 0).toFixed(2)}</p>
          <p style="margin-top: 30px;">
            <a href="${publicUrl}" class="button">View Estimate</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate invoice email HTML
 */
const generateInvoiceEmailHTML = (invoice, publicUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice: ${invoice.invoice_number || 'INV#001'}</h1>
        </div>
        <div class="content">
          <p>Dear ${invoice.client_name || 'Client'},</p>
          <p>Please find attached your invoice for payment.</p>
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(invoice.invoice_date || Date.now()).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Total Amount:</strong> ${invoice.currency || '$'}${parseFloat(invoice.total || 0).toFixed(2)}</p>
          <p><strong>Status:</strong> ${invoice.status || 'Unpaid'}</p>
          <p style="margin-top: 30px;">
            <a href="${publicUrl}" class="button">View Invoice</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  generateProposalEmailHTML,
  generateEstimateEmailHTML,
  generateInvoiceEmailHTML
};

