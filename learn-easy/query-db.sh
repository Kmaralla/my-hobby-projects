#!/bin/bash
# Quick database query script

echo "=== Connecting to PostgreSQL in Docker ==="
echo ""
echo "Useful commands:"
echo "  \dt              - List all tables"
echo "  \d table_name    - Describe a table structure"
echo "  SELECT * FROM users;  - Query users table"
echo "  SELECT * FROM topics; - Query topics table"
echo ""
echo "To connect, run:"
echo "  docker compose exec postgres psql -U postgres -d learn_easy"
echo ""
echo "Or use this script to run queries:"
echo "  docker compose exec postgres psql -U postgres -d learn_easy -c 'SELECT * FROM users;'"
