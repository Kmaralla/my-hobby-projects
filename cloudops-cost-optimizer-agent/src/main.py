"""
CloudOps Cost Optimizer Agent - Main Entry Point

This is the main entry point for the CloudOps Cost Optimizer Agent.
It handles command-line arguments, logging setup, and orchestrates the agent execution.
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime
import argparse

# Add src directory to path if needed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent_core import CloudOpsAgent


def setup_logging(log_level: str = 'INFO', log_file: str = None):
    """
    Setup logging configuration.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional log file path
    """
    # Create logs directory if it doesn't exist
    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
    
    # Configure logging format
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # Setup handlers
    handlers = [logging.StreamHandler(sys.stdout)]
    if log_file:
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=log_format,
        datefmt=date_format,
        handlers=handlers
    )
    
    # Reduce noise from boto3/urllib3
    logging.getLogger('boto3').setLevel(logging.WARNING)
    logging.getLogger('botocore').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='CloudOps Cost Optimizer Agent - Autonomous AWS cost optimization'
    )
    
    parser.add_argument(
        '--config',
        type=str,
        default='config/agent_config.yaml',
        help='Path to configuration file (default: config/agent_config.yaml)'
    )
    
    parser.add_argument(
        '--continuous',
        action='store_true',
        help='Run continuously at scheduled intervals'
    )
    
    parser.add_argument(
        '--interval',
        type=int,
        help='Hours between runs in continuous mode (overrides config)'
    )
    
    parser.add_argument(
        '--log-level',
        type=str,
        default='INFO',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help='Logging level (default: INFO)'
    )
    
    parser.add_argument(
        '--log-file',
        type=str,
        help='Log file path (default: logs/agent.log)'
    )
    
    parser.add_argument(
        '--status',
        action='store_true',
        help='Display agent status and exit'
    )
    
    return parser.parse_args()


def main():
    """Main entry point for the CloudOps Agent."""
    
    # Parse arguments
    args = parse_arguments()
    
    # Determine config path (support both relative and absolute paths)
    if os.path.isabs(args.config):
        config_path = args.config
    else:
        # Try relative to current directory first, then relative to project root
        if os.path.exists(args.config):
            config_path = args.config
        else:
            # Try relative to script location
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(script_dir)
            config_path = os.path.join(project_root, args.config)
    
    # Setup logging
    log_file = args.log_file
    if not log_file:
        # Default log file
        if os.path.exists('logs'):
            log_file = 'logs/agent.log'
        else:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(script_dir)
            log_file = os.path.join(project_root, 'logs', 'agent.log')
    
    setup_logging(log_level=args.log_level, log_file=log_file)
    logger = logging.getLogger(__name__)
    
    # Print banner
    print("\n" + "=" * 80)
    print("  CloudOps Cost Optimizer Agent")
    print("  Autonomous AWS Resource Monitoring and Cost Optimization")
    print("=" * 80 + "\n")
    
    try:
        # Initialize agent
        logger.info(f"Initializing agent with config: {config_path}")
        agent = CloudOpsAgent(config_path)
        
        # Handle status request
        if args.status:
            status = agent.get_status()
            print("\nAgent Status:")
            print("-" * 80)
            for key, value in status.items():
                print(f"  {key}: {value}")
            print("-" * 80 + "\n")
            return 0
        
        # Run agent
        if args.continuous:
            logger.info("Starting in continuous mode...")
            agent.run_continuous(interval_hours=args.interval)
        else:
            logger.info("Starting single run...")
            results = agent.run()
            
            # Print summary
            print("\n" + "=" * 80)
            print("EXECUTION SUMMARY")
            print("=" * 80)
            print(f"Status: {results['status']}")
            print(f"Recommendations: {results.get('recommendations_count', 0)}")
            print(f"Estimated Savings: ${results.get('estimated_total_savings', 0):.2f}/month")
            print(f"Duration: {(datetime.fromisoformat(results['end_time']) - datetime.fromisoformat(results['start_time'])).total_seconds():.2f}s")
            print("=" * 80 + "\n")
        
        return 0
        
    except FileNotFoundError as e:
        logger.error(f"Configuration file not found: {config_path}")
        logger.error("Please ensure the config file exists or specify a valid path with --config")
        return 1
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")
        return 0
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())

