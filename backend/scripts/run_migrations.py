#!/usr/bin/env python3
"""
Database Migration Runner

Executes SQL migrations in order to optimize database performance
"""

import sys
import os
from pathlib import Path

# Add shared to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../shared"))

from sqlalchemy import text
from shared.config.database_config import get_db_context, check_db_health
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent.parent / "shared" / "migrations"


def run_migration(db, migration_file: Path):
    """Execute a single migration file"""
    logger.info(f"📝 Running migration: {migration_file.name}")

    try:
        with open(migration_file, 'r') as f:
            sql = f.read()

        # Split into individual statements (separated by semicolon)
        statements = [stmt.strip() for stmt in sql.split(';') if stmt.strip() and not stmt.strip().startswith('--')]

        for i, statement in enumerate(statements, 1):
            # Skip comments
            if statement.startswith('COMMENT'):
                db.execute(text(statement))
                continue

            # Execute statement
            logger.info(f"  Executing statement {i}/{len(statements)}...")
            db.execute(text(statement))

        db.commit()
        logger.info(f"✅ Migration {migration_file.name} completed successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Migration {migration_file.name} failed: {e}")
        db.rollback()
        return False


def get_migration_files():
    """Get all migration files sorted by name"""
    if not MIGRATIONS_DIR.exists():
        logger.error(f"❌ Migrations directory not found: {MIGRATIONS_DIR}")
        return []

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    return migration_files


def main():
    """Main migration runner"""
    logger.info("=" * 80)
    logger.info("🚀 Starting Database Migration Runner")
    logger.info("=" * 80)

    # Check database health
    if not check_db_health():
        logger.error("❌ Database is not healthy. Cannot run migrations.")
        sys.exit(1)

    logger.info("✅ Database connection healthy")

    # Get migration files
    migration_files = get_migration_files()

    if not migration_files:
        logger.warning("⚠️  No migration files found")
        sys.exit(0)

    logger.info(f"📋 Found {len(migration_files)} migration(s) to run:")
    for mf in migration_files:
        logger.info(f"  - {mf.name}")

    # Run migrations
    with get_db_context() as db:
        success_count = 0
        failed_count = 0

        for migration_file in migration_files:
            if run_migration(db, migration_file):
                success_count += 1
            else:
                failed_count += 1
                logger.error(f"❌ Stopping migrations due to failure")
                break

    # Summary
    logger.info("=" * 80)
    logger.info("📊 Migration Summary:")
    logger.info(f"  ✅ Successful: {success_count}")
    logger.info(f"  ❌ Failed: {failed_count}")

    if failed_count == 0:
        logger.info("🎉 All migrations completed successfully!")
        logger.info("=" * 80)
        logger.info("📈 Next steps:")
        logger.info("  1. Restart all services to use optimized connection pools")
        logger.info("  2. Monitor query performance with: python scripts/monitor_performance.py")
        logger.info("  3. Run EXPLAIN ANALYZE on slow queries to verify index usage")
        sys.exit(0)
    else:
        logger.error("💥 Migrations failed. Please fix errors and try again.")
        sys.exit(1)


if __name__ == "__main__":
    main()
