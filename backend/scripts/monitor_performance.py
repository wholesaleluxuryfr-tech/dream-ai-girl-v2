#!/usr/bin/env python3
"""
Real-time Performance Monitoring Dashboard

Monitors:
- Database query performance
- Redis cache hit rates
- Connection pool statistics
- API response times
"""

import sys
import os
import time
from datetime import datetime
import signal

sys.path.append(os.path.join(os.path.dirname(__file__), "../../shared"))

from shared.config.database_config import get_db_stats, check_db_health
from shared.utils.cache_strategy import get_cache_stats
from shared.utils.database import get_redis_client
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Global flag for graceful shutdown
running = True


def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    global running
    logger.info("\n⏹️  Stopping monitor...")
    running = False


def format_percentage(value: float) -> str:
    """Format percentage with color coding"""
    if value >= 0.8:
        return f"🟢 {value * 100:.1f}%"
    elif value >= 0.5:
        return f"🟡 {value * 100:.1f}%"
    else:
        return f"🔴 {value * 100:.1f}%"


def print_header():
    """Print dashboard header"""
    print("\n" + "=" * 100)
    print("🔍 Dream AI Girl - Performance Monitoring Dashboard")
    print("=" * 100)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Press Ctrl+C to stop")
    print("=" * 100 + "\n")


def print_database_stats():
    """Print database connection pool statistics"""
    try:
        stats = get_db_stats()
        healthy = check_db_health()

        print("📊 DATABASE CONNECTION POOL")
        print("-" * 50)
        print(f"  Status:          {'🟢 Healthy' if healthy else '🔴 Down'}")
        print(f"  Pool Size:       {stats['pool_size']}")
        print(f"  Checked In:      {stats['checked_in']} (idle)")
        print(f"  Checked Out:     {stats['checked_out']} (active)")
        print(f"  Overflow:        {stats['overflow']} (extra connections)")
        print(f"  Total Connections: {stats['total_connections']}")

        # Warnings
        utilization = stats['checked_out'] / stats['pool_size'] if stats['pool_size'] > 0 else 0
        if utilization > 0.8:
            print(f"  ⚠️  WARNING: High pool utilization ({utilization * 100:.1f}%)")
        if stats['overflow'] > 5:
            print(f"  ⚠️  WARNING: High overflow ({stats['overflow']} connections)")

        print()

    except Exception as e:
        print(f"❌ Database stats error: {e}\n")


def print_cache_stats():
    """Print Redis cache statistics"""
    try:
        stats = get_cache_stats()

        print("💾 REDIS CACHE")
        print("-" * 50)
        print(f"  Total Keys:      {stats['total_keys']:,}")
        print(f"  Hit Rate:        {format_percentage(stats['hit_rate'])}")
        print(f"  Memory Used:     {stats['used_memory_human']}")
        print(f"  Connected Clients: {stats['connected_clients']}")

        # Warnings
        if stats['hit_rate'] < 0.5:
            print(f"  ⚠️  WARNING: Low cache hit rate - consider increasing TTLs or warming more data")
        if stats['total_keys'] > 100000:
            print(f"  ⚠️  WARNING: High key count - consider cleanup of stale keys")

        print()

    except Exception as e:
        print(f"❌ Cache stats error: {e}\n")


def print_redis_key_distribution():
    """Print breakdown of Redis keys by pattern"""
    try:
        redis = get_redis_client()

        patterns = {
            'User Sessions': 'user:session:*',
            'Conversations': 'chat:history:*',
            'Matches': 'match:*',
            'Photos': 'photos:*',
            'Affection': 'affection:*',
            'Rate Limits': 'ratelimit:*',
            'Girl Profiles': 'girl:*',
        }

        print("🔑 CACHE KEY DISTRIBUTION")
        print("-" * 50)

        for label, pattern in patterns.items():
            count = len(redis.keys(pattern))
            print(f"  {label:.<30} {count:>6,}")

        print()

    except Exception as e:
        print(f"❌ Key distribution error: {e}\n")


def print_performance_metrics():
    """Print estimated performance metrics"""
    try:
        redis = get_redis_client()

        # Sample query times from monitoring (if available)
        print("⚡ PERFORMANCE METRICS")
        print("-" * 50)

        # Check if we have performance data in Redis
        metrics = {
            'API Gateway Response': redis.get('perf:api_gateway_avg'),
            'Chat Message Send': redis.get('perf:chat_send_avg'),
            'Photo Generation': redis.get('perf:photo_gen_avg'),
            'AI Response': redis.get('perf:ai_response_avg'),
        }

        if any(metrics.values()):
            for label, value in metrics.items():
                if value:
                    time_ms = float(value)
                    status = "🟢" if time_ms < 200 else "🟡" if time_ms < 500 else "🔴"
                    print(f"  {label:.<30} {status} {time_ms:.0f}ms")
        else:
            print("  ⏳ No performance data available yet")
            print("  Performance metrics will appear after API usage")

        print()

    except Exception as e:
        print(f"❌ Performance metrics error: {e}\n")


def print_slow_queries():
    """Print recent slow queries (if logged)"""
    try:
        redis = get_redis_client()

        # Get slow queries from Redis list (if AI service logs them)
        slow_queries = redis.lrange('slow_queries', 0, 4)

        if slow_queries:
            print("🐢 RECENT SLOW QUERIES (>200ms)")
            print("-" * 50)

            for i, query_json in enumerate(slow_queries, 1):
                import json
                query_data = json.loads(query_json)
                print(f"  {i}. {query_data['time']:.3f}s - {query_data['query'][:80]}...")

            print()
        else:
            print("✅ No slow queries detected\n")

    except Exception as e:
        print(f"❌ Slow queries error: {e}\n")


def monitor_loop(interval: int = 5):
    """Main monitoring loop"""
    print_header()

    iteration = 0

    while running:
        try:
            # Clear screen (optional - comment out if you prefer scrolling)
            if iteration > 0:
                os.system('clear' if os.name == 'posix' else 'cls')
                print_header()

            # Print all stats
            print_database_stats()
            print_cache_stats()
            print_redis_key_distribution()
            print_performance_metrics()
            print_slow_queries()

            # Footer
            print("=" * 100)
            print(f"Last updated: {datetime.now().strftime('%H:%M:%S')} | Refreshing every {interval}s | Iteration #{iteration + 1}")
            print("=" * 100)

            iteration += 1

            # Wait for next iteration
            time.sleep(interval)

        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error(f"Monitor error: {e}")
            time.sleep(interval)

    print("\n👋 Monitoring stopped.")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Monitor Dream AI Girl performance metrics')
    parser.add_argument('--interval', type=int, default=5, help='Refresh interval in seconds (default: 5)')
    parser.add_argument('--once', action='store_true', help='Run once and exit (no loop)')

    args = parser.parse_args()

    # Setup signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    if args.once:
        # Single run mode
        print_header()
        print_database_stats()
        print_cache_stats()
        print_redis_key_distribution()
        print_performance_metrics()
        print_slow_queries()
    else:
        # Continuous monitoring
        monitor_loop(interval=args.interval)


if __name__ == "__main__":
    main()
