#!/bin/bash

################################################################################
# CloudOps Cost Optimizer Agent - Demo Run Script
# 
# This script demonstrates running the CloudOps agent in various modes.
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}CloudOps Cost Optimizer Agent${NC}"
echo -e "${BLUE}Demo Run Script${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python found: $(python3 --version)${NC}"

# Check if we're in a virtual environment (optional but recommended)
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo -e "${YELLOW}⚠ Not running in a virtual environment${NC}"
    echo -e "${YELLOW}  Consider creating one with: python3 -m venv venv && source venv/bin/activate${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"
echo -e "${GREEN}✓ Logs directory ready${NC}"

# Check if requirements are installed
echo ""
echo -e "${BLUE}Checking dependencies...${NC}"
if python3 -c "import boto3, yaml, pydantic" 2>/dev/null; then
    echo -e "${GREEN}✓ Core dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Some dependencies missing${NC}"
    echo -e "${YELLOW}  Install with: pip install -r requirements.txt${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if config file exists
CONFIG_FILE="$PROJECT_ROOT/config/agent_config.yaml"
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}Error: Configuration file not found at $CONFIG_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Configuration file found${NC}"

echo ""
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}Running CloudOps Agent Demo${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Display menu
echo "Select demo mode:"
echo "  1) Single run (default)"
echo "  2) Show agent status"
echo "  3) Single run with DEBUG logging"
echo "  4) Run tests"
echo ""
read -p "Enter choice [1-4]: " choice

cd "$PROJECT_ROOT"

case $choice in
    2)
        echo ""
        echo -e "${BLUE}Showing agent status...${NC}"
        python3 src/main.py --config config/agent_config.yaml --status
        ;;
    3)
        echo ""
        echo -e "${BLUE}Running with DEBUG logging...${NC}"
        python3 src/main.py --config config/agent_config.yaml --log-level DEBUG
        ;;
    4)
        echo ""
        echo -e "${BLUE}Running tests...${NC}"
        if command -v pytest &> /dev/null; then
            pytest tests/ -v
        else
            python3 -m unittest discover -s tests -p "test_*.py" -v
        fi
        ;;
    *)
        echo ""
        echo -e "${BLUE}Running single agent execution...${NC}"
        python3 src/main.py --config config/agent_config.yaml
        ;;
esac

echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}Demo completed successfully!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo "Next steps:"
echo "  • Check logs in: $PROJECT_ROOT/logs/agent.log"
echo "  • Review configuration: $CONFIG_FILE"
echo "  • Configure AWS credentials for real data"
echo "  • Set up notification channels (email/Slack)"
echo ""

