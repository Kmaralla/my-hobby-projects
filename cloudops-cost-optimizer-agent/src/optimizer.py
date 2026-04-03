"""
Cost Optimizer Module

This module contains the core optimization logic that analyzes AWS resource data
and generates actionable recommendations to reduce costs. It identifies idle
instances, unused volumes, and other cost optimization opportunities.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class OptimizationRecommendation:
    """Represents a single optimization recommendation."""
    
    def __init__(self, resource_id: str, resource_type: str, action: str, 
                 reason: str, estimated_savings: float, priority: str = 'medium'):
        self.resource_id = resource_id
        self.resource_type = resource_type
        self.action = action
        self.reason = reason
        self.estimated_savings = estimated_savings
        self.priority = priority
        self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert recommendation to dictionary."""
        return {
            'resource_id': self.resource_id,
            'resource_type': self.resource_type,
            'action': self.action,
            'reason': self.reason,
            'estimated_savings_usd': self.estimated_savings,
            'priority': self.priority,
            'timestamp': self.timestamp.isoformat()
        }
    
    def __str__(self) -> str:
        return (f"[{self.priority.upper()}] {self.action} {self.resource_type} "
                f"{self.resource_id}: {self.reason} "
                f"(Est. savings: ${self.estimated_savings:.2f}/month)")


class CostOptimizer:
    """Analyzes AWS resources and generates cost optimization recommendations."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Cost Optimizer.
        
        Args:
            config: Configuration dictionary with thresholds and actions
        """
        self.config = config
        self.optimization_config = config.get('optimization', {})
        self.monitoring_config = config.get('monitoring', {})
        self.enabled_actions = self.optimization_config.get('actions', [])
        self.cost_threshold = self.monitoring_config.get('cost_threshold_usd', 1000.0)
        self.utilization_threshold = self.monitoring_config.get('utilization_threshold_percent', 20.0)
        
        logger.info("CostOptimizer initialized")
    
    def analyze(self, aws_data: Dict[str, Any]) -> List[OptimizationRecommendation]:
        """
        Analyze AWS data and generate optimization recommendations.
        
        Args:
            aws_data: AWS resource and cost data
            
        Returns:
            List of optimization recommendations
        """
        logger.info("Starting cost optimization analysis...")
        recommendations = []
        
        # Analyze EC2 instances
        ec2_recommendations = self._analyze_ec2_instances(
            aws_data.get('ec2_instances', []),
            aws_data.get('instance_metrics', [])
        )
        recommendations.extend(ec2_recommendations)
        
        # Analyze EBS volumes
        ebs_recommendations = self._analyze_ebs_volumes(aws_data.get('ebs_volumes', []))
        recommendations.extend(ebs_recommendations)
        
        # Analyze overall costs
        cost_recommendations = self._analyze_costs(aws_data.get('cost_data', {}))
        recommendations.extend(cost_recommendations)
        
        logger.info(f"Generated {len(recommendations)} optimization recommendations")
        return recommendations
    
    def _analyze_ec2_instances(self, instances: List[Dict[str, Any]], 
                               metrics: List[Dict[str, Any]]) -> List[OptimizationRecommendation]:
        """Analyze EC2 instances for optimization opportunities."""
        recommendations = []
        
        # Create metrics lookup
        metrics_map = {m['instance_id']: m for m in metrics}
        
        for instance in instances:
            instance_id = instance['instance_id']
            instance_type = instance['instance_type']
            state = instance['state']
            
            # Check for idle instances
            if 'stop_idle_instances' in self.enabled_actions:
                if state == 'running':
                    metric = metrics_map.get(instance_id, {})
                    avg_cpu = metric.get('average', 0)
                    
                    if avg_cpu < self.utilization_threshold:
                        savings = self._estimate_instance_savings(instance_type)
                        rec = OptimizationRecommendation(
                            resource_id=instance_id,
                            resource_type='EC2 Instance',
                            action='stop',
                            reason=f'Low CPU utilization ({avg_cpu:.1f}% avg over 7 days)',
                            estimated_savings=savings,
                            priority='high' if avg_cpu < 5 else 'medium'
                        )
                        recommendations.append(rec)
            
            # Check for stopped instances running too long
            if state == 'stopped':
                launch_time = instance.get('launch_time')
                if launch_time and isinstance(launch_time, datetime):
                    days_stopped = (datetime.now() - launch_time).days
                    if days_stopped > 30:
                        rec = OptimizationRecommendation(
                            resource_id=instance_id,
                            resource_type='EC2 Instance',
                            action='terminate',
                            reason=f'Instance stopped for {days_stopped} days',
                            estimated_savings=0,  # Already stopped
                            priority='low'
                        )
                        recommendations.append(rec)
            
            # Check for oversized instances
            if 'resize_underutilized' in self.enabled_actions and state == 'running':
                metric = metrics_map.get(instance_id, {})
                avg_cpu = metric.get('average', 0)
                
                if avg_cpu < 30 and avg_cpu > 0 and instance_type.startswith('m5'):
                    savings = self._estimate_instance_savings(instance_type) * 0.5
                    rec = OptimizationRecommendation(
                        resource_id=instance_id,
                        resource_type='EC2 Instance',
                        action='resize',
                        reason=f'Underutilized {instance_type} (CPU: {avg_cpu:.1f}%), consider smaller type',
                        estimated_savings=savings,
                        priority='medium'
                    )
                    recommendations.append(rec)
        
        return recommendations
    
    def _analyze_ebs_volumes(self, volumes: List[Dict[str, Any]]) -> List[OptimizationRecommendation]:
        """Analyze EBS volumes for optimization opportunities."""
        recommendations = []
        
        if 'delete_unused_volumes' not in self.enabled_actions:
            return recommendations
        
        for volume in volumes:
            volume_id = volume['volume_id']
            state = volume['state']
            size = volume['size']
            attachments = volume.get('attachments', [])
            
            # Check for unattached volumes
            if state == 'available' and not attachments:
                savings = size * 0.10  # Approximate: $0.10 per GB/month for gp3
                rec = OptimizationRecommendation(
                    resource_id=volume_id,
                    resource_type='EBS Volume',
                    action='delete',
                    reason=f'Unattached {size}GB volume',
                    estimated_savings=savings,
                    priority='medium'
                )
                recommendations.append(rec)
        
        return recommendations
    
    def _analyze_costs(self, cost_data: Dict[str, Any]) -> List[OptimizationRecommendation]:
        """Analyze overall costs and generate recommendations."""
        recommendations = []
        
        total_cost = cost_data.get('total_cost', 0)
        period_days = cost_data.get('period_days', 30)
        
        # Project monthly cost
        monthly_cost = (total_cost / period_days) * 30
        
        if monthly_cost > self.cost_threshold:
            rec = OptimizationRecommendation(
                resource_id='account-wide',
                resource_type='Cost Alert',
                action='review',
                reason=f'Monthly costs (${monthly_cost:.2f}) exceed threshold (${self.cost_threshold:.2f})',
                estimated_savings=0,
                priority='high'
            )
            recommendations.append(rec)
        
        return recommendations
    
    def _estimate_instance_savings(self, instance_type: str) -> float:
        """
        Estimate monthly savings for stopping an instance.
        
        Args:
            instance_type: EC2 instance type
            
        Returns:
            Estimated monthly savings in USD
        """
        # These are rough estimates based on us-east-1 pricing as of 2024
        # Actual prices vary by region and change over time
        pricing_map = {
            't3.micro': 7.5,
            't3.small': 15.0,
            't3.medium': 30.0,
            't3.large': 60.0,
            't3.xlarge': 120.0,
            'm5.large': 70.0,
            'm5.xlarge': 140.0,
            'm5.2xlarge': 280.0,
            'c5.large': 62.0,
            'c5.xlarge': 124.0,
        }
        
        # Default estimate for unknown instance types
        return pricing_map.get(instance_type, 50.0)
    
    def execute_optimizations(self, recommendations: List[OptimizationRecommendation],
                             auto_execute: bool = False) -> Dict[str, Any]:
        """
        Execute optimization recommendations.
        
        Args:
            recommendations: List of recommendations to execute
            auto_execute: Whether to automatically execute (from config)
            
        Returns:
            Execution results dictionary
        """
        if not auto_execute:
            logger.info("Auto-execute is disabled. Recommendations will only be reported.")
            return {
                'executed': False,
                'reason': 'auto_execute is disabled',
                'recommendations_count': len(recommendations)
            }
        
        logger.warning("Auto-execute is enabled. This would execute optimizations.")
        logger.warning("For safety, actual execution is not implemented in this starter code.")
        
        # In production, this would call AWS APIs to execute actions
        # For now, we just log what would be done
        executed = []
        for rec in recommendations:
            if rec.priority == 'high':
                logger.info(f"Would execute: {rec}")
                executed.append(rec.resource_id)
        
        return {
            'executed': True,
            'executed_count': len(executed),
            'executed_resources': executed,
            'total_recommendations': len(recommendations)
        }
    
    def generate_report(self, recommendations: List[OptimizationRecommendation]) -> str:
        """
        Generate a human-readable optimization report.
        
        Args:
            recommendations: List of optimization recommendations
            
        Returns:
            Formatted report string
        """
        if not recommendations:
            return "✅ No optimization recommendations at this time. Resources are well-optimized!"
        
        # Sort by priority and estimated savings
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        sorted_recs = sorted(
            recommendations,
            key=lambda r: (priority_order.get(r.priority, 3), -r.estimated_savings)
        )
        
        total_savings = sum(r.estimated_savings for r in recommendations)
        
        report_lines = [
            "=" * 80,
            "AWS COST OPTIMIZATION REPORT",
            "=" * 80,
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total Recommendations: {len(recommendations)}",
            f"Estimated Total Monthly Savings: ${total_savings:.2f}",
            "=" * 80,
            ""
        ]
        
        # Group by priority
        for priority in ['high', 'medium', 'low']:
            priority_recs = [r for r in sorted_recs if r.priority == priority]
            if priority_recs:
                report_lines.append(f"\n{priority.upper()} PRIORITY ({len(priority_recs)} items):")
                report_lines.append("-" * 80)
                for rec in priority_recs:
                    report_lines.append(str(rec))
        
        report_lines.extend([
            "",
            "=" * 80,
            f"Total Potential Savings: ${total_savings:.2f}/month",
            "=" * 80
        ])
        
        return "\n".join(report_lines)

