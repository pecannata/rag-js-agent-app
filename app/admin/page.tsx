'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

// Accordion Component
const Accordion = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-semibold text-gray-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <span className="transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

// Code Block Component
const CodeBlock = ({ children, title }: { children: string; title?: string }) => (
  <div className="mb-4">
    {title && <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>}
    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
      <code>{children}</code>
    </pre>
  </div>
);

// Info Card Component
const InfoCard = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) => (
  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
    <div className="flex items-start">
      {icon && <span className="mr-2 text-blue-500 text-lg">{icon}</span>}
      <div>
        <h4 className="text-blue-800 font-semibold mb-2">{title}</h4>
        <div className="text-blue-700 text-sm">{children}</div>
      </div>
    </div>
  </div>
);

export default function SystemInfoPage() {
  const { data: session, status } = useSession();

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not admin
  if (!session?.user?.email || session.user.email !== 'phil.cannata@yahoo.com') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">System Information & Monitoring</h1>
              <p className="text-gray-600">Administrative tools and service information for managing the RAG JS Agent application</p>
              <p className="text-xs text-gray-500 mt-2">Logged in as: {session?.user?.email}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = '/admin/users'}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
              >
                <span className="mr-1">👤</span>
                User Management
              </button>
              <button
                onClick={() => window.location.href = '/admin/subscribers'}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
              >
                <span className="mr-1">📧</span>
                Subscribers
              </button>
              <button
                onClick={() => window.location.href = '/admin/cache'}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
              >
                <span className="mr-1">🗄️</span>
                Cache Admin
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Back to App
              </button>
            </div>
          </div>
        </div>

        {/* Server Monitoring Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🖥️ Server Monitoring</h2>
          
          <Accordion title="📊 Local Development Monitoring" defaultOpen={true}>
            <InfoCard title="Monitor Server Output" icon="🔍">
              Use this command to watch real-time server logs and terminal output in development mode.
            </InfoCard>
            <CodeBlock title="Watch Development Logs">
              ./watch-logs.sh
            </CodeBlock>
            
            <InfoCard title="Production Log Monitoring" icon="📝">
              For production deployments, monitor the application logs with these commands.
            </InfoCard>
            <CodeBlock title="View Production Logs">
              tail -f production.log
            </CodeBlock>
            
            <InfoCard title="tmux Session Management" icon="🖥️">
              The application runs in a tmux session for persistence.
            </InfoCard>
            <CodeBlock title="tmux Commands">
{`# List all tmux sessions
tmux ls

# Attach to the application session
tmux attach -t rag-js-agent-app

# Detach from session (inside tmux)
Ctrl+B, then D

# Stop the local server
./stop.mac`}
            </CodeBlock>
          </Accordion>

          <Accordion title="🐧 Linux Server Management (Production)">
            <InfoCard title="SystemD Service Status" icon="⚙️">
              Check the current status of the production service running on your Linux server.
            </InfoCard>
            <CodeBlock title="Service Status">
              sudo systemctl status rag-js-agent
            </CodeBlock>
            
            <InfoCard title="Service Control" icon="🔄">
              Restart the service when needed (after updates, configuration changes, etc.).
            </InfoCard>
            <CodeBlock title="Restart Service">
              sudo systemctl restart rag-js-agent
            </CodeBlock>
            
            <InfoCard title="Real-time Logs" icon="📋">
              Follow the service logs in real-time to debug issues or monitor activity.
            </InfoCard>
            <CodeBlock title="Follow Service Logs">
              sudo journalctl -u rag-js-agent -f
            </CodeBlock>
            
            <InfoCard title="Additional Service Commands" icon="🛠️">
              Other useful systemd commands for service management.
            </InfoCard>
            <CodeBlock title="Additional Commands">
{`# Start service
sudo systemctl start rag-js-agent

# Stop service
sudo systemctl stop rag-js-agent

# Enable service (start on boot)
sudo systemctl enable rag-js-agent

# Disable service (don't start on boot)
sudo systemctl disable rag-js-agent

# Reload systemd configuration
sudo systemctl daemon-reload`}
            </CodeBlock>
          </Accordion>

          <Accordion title="🌐 Deployment Commands">
            <InfoCard title="Remote Deployment" icon="🚀">
              Deploy to your Oracle Cloud production server.
            </InfoCard>
            <CodeBlock title="Deploy to Production">
              ./deploy.sh
            </CodeBlock>
            
            <InfoCard title="Local Mac Deployment" icon="🍎">
              Deploy and run locally on your Mac in production mode.
            </InfoCard>
            <CodeBlock title="Deploy Locally">
              ./deploy.mac
            </CodeBlock>
          </Accordion>
        </div>

        {/* Services Information Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔧 Third-Party Services</h2>
          
          <Accordion title="☁️ Cloudflare Integration">
            <InfoCard title="What is Cloudflare?" icon="🛡️">
              Cloudflare is a content delivery network (CDN) and web security service that sits between your website visitors and your server.
            </InfoCard>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">How We Use Cloudflare:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>SSL/TLS Encryption:</strong> Provides secure HTTPS connections with automatic certificate management</li>
                  <li><strong>CDN (Content Delivery Network):</strong> Caches static assets globally for faster load times</li>
                  <li><strong>DDoS Protection:</strong> Protects against distributed denial-of-service attacks</li>
                  <li><strong>DNS Management:</strong> Manages domain name resolution for alwayscurious.ai</li>
                  <li><strong>Web Application Firewall:</strong> Filters malicious traffic before it reaches our server</li>
                  <li><strong>Analytics:</strong> Provides insights into website traffic and performance</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Configuration Details:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Domain: alwayscurious.ai (proxied through Cloudflare)</li>
                  <li>SSL Mode: Full (strict) - encrypts traffic between Cloudflare and origin server</li>
                  <li>Always Use HTTPS: Enabled - redirects HTTP to HTTPS automatically</li>
                  <li>Caching Level: Standard - caches static content with smart rules</li>
                  <li>Security Level: Medium - balanced protection vs. accessibility</li>
                </ul>
              </div>

              <InfoCard title="Benefits" icon="✨">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Improved website performance and loading speed</li>
                  <li>Enhanced security against various web threats</li>
                  <li>Reduced server load through intelligent caching</li>
                  <li>Global availability and reliability</li>
                  <li>Free SSL certificates with automatic renewal</li>
                </ul>
              </InfoCard>
            </div>
          </Accordion>

          <Accordion title="✍️ TinyMCE Rich Text Editor">
            <InfoCard title="What is TinyMCE?" icon="📝">
              TinyMCE is a powerful WYSIWYG (What You See Is What You Get) rich text editor that provides word processor-like editing capabilities in web browsers.
            </InfoCard>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">How We Use TinyMCE:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Blog Post Creation:</strong> Primary editor for creating and formatting blog content</li>
                  <li><strong>Rich Text Formatting:</strong> Supports bold, italic, headings, lists, tables, and more</li>
                  <li><strong>Media Integration:</strong> Allows insertion of images, links, and embedded content</li>
                  <li><strong>Code Editing:</strong> Includes syntax highlighting for code snippets</li>
                  <li><strong>Custom Styling:</strong> Maintains consistent formatting across all blog posts</li>
                  <li><strong>Real-time Preview:</strong> WYSIWYG editing shows exactly how content will appear</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Configuration Features:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Custom toolbar with essential editing tools</li>
                  <li>Image upload and management capabilities</li>
                  <li>Table creation and editing tools</li>
                  <li>Code syntax highlighting plugin</li>
                  <li>Link management and validation</li>
                  <li>Responsive design for mobile editing</li>
                  <li>Auto-save functionality to prevent content loss</li>
                </ul>
              </div>

              <InfoCard title="Integration Details" icon="🔧">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Version: Latest TinyMCE 6.x</li>
                  <li>Location: /public/tinymce/ (self-hosted for performance)</li>
                  <li>Plugins: Image, link, code, table, lists, and more</li>
                  <li>Theme: Silver (modern, clean interface)</li>
                  <li>Custom CSS integration for consistent styling</li>
                </ul>
              </InfoCard>
            </div>
          </Accordion>

          <Accordion title="📧 Brevo Email Service">
            <InfoCard title="What is Brevo?" icon="✉️">
              Brevo (formerly Sendinblue) is a comprehensive email marketing and transactional email service that handles all our email communications.
            </InfoCard>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">How We Use Brevo:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Transactional Emails:</strong> Account verification, password resets, and notifications</li>
                  <li><strong>Blog Notifications:</strong> Automated emails to subscribers when new posts are published</li>
                  <li><strong>Admin Notifications:</strong> Alerts when new users register and need approval</li>
                  <li><strong>Welcome Emails:</strong> Onboarding messages for new subscribers and users</li>
                  <li><strong>System Alerts:</strong> Important system notifications and updates</li>
                  <li><strong>Email Templates:</strong> Professional, responsive email designs</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Email Types We Send:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Email Verification:</strong> Confirms email addresses for blog subscribers</li>
                  <li><strong>Auth Verification:</strong> Verifies email addresses for user accounts</li>
                  <li><strong>Welcome Messages:</strong> Welcomes new subscribers and approved users</li>
                  <li><strong>Blog Post Notifications:</strong> Notifies subscribers of new content</li>
                  <li><strong>Admin Alerts:</strong> Notifies admins of new user registrations</li>
                  <li><strong>Approval Confirmations:</strong> Confirms when user accounts are approved</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Technical Configuration:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>API Integration: RESTful API v3 for reliable delivery</li>
                  <li>Authentication: API key-based secure authentication</li>
                  <li>From Address: Verified sender domain for better deliverability</li>
                  <li>Templates: HTML and text versions for all email types</li>
                  <li>Tracking: Open rates, click rates, and delivery status</li>
                  <li>Unsubscribe: Automatic handling of unsubscribe requests</li>
                </ul>
              </div>

              <InfoCard title="Benefits & Features" icon="🌟">
                <ul className="list-disc pl-4 space-y-1">
                  <li>High deliverability rates with established sender reputation</li>
                  <li>Professional email templates with responsive design</li>
                  <li>Detailed analytics and delivery reporting</li>
                  <li>Automatic bounce and unsubscribe handling</li>
                  <li>GDPR compliant email processing</li>
                  <li>Reliable infrastructure with 99.9% uptime</li>
                  <li>Cost-effective pricing for transactional emails</li>
                </ul>
              </InfoCard>

              <CodeBlock title="Test Email Configuration">
{`# Test Brevo email service
curl -X GET http://localhost:3000/api/test-brevo

# Test specific email template
curl -X POST http://localhost:3000/api/test-email \\
  -H "Content-Type: application/json" \\
  -d '{"to": "test@example.com", "template": "welcomeEmail"}'`}
              </CodeBlock>
            </div>
          </Accordion>

          <Accordion title="🤖 AI & Language Models">
            <InfoCard title="OpenAI Integration" icon="🧠">
              The application integrates with OpenAI's GPT models for AI-powered features and conversational interfaces.
            </InfoCard>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">AI Features:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Chat Interface:</strong> Interactive AI conversations for user queries</li>
                  <li><strong>Document Processing:</strong> AI-powered document analysis and summarization</li>
                  <li><strong>Content Generation:</strong> Assistance with blog post creation and editing</li>
                  <li><strong>RAG (Retrieval-Augmented Generation):</strong> Context-aware responses using stored documents</li>
                  <li><strong>Text Processing:</strong> Chunking, embedding, and semantic search capabilities</li>
                </ul>
              </div>

              <InfoCard title="Model Configuration" icon="⚙️">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Primary Model: GPT-4 for complex reasoning tasks</li>
                  <li>Fallback Model: GPT-3.5-turbo for efficient responses</li>
                  <li>Embedding Model: text-embedding-ada-002 for document vectors</li>
                  <li>Local Ollama integration for offline AI capabilities</li>
                </ul>
              </InfoCard>
            </div>
          </Accordion>
        </div>

        {/* System Health Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 System Health</h2>
          
          <Accordion title="🏥 Health Check Endpoints">
            <InfoCard title="System Monitoring URLs" icon="🔍">
              Use these endpoints to check various system components and their status.
            </InfoCard>
            
            <div className="space-y-4">
              <CodeBlock title="Health Check URLs">
{`# System specifications
GET /api/system-specs

# Ollama AI service status
GET /api/ollama/status

# Database connection test
GET /api/database

# Email service test
GET /api/test-email

# Background jobs status
GET /api/background-jobs`}
              </CodeBlock>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Monitoring Checklist:</h4>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>✅ Server response time and availability</li>
                  <li>✅ Database connectivity and performance</li>
                  <li>✅ Email service functionality and deliverability</li>
                  <li>✅ AI service availability and response quality</li>
                  <li>✅ File upload and storage capabilities</li>
                  <li>✅ SSL certificate validity and expiration</li>
                  <li>✅ Background job processing status</li>
                </ul>
              </div>
            </div>
          </Accordion>
        </div>

        {/* Security Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔒 Security Information</h2>
          
          <Accordion title="🛡️ Security Measures">
            <div className="space-y-4">
              <InfoCard title="Authentication & Authorization" icon="🔐">
                <ul className="list-disc pl-4 space-y-1">
                  <li>NextAuth.js for secure user authentication</li>
                  <li>Admin-only access controls for sensitive operations</li>
                  <li>Email verification required for new accounts</li>
                  <li>Manual admin approval for user registration</li>
                </ul>
              </InfoCard>

              <InfoCard title="Data Protection" icon="🔒">
                <ul className="list-disc pl-4 space-y-1">
                  <li>HTTPS enforced for all communications</li>
                  <li>Environment variables for sensitive configuration</li>
                  <li>Secure API key management</li>
                  <li>Input validation and sanitization</li>
                </ul>
              </InfoCard>

              <InfoCard title="Infrastructure Security" icon="🏰">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Cloudflare Web Application Firewall</li>
                  <li>DDoS protection and rate limiting</li>
                  <li>Secure server configuration with firewall rules</li>
                  <li>Regular security updates and patches</li>
                </ul>
              </InfoCard>
            </div>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
