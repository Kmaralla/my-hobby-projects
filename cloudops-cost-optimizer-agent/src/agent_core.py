"""
CloudOps Agent Core Module

This module contains the main CloudOpsAgent class that orchestrates the entire
cost optimization workflow. It coordinates between AWS data collection,
optimization analysis, and notification delivery.
"""

import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime
import yaml

from aws_integration import AWSResourceMonitor
from optimizer import CostOptimizer, OptimizationRecommendation
from notification import Notifier

logger = logging.getLogger(__name__)


class CloudOpsAgent:
    """
    CloudOps Cost Optimizer Agent
    
    Autonomous agent that monitors AWS resources, analyzes costs,
    generates optimization recommendations, and sends notifications.
    """
    
    def __init__(self, config_path: str):
        """
        Initialize the CloudOps Agent.
        
        Args:
            config_path: Path to agent configuration file
        """
        self.config_path = config_path
        self.config = self._load_config()
        self.start_time = datetime.now()
        
        # Initialize components
        self.aws_monitor = self._initialize_aws_monitor()
        self.optimizer = self._initialize_optimizer()
        self.notifier = self._initialize_notifier()
        
        logger.info("CloudOps Agent initialized successfully")
    
    def _load_config(self) -> Dict[str, Any]:
        """Load agent configuration from YAML file."""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
            logger.info(f"Configuration loaded from {self.config_path}")
            return config
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {self.config_path}")
            raise
        except yaml.YAMLError as e:
            logger.error(f"Error parsing configuration file: {e}")
            raise
    
    def _initialize_aws_monitor(self) -> AWSResourceMonitor:
        """Initialize AWS Resource Monitor."""
        aws_config = self.config.get('aws', {})
        region = aws_config.get('region', 'us-east-1')
        profile = aws_config.get('profile')
        
        return AWSResourceMonitor(region=region, profile=profile)
    
    def _initialize_optimizer(self) -> CostOptimizer:
        """Initialize Cost Optimizer."""
        return CostOptimizer(self.config)
    
    def _initialize_notifier(self) -> Notifier:
        """Initialize Notifier."""
        return Notifier(self.config)
    
    def run(self) -> Dict[str, Any]:
        """
        Execute the main agent workflow.
        
        Workflow:
        1. Fetch AWS resource and cost data
        2. Analyze data and generate optimization recommendations
        3. Execute optimizations (if auto-execute enabled)
        4. Send notifications with results
        
        Returns:
            Results dictionary with execution details
        """
        logger.info("=" * 80)
        logger.info("Starting CloudOps Cost Optimizer Agent")
        logger.info("=" * 80)
        
        results = {
            'start_time': self.start_time.isoformat(),
            'status': 'running'
        }
        
        try:
            # Step 1: Fetch AWS data
            logger.info("\n[STEP 1] Fetching AWS resource and cost data...")
            aws_data = self.aws_monitor.fetch_data()
            results['aws_data'] = {
                'ec2_instances_count': len(aws_data.get('ec2_instances', [])),
                'ebs_volumes_count': len(aws_data.get('ebs_volumes', [])),
                'total_cost': aws_data.get('cost_data', {}).get('total_cost', 0),
                'fetch_timestamp': aws_data.get('fetch_timestamp')
            }
            logger.info(f"✓ Fetched data for {results['aws_data']['ec2_instances_count']} EC2 instances, "
                       f"{results['aws_data']['ebs_volumes_count']} EBS volumes")
            logger.info(f"✓ Total cost (30 days): ${results['aws_data']['total_cost']:.2f}")
            
            # Step 2: Analyze and generate recommendations
            logger.info("\n[STEP 2] Analyzing resources and generating recommendations...")
            recommendations = self.optimizer.analyze(aws_data)
            results['recommendations_count'] = len(recommendations)
            results['recommendations'] = [rec.to_dict() for rec in recommendations]
            
            total_savings = sum(rec.estimated_savings for rec in recommendations)
            results['estimated_total_savings'] = total_savings
            logger.info(f"✓ Generated {len(recommendations)} optimization recommendations")
            logger.info(f"✓ Estimated total monthly savings: ${total_savings:.2f}")
            
            # Generate report
            report = self.optimizer.generate_report(recommendations)
            results['report'] = report
            
            # Print report to console
            print("\n" + report + "\n")
            
            # Step 3: Execute optimizations (if enabled)
            logger.info("\n[STEP 3] Checking optimization execution...")
            auto_execute = self.config.get('optimization', {}).get('auto_execute', False)
            execution_results = self.optimizer.execute_optimizations(
                recommendations, 
                auto_execute=auto_execute
            )
            results['execution'] = execution_results
            
            if auto_execute:
                logger.info(f"✓ Auto-execute enabled. Executed {execution_results.get('executed_count', 0)} optimizations")
            else:
                logger.info("ℹ Auto-execute disabled. Recommendations are for review only.")
            
            # Step 4: Send notifications
            logger.info("\n[STEP 4] Sending notifications...")
            notification_result = self.notifier.send_optimization_report(
                report=report,
                recommendations_count=len(recommendations),
                total_savings=total_savings
            )
            results['notification'] = notification_result
            logger.info("✓ Notifications sent")
            
            # Complete
            results['status'] = 'completed'
            results['end_time'] = datetime.now().isoformat()
            
            duration = (datetime.now() - self.start_time).total_seconds()
            logger.info("\n" + "=" * 80)
            logger.info(f"CloudOps Agent execution completed in {duration:.2f} seconds")
            logger.info("=" * 80)
            
            return results
            
        except Exception as e:
            logger.error(f"Error during agent execution: {e}", exc_info=True)
            results['status'] = 'failed'
            results['error'] = str(e)
            results['end_time'] = datetime.now().isoformat()
            
            # Try to send error notification
            try:
                self.notifier.send_alert(
                    alert_type="Agent Execution Failed",
                    details=f"Error: {str(e)}"
                )
            except Exception as notify_error:
                logger.error(f"Failed to send error notification: {notify_error}")
            
            raise
    
    def run_continuous(self, interval_hours: Optional[int] = None):
        """
        Run agent continuously at specified intervals.
        
        Args:
            interval_hours: Hours between runs (uses config if not specified)
        """
        import time
        
        if interval_hours is None:
            interval_hours = self.config.get('monitoring', {}).get('check_frequency_hours', 24)
        
        logger.info(f"Starting continuous monitoring (interval: {interval_hours} hours)")
        
        while True:
            try:
                self.run()
            except Exception as e:
                logger.error(f"Error in continuous run: {e}")
            
            logger.info(f"Sleeping for {interval_hours} hours until next run...")
            time.sleep(interval_hours * 3600)
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current agent status.
        
        Returns:
            Status dictionary
        """
        return {
            'agent_name': 'CloudOps Cost Optimizer Agent',
            'start_time': self.start_time.isoformat(),
            'uptime_seconds': (datetime.now() - self.start_time).total_seconds(),
            'config_path': self.config_path,
            'aws_region': self.config.get('aws', {}).get('region'),
            'optimization_enabled': self.config.get('optimization', {}).get('enabled'),
            'auto_execute': self.config.get('optimization', {}).get('auto_execute'),
            'notification_channels': self.config.get('notifications', {}).get('channels', [])
        }

