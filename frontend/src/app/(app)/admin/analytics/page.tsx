'use client';

/**
 * Analytics Dashboard - View metrics and KPIs (Admin only)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { motion } from 'framer-motion';

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [overview, setOverview] = useState<any>(null);
  const [topFeatures, setTopFeatures] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
    // TODO: Add admin check
  }, [isAuthenticated, router]);

  // Load analytics data
  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Load overview
      const overviewRes = await fetch(
        'http://localhost:8000/api/v1/analytics/metrics/overview'
      );
      const overviewData = await overviewRes.json();
      setOverview(overviewData);

      // Load top features
      const featuresRes = await fetch(
        'http://localhost:8000/api/v1/analytics/metrics/top_features?days=30&limit=10'
      );
      const featuresData = await featuresRes.json();
      setTopFeatures(featuresData.features);

      // Load conversion funnel
      const funnelRes = await fetch(
        'http://localhost:8000/api/v1/analytics/metrics/funnel?days=30'
      );
      const funnelData = await funnelRes.json();
      setFunnel(funnelData);

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-400">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 Analytics Dashboard</h1>
        <p className="text-gray-400">Vue d'ensemble des métriques et KPIs</p>
      </header>

      {/* Today's Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Aujourd'hui</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="DAU"
            value={overview.today.dau}
            change={overview.day_over_day.dau_change}
            icon="👥"
          />
          <MetricCard
            title="Signups"
            value={overview.today.signups}
            change={overview.day_over_day.signups_change}
            icon="✨"
          />
          <MetricCard
            title="Messages"
            value={overview.today.messages}
            change={overview.day_over_day.messages_change}
            icon="💬"
          />
          <MetricCard
            title="Matches"
            value={overview.today.matches}
            icon="❤️"
          />
          <MetricCard
            title="Photos"
            value={overview.today.photos}
            icon="📸"
          />
          <MetricCard
            title="Premium"
            value={overview.today.premium_conversions}
            icon="💎"
          />
          <MetricCard
            title="Scénarios"
            value={overview.today.scenarios}
            icon="🎭"
          />
        </div>
      </section>

      {/* Conversion Funnel */}
      {funnel && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Conversion Funnel (30j)</h2>
          <div className="card p-6">
            <div className="space-y-4">
              {Object.entries(funnel.funnel).map(([stepName, data]: [string, any], index) => (
                <FunnelStep
                  key={stepName}
                  name={stepName}
                  count={data.count}
                  conversionRate={data.conversion_rate}
                  isFirst={index === 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Features */}
      {topFeatures.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Features les Plus Utilisées (30j)</h2>
          <div className="card p-6">
            <div className="space-y-3">
              {topFeatures.map((feature, index) => (
                <motion.div
                  key={feature.feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-600">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-semibold">{feature.feature}</div>
                      <div className="text-xs text-gray-400">
                        {feature.unique_users} utilisateurs uniques
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-500">
                      {feature.usage_count.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">utilisations</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Week over Week Comparison */}
      <section>
        <h2 className="text-xl font-bold mb-4">Week over Week</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-6">
            <div className="text-sm text-gray-400 mb-1">DAU</div>
            <div className="text-2xl font-bold mb-2">{overview.today.dau}</div>
            <div className={`text-sm ${overview.week_over_week.dau_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {overview.week_over_week.dau_change >= 0 ? '↑' : '↓'} {Math.abs(overview.week_over_week.dau_change).toFixed(1)}%
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm text-gray-400 mb-1">Signups</div>
            <div className="text-2xl font-bold mb-2">{overview.today.signups}</div>
            <div className={`text-sm ${overview.week_over_week.signups_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {overview.week_over_week.signups_change >= 0 ? '↑' : '↓'} {Math.abs(overview.week_over_week.signups_change).toFixed(1)}%
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon: string;
}

function MetricCard({ title, value, change, icon }: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value.toLocaleString()}</div>
      {change !== undefined && (
        <div className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </motion.div>
  );
}

// Funnel Step Component
interface FunnelStepProps {
  name: string;
  count: number;
  conversionRate: number;
  isFirst: boolean;
}

function FunnelStep({ name, count, conversionRate, isFirst }: FunnelStepProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-sm text-gray-400">{count.toLocaleString()} utilisateurs</div>
        </div>
        <div className="text-right">
          {!isFirst && (
            <div className={`text-lg font-bold ${
              conversionRate >= 50 ? 'text-green-500' :
              conversionRate >= 25 ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {conversionRate.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isFirst && (
        <div className="mt-2 h-2 bg-dark-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-pink transition-all duration-500"
            style={{ width: `${conversionRate}%` }}
          />
        </div>
      )}
    </div>
  );
}
