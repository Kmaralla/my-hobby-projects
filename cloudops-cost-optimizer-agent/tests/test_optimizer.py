"""
Unit tests for Cost Optimizer module
"""

import unittest
from datetime import datetime, timedelta
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from optimizer import CostOptimizer, OptimizationRecommendation


class TestOptimizationRecommendation(unittest.TestCase):
    """Test cases for OptimizationRecommendation class."""
    
    def test_recommendation_creation(self):
        """Test creating an optimization recommendation."""
        rec = OptimizationRecommendation(
            resource_id='i-12345',
            resource_type='EC2 Instance',
            action='stop',
            reason='Low utilization',
            estimated_savings=50.0,
            priority='high'
        )
        
        self.assertEqual(rec.resource_id, 'i-12345')
        self.assertEqual(rec.resource_type, 'EC2 Instance')
        self.assertEqual(rec.action, 'stop')
        self.assertEqual(rec.estimated_savings, 50.0)
        self.assertEqual(rec.priority, 'high')
    
    def test_recommendation_to_dict(self):
        """Test converting recommendation to dictionary."""
        rec = OptimizationRecommendation(
            resource_id='vol-67890',
            resource_type='EBS Volume',
            action='delete',
            reason='Unattached volume',
            estimated_savings=10.0
        )
        
        rec_dict = rec.to_dict()
        self.assertIsInstance(rec_dict, dict)
        self.assertEqual(rec_dict['resource_id'], 'vol-67890')
        self.assertEqual(rec_dict['estimated_savings_usd'], 10.0)
        self.assertIn('timestamp', rec_dict)
    
    def test_recommendation_str(self):
        """Test string representation of recommendation."""
        rec = OptimizationRecommendation(
            resource_id='i-test',
            resource_type='EC2',
            action='resize',
            reason='Test',
            estimated_savings=25.0,
            priority='medium'
        )
        
        str_repr = str(rec)
        self.assertIn('MEDIUM', str_repr)
        self.assertIn('i-test', str_repr)
        self.assertIn('$25.00', str_repr)


class TestCostOptimizer(unittest.TestCase):
    """Test cases for CostOptimizer class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = {
            'optimization': {
                'enabled': True,
                'auto_execute': False,
                'actions': [
                    'stop_idle_instances',
                    'resize_underutilized',
                    'delete_unused_volumes'
                ]
            },
            'monitoring': {
                'cost_threshold_usd': 1000.0,
                'utilization_threshold_percent': 20.0
            }
        }
        self.optimizer = CostOptimizer(self.config)
    
    def test_optimizer_initialization(self):
        """Test CostOptimizer initialization."""
        self.assertEqual(self.optimizer.cost_threshold, 1000.0)
        self.assertEqual(self.optimizer.utilization_threshold, 20.0)
        self.assertIn('stop_idle_instances', self.optimizer.enabled_actions)
    
    def test_analyze_idle_ec2_instances(self):
        """Test analyzing idle EC2 instances."""
        aws_data = {
            'ec2_instances': [
                {
                    'instance_id': 'i-idle',
                    'instance_type': 't3.medium',
                    'state': 'running',
                    'launch_time': datetime.now() - timedelta(days=10)
                }
            ],
            'instance_metrics': [
                {
                    'instance_id': 'i-idle',
                    'metric_name': 'CPUUtilization',
                    'average': 5.0
                }
            ],
            'ebs_volumes': [],
            'cost_data': {'total_cost': 500, 'period_days': 30}
        }
        
        recommendations = self.optimizer.analyze(aws_data)
        
        # Should recommend stopping the idle instance
        self.assertGreater(len(recommendations), 0)
        idle_recs = [r for r in recommendations if r.resource_id == 'i-idle']
        self.assertGreater(len(idle_recs), 0)
        self.assertEqual(idle_recs[0].action, 'stop')
    
    def test_analyze_unused_ebs_volumes(self):
        """Test analyzing unused EBS volumes."""
        aws_data = {
            'ec2_instances': [],
            'instance_metrics': [],
            'ebs_volumes': [
                {
                    'volume_id': 'vol-unused',
                    'size': 100,
                    'state': 'available',
                    'volume_type': 'gp3',
                    'attachments': []
                }
            ],
            'cost_data': {'total_cost': 500, 'period_days': 30}
        }
        
        recommendations = self.optimizer.analyze(aws_data)
        
        # Should recommend deleting unused volume
        volume_recs = [r for r in recommendations if r.resource_id == 'vol-unused']
        self.assertGreater(len(volume_recs), 0)
        self.assertEqual(volume_recs[0].action, 'delete')
        self.assertGreater(volume_recs[0].estimated_savings, 0)
    
    def test_analyze_cost_threshold_exceeded(self):
        """Test cost threshold alert."""
        aws_data = {
            'ec2_instances': [],
            'instance_metrics': [],
            'ebs_volumes': [],
            'cost_data': {'total_cost': 1500, 'period_days': 30}  # Exceeds 1000 threshold
        }
        
        recommendations = self.optimizer.analyze(aws_data)
        
        # Should have cost alert recommendation
        cost_recs = [r for r in recommendations if r.resource_type == 'Cost Alert']
        self.assertGreater(len(cost_recs), 0)
        self.assertEqual(cost_recs[0].priority, 'high')
    
    def test_estimate_instance_savings(self):
        """Test instance savings estimation."""
        savings = self.optimizer._estimate_instance_savings('t3.medium')
        self.assertGreater(savings, 0)
        self.assertEqual(savings, 30.0)  # From pricing map
        
        # Test unknown instance type
        unknown_savings = self.optimizer._estimate_instance_savings('unknown.type')
        self.assertEqual(unknown_savings, 50.0)  # Default
    
    def test_generate_report_empty(self):
        """Test report generation with no recommendations."""
        report = self.optimizer.generate_report([])
        self.assertIn('No optimization recommendations', report)
    
    def test_generate_report_with_recommendations(self):
        """Test report generation with recommendations."""
        recommendations = [
            OptimizationRecommendation(
                resource_id='i-test1',
                resource_type='EC2',
                action='stop',
                reason='Low CPU',
                estimated_savings=30.0,
                priority='high'
            ),
            OptimizationRecommendation(
                resource_id='vol-test2',
                resource_type='EBS',
                action='delete',
                reason='Unused',
                estimated_savings=10.0,
                priority='medium'
            )
        ]
        
        report = self.optimizer.generate_report(recommendations)
        
        self.assertIn('AWS COST OPTIMIZATION REPORT', report)
        self.assertIn('Total Recommendations: 2', report)
        self.assertIn('$40.00', report)  # Total savings
        self.assertIn('HIGH PRIORITY', report)
        self.assertIn('MEDIUM PRIORITY', report)
    
    def test_execute_optimizations_disabled(self):
        """Test execution with auto_execute disabled."""
        recommendations = [
            OptimizationRecommendation(
                resource_id='i-test',
                resource_type='EC2',
                action='stop',
                reason='Test',
                estimated_savings=30.0,
                priority='high'
            )
        ]
        
        result = self.optimizer.execute_optimizations(recommendations, auto_execute=False)
        
        self.assertFalse(result['executed'])
        self.assertEqual(result['reason'], 'auto_execute is disabled')


class TestOptimizerEdgeCases(unittest.TestCase):
    """Test edge cases and boundary conditions."""
    
    def test_empty_aws_data(self):
        """Test optimizer with empty AWS data."""
        config = {
            'optimization': {'enabled': True, 'actions': []},
            'monitoring': {'cost_threshold_usd': 1000, 'utilization_threshold_percent': 20}
        }
        optimizer = CostOptimizer(config)
        
        recommendations = optimizer.analyze({})
        self.assertIsInstance(recommendations, list)
    
    def test_high_utilization_instances(self):
        """Test that high utilization instances are not flagged."""
        config = {
            'optimization': {
                'enabled': True,
                'actions': ['stop_idle_instances']
            },
            'monitoring': {
                'cost_threshold_usd': 1000,
                'utilization_threshold_percent': 20
            }
        }
        optimizer = CostOptimizer(config)
        
        aws_data = {
            'ec2_instances': [
                {
                    'instance_id': 'i-busy',
                    'instance_type': 't3.large',
                    'state': 'running',
                    'launch_time': datetime.now()
                }
            ],
            'instance_metrics': [
                {
                    'instance_id': 'i-busy',
                    'average': 85.0  # High utilization
                }
            ],
            'ebs_volumes': [],
            'cost_data': {'total_cost': 100, 'period_days': 30}
        }
        
        recommendations = optimizer.analyze(aws_data)
        stop_recs = [r for r in recommendations if r.action == 'stop' and r.resource_id == 'i-busy']
        self.assertEqual(len(stop_recs), 0)  # Should not recommend stopping


if __name__ == '__main__':
    unittest.main()

