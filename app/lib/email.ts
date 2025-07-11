import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Email service configuration
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'smtp', // 'smtp', 'sendgrid', 'ses'
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
    subject: `New Post: ${post.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Blog Post</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 New Blog Post Published!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 20px;">${post.title}</h2>
          
          ${post.excerpt ? `
            <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 15px 0;">
              ${post.excerpt}
            </p>
          ` : ''}
          
          <div style="margin: 25px 0;">
            <a href="${emailConfig.baseUrl}/blog/${post.slug}" 
               style="display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
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
New Blog Post: ${post.title}

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

// Send email verification
export async function sendEmailVerification(subscriberEmail: string, verificationToken: string, subscriberName?: string) {
  const verificationUrl = `${emailConfig.baseUrl}/api/subscribers?action=verify&token=${verificationToken}`;
  
  return await sendEmail(subscriberEmail, 'emailVerification', {
    verificationUrl,
    subscriberName
  });
}

// Send welcome email after verification
export async function sendWelcomeEmail(subscriberEmail: string, subscriberName?: string) {
  return await sendEmail(subscriberEmail, 'welcomeEmail', {
    subscriberName
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
