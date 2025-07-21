import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Email service configuration
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'smtp', // 'smtp', 'sendgrid', 'brevo', 'ses'
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    apiUrl: 'https://api.brevo.com/v3/smtp/email'
  },
  from: process.env.EMAIL_FROM || 'noreply@localhost',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
};

// Initialize SendGrid if using that service
if (emailConfig.service === 'sendgrid' && emailConfig.sendgrid.apiKey) {
  sgMail.setApiKey(emailConfig.sendgrid.apiKey);
}

// Initialize email transporter based on service type
let transporter: nodemailer.Transporter | null = null;

function initializeTransporter() {
  if (transporter) return transporter;
  
  switch (emailConfig.service) {
    case 'smtp':
      transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: emailConfig.smtp.auth
      });
      break;
      
    default:
      console.warn('Unknown email service, falling back to SMTP');
      transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: emailConfig.smtp.auth
      });
  }
  
  return transporter;
}

// Email templates
const emailTemplates = {
  postNotification: (post: any, unsubscribeUrl: string) => ({
    subject: `📚 New AlwaysCurious Post: ${post.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Blog Post</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 35px; border-radius: 12px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: 0.5px;">📚 New AlwaysCurious Blog Post Published!</h1>
          <div style="background: rgba(255,255,255,0.2); height: 2px; width: 60px; margin: 15px auto; border-radius: 1px;"></div>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 22px; font-weight: 600; line-height: 1.3;">${post.title}</h2>
          
          ${post.excerpt ? `
            <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 15px 0;">
              ${post.excerpt}
            </p>
          ` : ''}
          
          <div style="margin: 25px 0; text-align: center;">
            <a href="${emailConfig.baseUrl}/blog/${post.slug}" 
               style="display: inline-block; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3); transition: all 0.3s ease;">
              📖 Read Full Post
            </a>
          </div>
          
          ${post.tags && post.tags.length > 0 ? `
            <div style="margin-top: 20px;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 8px;">Tags:</p>
              <div>
                ${post.tags.map((tag: string) => `
                  <span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px; display: inline-block;">
                    #${tag}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
          <p>You're receiving this because you subscribed to AlwaysCurious blog updates.</p>
          <p>
            <a href="${unsubscribeUrl}" style="color: #6c757d; text-decoration: underline;">
              Unsubscribe
            </a> | 
            <a href="${emailConfig.baseUrl}" style="color: #6c757d; text-decoration: underline;">
              Visit Blog
            </a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
📚 New AlwaysCurious Blog Post Published!

${post.title}

${post.excerpt || ''}

Read the full post: ${emailConfig.baseUrl}/blog/${post.slug}

${post.tags && post.tags.length > 0 ? `Tags: ${post.tags.join(', ')}` : ''}

---
You're receiving this because you subscribed to AlwaysCurious blog updates.
Unsubscribe: ${unsubscribeUrl}
Visit Blog: ${emailConfig.baseUrl}
    `
  }),

  emailVerification: (verificationUrl: string, subscriberName?: string) => ({
    subject: 'Please verify your email subscription',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✉️ Verify Your Email</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Welcome${subscriberName ? `, ${subscriberName}` : ''}!</h2>
          
          <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6;">
            Thank you for subscribing to our AlwaysCurious blog! To complete your subscription and start receiving updates about new posts, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
              ✅ Verify Email Address
            </a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #3498db; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
          <p>If you didn't subscribe to this blog, you can safely ignore this email.</p>
          <p>This verification link will expire in 24 hours.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome${subscriberName ? `, ${subscriberName}` : ''}!

Thank you for subscribing to our AlwaysCurious blog! To complete your subscription and start receiving updates about new posts, please verify your email address.

Verify your email: ${verificationUrl}

If you didn't subscribe to this blog, you can safely ignore this email.
This verification link will expire in 24 hours.
    `
  }),

  authVerification: (verificationUrl: string, userName?: string) => ({
    subject: 'Please verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✉️ Verify Your Email</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Welcome${userName ? `, ${userName}` : ''}!</h2>
          
          <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6;">
            Thank you for creating an account with AlwaysCurious! To complete your account setup and gain access to all features, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
              ✅ Verify Email Address
            </a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #3498db; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
          <p>If you didn't create this account, you can safely ignore this email.</p>
          <p>This verification link will expire in 24 hours.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome${userName ? `, ${userName}` : ''}!

Thank you for creating an account with AlwaysCurious! To complete your account setup and gain access to all features, please verify your email address.

Verify your email: ${verificationUrl}

If you didn't create this account, you can safely ignore this email.
This verification link will expire in 24 hours.
    `
  }),

  welcomeEmail: (subscriberName?: string) => ({
    subject: 'Welcome to the AlwaysCurious blog!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Welcome to AlwaysCurious!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hello${subscriberName ? `, ${subscriberName}` : ''}!</h2>
          
          <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6;">
            Your email has been verified successfully! You're now subscribed to receive notifications about new blog posts.
          </p>
          
          <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6;">
            We'll send you an email whenever we publish new content, so you'll never miss an update.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}" 
               style="display: inline-block; background: #FF6B6B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
              🏠 Visit Our Blog
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
          <p>Thanks for joining our community!</p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome${subscriberName ? `, ${subscriberName}` : ''}!

Your email has been verified successfully! You're now subscribed to receive notifications about new blog posts.

We'll send you an email whenever we publish new content, so you'll never miss an update.

Visit our blog: ${emailConfig.baseUrl}

Thanks for joining our community!
    `
  }),

  adminNewUserNotification: (userEmail: string, userId: string) => ({
    subject: '🔔 New User Registration - Approval Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New User Registration</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 35px; border-radius: 12px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: 0.5px;">🔔 New User Registration</h1>
          <div style="background: rgba(255,255,255,0.2); height: 2px; width: 60px; margin: 15px auto; border-radius: 1px;"></div>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 22px; font-weight: 600; line-height: 1.3;">⚠️ Admin Action Required</h2>
          
          <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 15px 0;">
            A new user has verified their email and is awaiting admin approval to access the application.
          </p>
          
          <div style="background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">User Details:</h3>
            <ul style="color: #5a6c7d; font-size: 16px; line-height: 1.8; margin: 10px 0; list-style: none; padding: 0;">
              <li><strong>📧 Email:</strong> ${userEmail}</li>
              <li><strong>🆔 User ID:</strong> ${userId}</li>
              <li><strong>📅 Registration:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>✅ Status:</strong> Email Verified, Pending Approval</li>
            </ul>
          </div>
          
          <div style="margin: 25px 0; text-align: center;">
            <a href="${emailConfig.baseUrl}/admin/users" 
               style="display: inline-block; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3); transition: all 0.3s ease; margin-right: 10px;">
              👥 Manage Users
            </a>
            <a href="${emailConfig.baseUrl}/admin/users?user=${userId}" 
               style="display: inline-block; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3); transition: all 0.3s ease;">
              👤 View User
            </a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 25px; text-align: center; font-style: italic;">
            Please review and approve this user to grant them access to the application.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
          <p>This is an automated notification from AlwaysCurious User Management System.</p>
          <p>
            <a href="${emailConfig.baseUrl}/admin" style="color: #6c757d; text-decoration: underline;">
              Admin Dashboard
            </a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
🔔 New User Registration - Admin Action Required

A new user has verified their email and is awaiting admin approval to access the application.

User Details:
• Email: ${userEmail}
• User ID: ${userId}
• Registration: ${new Date().toLocaleString()}
• Status: Email Verified, Pending Approval

To approve this user, visit the admin dashboard:
${emailConfig.baseUrl}/admin/users

Direct link to user: ${emailConfig.baseUrl}/admin/users?user=${userId}

Please review and approve this user to grant them access to the application.

---
This is an automated notification from AlwaysCurious User Management System.
    `
  }),

  userApprovalNotification: (userEmail: string, userName?: string) => ({
    subject: '🎉 Account Approved - Welcome to AlwaysCurious!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 35px; border-radius: 12px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 32px rgba(46, 204, 113, 0.3);">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: 0.5px;">🎉 Account Approved!</h1>
          <div style="background: rgba(255,255,255,0.2); height: 2px; width: 60px; margin: 15px auto; border-radius: 1px;"></div>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 22px; font-weight: 600; line-height: 1.3;">Welcome to AlwaysCurious${userName ? `, ${userName}` : ''}!</h2>
          
          <p style="color: #7f8c8d; font-size: 14px; margin: 5px 0; text-align: center;">Account: ${userEmail}</p>
          
          <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 15px 0;">
            Great news! Your account has been approved by our admin team. You now have full access to the AlwaysCurious platform.
          </p>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0; font-size: 18px;">✅ What you can do now:</h3>
            <ul style="color: #2c3e50; font-size: 16px; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
              <li>📝 Access the full blog and content management system</li>
              <li>💬 Use the AI-powered chat and RAG features</li>
              <li>📚 Upload and process documents</li>
              <li>🔧 Access advanced tools and features</li>
            </ul>
          </div>
          
          <div style="margin: 25px 0; text-align: center;">
            <a href="${emailConfig.baseUrl}/auth/signin" 
               style="display: inline-block; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3); transition: all 0.3s ease;">
              🚀 Sign In Now
            </a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 25px; text-align: center; font-style: italic;">
            "Stay curious, keep learning, always growing" ✨
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
          <p>Thank you for being part of our journey of continuous learning and discovery!</p>
          <p>
            <a href="${emailConfig.baseUrl}" style="color: #6c757d; text-decoration: underline;">
              Visit AlwaysCurious
            </a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
🎉 Account Approved - Welcome to AlwaysCurious!

Welcome to AlwaysCurious${userName ? `, ${userName}` : ''}!

Account: ${userEmail}
|
Great news! Your account has been approved by our admin team. You now have full access to the AlwaysCurious platform.

✅ What you can do now:
• Access the full blog and content management system
• Use the AI-powered chat and RAG features  
• Upload and process documents
• Access advanced tools and features

Sign in now: ${emailConfig.baseUrl}/auth/signin

"Stay curious, keep learning, always growing"

Thank you for being part of our journey of continuous learning and discovery!

Visit AlwaysCurious: ${emailConfig.baseUrl}
    `
  })
};

// Main email sending function
export async function sendEmail(to: string, template: keyof typeof emailTemplates, data: any = {}) {
  try {
    let subject: string, html: string, text: string;
    
    // Handle different template parameter structures
    if (template === 'emailVerification') {
      const templateResult = emailTemplates[template](data.verificationUrl, data.subscriberName);
      subject = templateResult.subject;
      html = templateResult.html;
      text = templateResult.text;
    } else if (template === 'authVerification') {
      const templateResult = emailTemplates[template](data.verificationUrl, data.userName);
      subject = templateResult.subject;
      html = templateResult.html;
      text = templateResult.text;
    } else if (template === 'welcomeEmail') {
      const templateResult = emailTemplates[template](data.subscriberName);
      subject = templateResult.subject;
      html = templateResult.html;
      text = templateResult.text;
    } else if (template === 'postNotification') {
      const templateResult = emailTemplates[template](data, data.unsubscribeUrl);
      subject = templateResult.subject;
      html = templateResult.html;
      text = templateResult.text;
    } else if (template === 'adminNewUserNotification') {
      const templateResult = emailTemplates[template](data.userEmail, data.userId);
      subject = templateResult.subject;
      html = templateResult.html;
      text = templateResult.text;
    } else if (template === 'userApprovalNotification') {
      const templateResult = emailTemplates[template](data.userEmail, data.userName);
      subject = templateResult.subject;
      html = templateResult.html;
      text = templateResult.text;
    } else {
      throw new Error(`Unknown email template: ${template}`);
    }

    if (emailConfig.service === 'sendgrid') {
      // Use SendGrid API
      if (!emailConfig.sendgrid.apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const msg = {
        to,
        from: emailConfig.from,
        subject,
        text,
        html,
      };

      const result = await sgMail.send(msg);
      console.log('✅ Email sent successfully via SendGrid:', { to, subject, messageId: result[0].headers['x-message-id'] });
      
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } else if (emailConfig.service === 'brevo') {
      // Use Brevo (Sendinblue) API
      if (!emailConfig.brevo.apiKey) {
        throw new Error('Brevo API key not configured');
      }

      const brevoPayload = {
        sender: {
          email: emailConfig.from.includes('<') ? emailConfig.from.match(/<(.+)>/)?.[1] : emailConfig.from,
          name: emailConfig.from.includes('<') ? emailConfig.from.split('<')[0]?.trim() : undefined
        },
        to: [{
          email: to
        }],
        subject,
        htmlContent: html,
        textContent: text
      };

      const response = await fetch(emailConfig.brevo.apiUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': emailConfig.brevo.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(brevoPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully via Brevo:', { to, subject, messageId: result.messageId });
      
      return { success: true, messageId: result.messageId };
    } else {
      // Use SMTP (nodemailer)
      const mailer = initializeTransporter();
      if (!mailer) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: emailConfig.from,
        to,
        subject,
        html,
        text
      };

      const result = await mailer.sendMail(mailOptions);
      console.log('✅ Email sent successfully via SMTP:', { to, subject, messageId: result.messageId });
      
      return { success: true, messageId: result.messageId };
    }
  } catch (error: any) {
    console.error('❌ Email sending failed:', error);
    
    // Enhanced SendGrid error handling
    if (error.response && error.response.body) {
      console.error('❌ SendGrid detailed error:', JSON.stringify(error.response.body, null, 2));
      const errorMessage = error.response.body.errors ? 
        error.response.body.errors.map((e: any) => e.message).join('; ') : 
        error.message;
      return { success: false, error: errorMessage };
    }
    
    return { success: false, error: (error as Error).message };
  }
}

// Send post notification to subscriber
export async function sendPostNotification(subscriberEmail: string, post: any, unsubscribeToken: string) {
  const unsubscribeUrl = `${emailConfig.baseUrl}/api/subscribers?action=unsubscribe&token=${unsubscribeToken}`;
  
  return await sendEmail(subscriberEmail, 'postNotification', {
    ...post,
    unsubscribeUrl
  });
}

// Send email verification for blog subscribers
export async function sendEmailVerification(subscriberEmail: string, verificationToken: string, subscriberName?: string) {
  const verificationUrl = `${emailConfig.baseUrl}/api/subscribers?action=verify&token=${verificationToken}`;
  
  return await sendEmail(subscriberEmail, 'emailVerification', {
    verificationUrl,
    subscriberName
  });
}

// Send email verification for auth users
export async function sendAuthEmailVerification(userEmail: string, verificationToken: string, userName?: string) {
  const verificationUrl = `${emailConfig.baseUrl}/api/auth/verify-email?token=${verificationToken}`;
  
  return await sendEmail(userEmail, 'authVerification', {
    verificationUrl,
    userName
  });
}

// Send welcome email after verification
export async function sendWelcomeEmail(subscriberEmail: string, subscriberName?: string) {
  return await sendEmail(subscriberEmail, 'welcomeEmail', {
    subscriberName
  });
}

// Send admin notification when a new user verifies their email
export async function sendAdminNewUserNotification(userEmail: string, userId: string) {
  const adminEmail = 'phil.cannata@yahoo.com';
  
  return await sendEmail(adminEmail, 'adminNewUserNotification', {
    userEmail,
    userId
  });
}

// Send user approval notification
export async function sendUserApprovalNotification(userEmail: string, userName?: string) {
  return await sendEmail(userEmail, 'userApprovalNotification', {
    userEmail,
    userName
  });
}

// Test email configuration
export async function testEmailConfig() {
  try {
    if (emailConfig.service === 'sendgrid') {
      // Test SendGrid configuration
      if (!emailConfig.sendgrid.apiKey) {
        throw new Error('SendGrid API key not configured');
      }
      if (!emailConfig.from) {
        throw new Error('Email FROM address not configured');
      }
      
      console.log('✅ SendGrid configuration looks valid');
      return { success: true };
    } else {
      // Test SMTP configuration
      const mailer = initializeTransporter();
      if (!mailer) {
        throw new Error('Email transporter not initialized');
      }

      await mailer.verify();
      console.log('✅ SMTP configuration is valid');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return { success: false, error: (error as Error).message };
  }
}
