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
              <p className="text-sm opacity-90">Automatic email notifications to subscribers with beautiful templates</p>
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
              <h3 className="font-semibold text-gray-900 mb-3">1. Configure Email Service</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">Copy the environment template:</p>
                <code className="bg-gray-800 text-green-400 px-2 py-1 rounded text-xs">
                  cp .env.example .env.local
                </code>
                <p className="text-sm text-gray-700 mt-2">
                  Then edit .env.local with your email provider settings (Gmail, SendGrid, etc.)
                </p>
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
                <div>• Configure email service credentials</div>
                <div>• Set up cron job for scheduler</div>
                <div>• Test email deliverability</div>
                <div>• Configure DNS records (SPF, DKIM)</div>
              </div>
              <div>
                <div>• Add subscription forms to your pages</div>
                <div>• Set up monitoring dashboard</div>
                <div>• Test scheduled post workflow</div>
                <div>• Monitor error logs and performance</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
