/**
 * Frontend performance monitoring and optimization utilities
 */

// ============================================================================
// WEB VITALS MONITORING
// ============================================================================

export function reportWebVitals(metric: any) {
  // Send to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, metric.value);
  }
}


// ============================================================================
// LAZY IMAGE LOADING
// ============================================================================

export function lazyLoadImage(src: string, placeholder: string = '/placeholder.jpg'): string {
  if (typeof window === 'undefined') return src;

  // Check if IntersectionObserver is supported
  if ('IntersectionObserver' in window) {
    return placeholder;
  }

  return src;
}


// ============================================================================
// REQUEST BATCHING
// ============================================================================

class RequestBatcher {
  private queue: Array<{
    url: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private timeout: NodeJS.Timeout | null = null;
  private readonly batchDelay = 50; // ms

  async add(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });

      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      this.timeout = setTimeout(() => this.flush(), this.batchDelay);
    });
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
    const urls = batch.map((item) => item.url);

    try {
      // Send batch request
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      const results = await response.json();

      // Resolve individual promises
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach((item) => {
        item.reject(error);
      });
    }
  }
}

export const requestBatcher = new RequestBatcher();


// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}


// ============================================================================
// MEMOIZATION
// ============================================================================

export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);

    return result;
  }) as T;
}


// ============================================================================
// PERFORMANCE MEASUREMENT
// ============================================================================

export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  start(label: string) {
    this.marks.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start mark found for: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measure(label: string, fn: () => void): number {
    this.start(label);
    fn();
    return this.end(label);
  }

  async measureAsync(label: string, fn: () => Promise<void>): Promise<number> {
    this.start(label);
    await fn();
    return this.end(label);
  }
}

export const perfMonitor = new PerformanceMonitor();


// ============================================================================
// IMAGE OPTIMIZATION
// ============================================================================

export function getOptimizedImageUrl(
  url: string,
  width?: number,
  quality: number = 80
): string {
  if (!url) return '';

  // If already an optimized URL, return as-is
  if (url.includes('/_next/image')) return url;

  // Build Next.js image optimization URL
  const params = new URLSearchParams();
  params.set('url', url);
  if (width) params.set('w', width.toString());
  params.set('q', quality.toString());

  return `/_next/image?${params.toString()}`;
}


// ============================================================================
// BUNDLE SIZE OPTIMIZATION
// ============================================================================

/**
 * Dynamically import component (code splitting)
 */
export async function lazyLoadComponent<T>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  const module = await importFn();
  return module.default;
}


// ============================================================================
// LOCAL STORAGE WITH COMPRESSION
// ============================================================================

export const compressedStorage = {
  setItem(key: string, value: any) {
    try {
      const jsonString = JSON.stringify(value);
      // Simple compression: only store if < 5KB uncompressed
      if (jsonString.length < 5000) {
        localStorage.setItem(key, jsonString);
      } else {
        // For larger data, consider using IndexedDB instead
        console.warn(`Data too large for localStorage: ${key}`);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  removeItem(key: string) {
    localStorage.removeItem(key);
  },
};


// ============================================================================
// PREFETCHING
// ============================================================================

export function prefetchRoute(href: string) {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

export function prefetchImage(src: string) {
  if (typeof window === 'undefined') return;

  const img = new Image();
  img.src = src;
}


// ============================================================================
// VIRTUAL SCROLLING HELPER
// ============================================================================

export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleItems + overscan * 2);

  return { start, end };
}


// ============================================================================
// NETWORK DETECTION
// ============================================================================

export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  if (typeof navigator === 'undefined' || !(navigator as any).connection) {
    return 'medium';
  }

  const connection = (navigator as any).connection;
  const effectiveType = connection.effectiveType;

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'slow';
  } else if (effectiveType === '3g') {
    return 'medium';
  } else {
    return 'fast';
  }
}

export function isSlowConnection(): boolean {
  return getConnectionSpeed() === 'slow';
}


// ============================================================================
// IDLE CALLBACK
// ============================================================================

export function runWhenIdle(callback: () => void, timeout: number = 2000) {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 100);
  }
}
