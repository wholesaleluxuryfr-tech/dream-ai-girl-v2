/**
 * Analytics Client - Track user events and behavior
 *
 * Lightweight analytics tracking for Dream AI Girl
 */

import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class AnalyticsClient {
  private sessionId: string;
  private userId: number | null = null;
  private queue: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Get or create session ID
    if (typeof window !== 'undefined') {
      this.sessionId = this.getOrCreateSessionId();
      this.startFlushInterval();
    } else {
      this.sessionId = uuidv4();
    }
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSessionId(): string {
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) {
      return stored;
    }

    const newId = uuidv4();
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
  }

  /**
   * Set current user ID
   */
  setUserId(userId: number | null) {
    this.userId = userId;
  }

  /**
   * Track a custom event
   */
  track(eventName: string, category: string, properties?: Record<string, any>) {
    const event = {
      event_name: eventName,
      category,
      user_id: this.userId,
      session_id: this.sessionId,
      properties: properties || {},
      timestamp: new Date().toISOString()
    };

    this.queue.push(event);

    // Flush immediately for critical events
    if (this.isCriticalEvent(eventName)) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  pageView(page_url: string, referrer?: string) {
    this.sendEvent('/analytics/track/page_view', {
      user_id: this.userId,
      session_id: this.sessionId,
      page_url,
      referrer: referrer || document.referrer
    });
  }

  /**
   * Track user signup
   */
  trackSignup(userId: number, signupMethod: string = 'email') {
    this.userId = userId;
    this.sendEvent('/analytics/track/signup', {
      user_id: userId,
      session_id: this.sessionId,
      signup_method: signupMethod
    });
  }

  /**
   * Track match creation
   */
  trackMatch(userId: number, girlId: string) {
    this.sendEvent('/analytics/track/match', {
      user_id: userId,
      girl_id: girlId,
      session_id: this.sessionId
    });
  }

  /**
   * Track message sent
   */
  trackMessage(userId: number, girlId: string, messageLength: number) {
    this.sendEvent('/analytics/track/message', {
      user_id: userId,
      girl_id: girlId,
      message_length: messageLength,
      session_id: this.sessionId
    });
  }

  /**
   * Track scenario start
   */
  trackScenario(userId: number, scenarioId: number, girlId: string) {
    this.track('scenario_started', 'scenario', {
      scenario_id: scenarioId,
      girl_id: girlId
    });
  }

  /**
   * Track premium conversion
   */
  trackPremiumConversion(userId: number, tier: string, price: number) {
    this.track('premium_converted', 'payment', {
      tier,
      price
    });
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName: string, properties?: Record<string, any>) {
    this.track(`feature_${featureName}`, 'feature', properties);
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error_occurred', 'error', {
      error_message: error.message,
      error_stack: error.stack,
      ...context
    });
  }

  /**
   * Flush queued events
   */
  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // Send all queued events
      for (const event of events) {
        await this.sendEvent('/analytics/track', event);
      }
    } catch (error) {
      console.error('Analytics flush error:', error);
      // Put events back in queue
      this.queue.unshift(...events);
    }
  }

  /**
   * Send event to server
   */
  private async sendEvent(endpoint: string, data: any) {
    if (typeof window === 'undefined') return;

    try {
      await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  /**
   * Check if event is critical (should flush immediately)
   */
  private isCriticalEvent(eventName: string): boolean {
    const criticalEvents = [
      'signup_completed',
      'premium_converted',
      'payment_completed',
      'error_occurred'
    ];
    return criticalEvents.includes(eventName);
  }

  /**
   * Start automatic flush interval
   */
  private startFlushInterval() {
    // Flush queue every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Stop flush interval
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

// Singleton instance
const analytics = new AnalyticsClient();

export default analytics;

// Named exports for convenience
export const {
  track,
  pageView,
  trackSignup,
  trackMatch,
  trackMessage,
  trackScenario,
  trackPremiumConversion,
  trackFeature,
  trackError,
  setUserId
} = analytics;
