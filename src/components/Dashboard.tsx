'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LinkCreator from './LinkCreator';
import AnalyticsPanel from './AnalyticsPanel';
import ClickHistory from './ClickHistory';

interface Link {
  id: string;
  name: string;
  original_url: string;
  short_code: string;
  created_at: string;
  click_count: number;
}

interface GlobalAnalytics {
  totalLinks: number;
  totalClicks: number;
  recentClicks: any[];
  topLinks: any[];
}

export default function Dashboard() {
  const [links, setLinks] = useState<Link[]>([]);
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/links');
      const result = await response.json();
      
      if (result.success) {
        setLinks(result.data);
      } else {
        setError('Failed to fetch links');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching links:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();
      
      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError('Failed to fetch analytics');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching analytics:', err);
    }
  };

  const handleLinkCreated = (newLink: Link) => {
    setLinks(prev => [newLink, ...prev]);
    fetchAnalytics(); // Refresh global analytics
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link? All associated tracking data will be lost.')) {
      return;
    }

    try {
      const response = await fetch(`/api/links?id=${linkId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLinks(prev => prev.filter(link => link.id !== linkId));
        if (selectedLink?.id === linkId) {
          setSelectedLink(null);
        }
        fetchAnalytics(); // Refresh global analytics
      } else {
        setError('Failed to delete link');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error deleting link:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const getTrackingUrl = (shortCode: string) => {
    return `${window.location.origin}/track/${shortCode}`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLinks(), fetchAnalytics()]);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Link Tracker Dashboard
          </h1>
          <p className="text-gray-600">
            Create tracking links and monitor visitor locations in real-time
          </p>
        </div>

        {/* Global Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Links</CardTitle>
                <span className="text-2xl">🔗</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalLinks}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                <span className="text-2xl">👆</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalClicks}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Links</CardTitle>
                <span className="text-2xl">✅</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{links.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Clicks/Link</CardTitle>
                <span className="text-2xl">📊</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {links.length > 0 ? Math.round(analytics.totalClicks / links.length) : 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Link Creation & Management */}
          <div className="lg:col-span-1 space-y-6">
            <LinkCreator onLinkCreated={handleLinkCreated} />
            
            {/* Links List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Links ({links.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {links.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No links created yet. Create your first tracking link above!
                  </p>
                ) : (
                  links.map(link => (
                    <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 truncate">{link.name}</h3>
                        <Badge variant="secondary">{link.click_count} clicks</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 truncate">
                        → {link.original_url}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={getTrackingUrl(link.short_code)}
                          readOnly
                          className="flex-1 px-2 py-1 text-sm bg-gray-100 border rounded"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(getTrackingUrl(link.short_code))}
                        >
                          Copy
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Created {new Date(link.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLink(link)}
                          >
                            Analytics
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analytics */}
          <div className="lg:col-span-2">
            {selectedLink ? (
              <AnalyticsPanel 
                link={selectedLink} 
                onClose={() => setSelectedLink(null)} 
              />
            ) : (
              <ClickHistory />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}