'use client';

import React, { useState } from 'react';
import SubscriptionForm from '../components/SubscriptionForm';
import SchedulerDashboard from '../components/SchedulerDashboard';

export default function DemoPage() {
  const [activeDemo, setActiveDemo] = useState<'subscription' | 'dashboard' | 'both'>('both');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎉 Blog Scheduler & Email System Demo
              </h1>
              <p className="text-gray-600 mt-2">
                Explore the new Phase 2 features: Scheduling, Email Notifications, and Monitoring
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveDemo('subscription')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeDemo === 'subscription'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📧 Subscription Form
              </button>
              <button
                onClick={() => setActiveDemo('dashboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeDemo === 'dashboard'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📊 Scheduler Dashboard
              </button>
              <button
                onClick={() => setActiveDemo('both')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeDemo === 'both'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🎯 Show Both
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">✨ What's New in Phase 2</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">📅</div>
              <h3 className="font-semibold mb-1">Post Scheduling</h3>
              <p className="text-sm opacity-90">Schedule blog posts for future publication with automatic publishing</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">📧</div>
              <h3 className="font-semibold mb-1">Email Notifications</h3>
              <p className="text-sm opacity-90">Automatic email notifications via SendGrid with beautiful HTML templates</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold mb-1">Subscriber Management</h3>
              <p className="text-sm opacity-90">Complete subscription system with verification and unsubscribe</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold mb-1">Real-time Monitoring</h3>
              <p className="text-sm opacity-90">Live dashboard for monitoring jobs, emails, and subscriber activity</p>
            </div>
          </div>
        </div>

        {/* Email Service Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            📧 Email Service Integration
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                SendGrid Integration
              </h3>
              
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Service Provider</h4>
                  <p className="text-blue-800 text-sm">
                    <strong>SendGrid</strong> - Professional email delivery service by Twilio
                  </p>
                  <a 
                    href="https://sendgrid.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline mt-1 inline-block"
                  >
                    → Visit SendGrid.com
                  </a>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Key Features</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• <strong>99.95% Uptime SLA</strong> - Enterprise-grade reliability</li>
                    <li>• <strong>Global Infrastructure</strong> - Worldwide email delivery</li>
                    <li>• <strong>Deliverability Optimization</strong> - Anti-spam compliance</li>
                    <li>• <strong>Real-time Analytics</strong> - Detailed delivery reports</li>
                    <li>• <strong>Template Engine</strong> - Dynamic email content</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Free Tier</h4>
                  <p className="text-gray-700 text-sm">
                    • <strong>100 emails/day</strong> forever free<br/>
                    • No monthly commitment required<br/>
                    • Full API access and analytics<br/>
                    • Perfect for development and small blogs
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🔧 Implementation Details
              </h3>
              
              <div className="space-y-3">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">Email Types Supported</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• <strong>Verification Emails</strong> - Welcome new subscribers</li>
                    <li>• <strong>Welcome Emails</strong> - Post-verification welcome</li>
                    <li>• <strong>Post Notifications</strong> - New blog post alerts</li>
                    <li>• <strong>Manual Verification</strong> - Admin override capability</li>
                  </ul>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">Technical Stack</h4>
                  <ul className="text-orange-800 text-sm space-y-1">
                    <li>• <strong>@sendgrid/mail</strong> - Official Node.js SDK</li>
                    <li>• <strong>API-based</strong> - RESTful integration</li>
                    <li>• <strong>HTML Templates</strong> - Responsive email design</li>
                    <li>• <strong>Fallback Support</strong> - SMTP backup option</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">Security Features</h4>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• <strong>Sender Authentication</strong> - Domain verification</li>
                    <li>• <strong>API Key Security</strong> - Scoped permissions</li>
                    <li>• <strong>Unsubscribe Compliance</strong> - CAN-SPAM compliant</li>
                    <li>• <strong>Token-based Verification</strong> - Secure email links</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              🚀 Why SendGrid for AlwaysCurious Blog?
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              SendGrid was chosen for the AlwaysCurious blog system because of its excellent 
              deliverability rates, comprehensive API, and reliable infrastructure. The free tier 
              provides 100 emails per day, which is perfect for growing blogs, while the 
              professional features ensure emails reach subscribers' inboxes rather than spam folders. 
              The integration includes beautiful HTML email templates, automatic retry logic, 
              and detailed delivery analytics.
            </p>
          </div>
        </div>

        {/* Demo Content */}
        {(activeDemo === 'subscription' || activeDemo === 'both') && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📧 Subscription Form Demo</h2>
              <p className="text-gray-600 mb-6">
                This component handles email subscriptions with verification flow. Try subscribing with a real email to test the verification process.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Full Subscription Form</h3>
                  <SubscriptionForm />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Compact Version (for sidebars)</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <SubscriptionForm compact />
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">📋 Integration Code:</h4>
                    <pre className="text-sm text-blue-800 bg-white p-3 rounded overflow-x-auto">
{`import SubscriptionForm from '@/app/components/SubscriptionForm';

// Full form
<SubscriptionForm />

// Compact form
<SubscriptionForm compact className="my-4" />`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(activeDemo === 'dashboard' || activeDemo === 'both') && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Scheduler Dashboard Demo</h2>
              <p className="text-gray-600 mb-6">
                Monitor scheduled jobs, email campaigns, and subscriber activity in real-time. You can manually trigger the scheduler for testing.
              </p>
            </div>
            
            <SchedulerDashboard />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 Quick Start Instructions</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">1. Configure SendGrid Email Service</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">Set up SendGrid configuration:</p>
                <div className="space-y-2">
                  <code className="bg-gray-800 text-green-400 px-2 py-1 rounded text-xs block">
                    cp .env.example .env.local
                  </code>
                  <p className="text-sm text-gray-700">
                    Configure in .env.local:
                  </p>
                  <code className="bg-gray-800 text-green-400 px-2 py-1 rounded text-xs block whitespace-pre">
{`EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_api_key_here
EMAIL_FROM=your_verified_sender@domain.com`}
                  </code>
                  <div className="mt-2">
                    <a 
                      href="https://app.sendgrid.com/settings/api_keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                    >
                      → Get SendGrid API Key
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">2. Test the System</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Create a scheduled blog post in BlogManager</li>
                  <li>• Subscribe with your email using the form above</li>
                  <li>• Check your email for verification</li>
                  <li>• Trigger the scheduler manually in the dashboard</li>
                  <li>• Monitor job execution and email delivery</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">✅ Production Checklist:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-green-800">
              <div>
                <div>• Create SendGrid account (free tier available)</div>
                <div>• Generate and configure SendGrid API key</div>
                <div>• Verify sender identity in SendGrid dashboard</div>
                <div>• Set up cron job for scheduler</div>
                <div>• Test email deliverability and spam scores</div>
              </div>
              <div>
                <div>• Configure domain authentication (optional)</div>
                <div>• Add subscription forms to your pages</div>
                <div>• Set up monitoring dashboard</div>
                <div>• Test scheduled post workflow end-to-end</div>
                <div>• Monitor SendGrid analytics and error logs</div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-white rounded border border-green-300">
              <p className="text-green-700 text-xs">
                <strong>SendGrid Free Tier:</strong> Perfect for getting started with 100 emails/day. 
                Upgrade to paid plans for higher volumes and advanced features like dedicated IPs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
