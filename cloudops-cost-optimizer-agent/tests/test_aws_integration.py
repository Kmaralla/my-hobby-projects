"""
Unit tests for AWS Integration module
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from aws_integration import AWSResourceMonitor


class TestAWSResourceMonitor(unittest.TestCase):
    """Test cases for AWSResourceMonitor class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.monitor = AWSResourceMonitor(region='us-east-1')
    
    def test_initialization(self):
        """Test AWSResourceMonitor initialization."""
        self.assertEqual(self.monitor.region, 'us-east-1')
        self.assertIsNotNone(self.monitor.session)
    
    def test_fetch_ec2_instances_mock_data(self):
        """Test fetching EC2 instances returns mock data on error."""
        instances = self.monitor._get_mock_ec2_data()
        
        self.assertIsInstance(instances, list)
        self.assertGreater(len(instances), 0)
        
        # Check structure of first instance
        instance = instances[0]
        self.assertIn('instance_id', instance)
        self.assertIn('instance_type', instance)
        self.assertIn('state', instance)
        self.assertIn('tags', instance)
    
    def test_fetch_ebs_volumes_mock_data(self):
        """Test fetching EBS volumes returns mock data on error."""
        volumes = self.monitor._get_mock_ebs_data()
        
        self.assertIsInstance(volumes, list)
        self.assertGreater(len(volumes), 0)
        
        # Check structure of first volume
        volume = volumes[0]
        self.assertIn('volume_id', volume)
        self.assertIn('size', volume)
        self.assertIn('state', volume)
        self.assertIn('volume_type', volume)
    
    def test_fetch_cost_data_mock(self):
        """Test fetching cost data returns proper structure."""
        cost_data = self.monitor._get_mock_cost_data(30)
        
        self.assertIsInstance(cost_data, dict)
        self.assertIn('total_cost', cost_data)
        self.assertIn('period_days', cost_data)
        self.assertEqual(cost_data['period_days'], 30)
        self.assertGreater(cost_data['total_cost'], 0)
    
    def test_fetch_data_integration(self):
        """Test complete data fetch integration."""
        data = self.monitor.fetch_data()
        
        # Check all required keys are present
        self.assertIn('ec2_instances', data)
        self.assertIn('ebs_volumes', data)
        self.assertIn('cost_data', data)
        self.assertIn('instance_metrics', data)
        self.assertIn('fetch_timestamp', data)
        
        # Verify timestamp is recent
        timestamp = datetime.fromisoformat(data['fetch_timestamp'])
        self.assertLess((datetime.now() - timestamp).total_seconds(), 60)
    
    @patch('boto3.Session')
    def test_create_session_with_profile(self, mock_session):
        """Test session creation with profile."""
        monitor = AWSResourceMonitor(region='us-west-2', profile='test-profile')
        self.assertEqual(monitor.region, 'us-west-2')
        self.assertEqual(monitor.profile, 'test-profile')


class TestAWSIntegrationEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""
    
    def test_empty_metrics_handling(self):
        """Test handling of empty metrics."""
        monitor = AWSResourceMonitor()
        metrics = monitor.fetch_cloudwatch_metrics('i-nonexistent')
        
        self.assertIsInstance(metrics, dict)
        self.assertIn('instance_id', metrics)
        self.assertEqual(metrics['instance_id'], 'i-nonexistent')
    
    def test_different_regions(self):
        """Test initialization with different regions."""
        regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
        
        for region in regions:
            monitor = AWSResourceMonitor(region=region)
            self.assertEqual(monitor.region, region)


if __name__ == '__main__':
    unittest.main()

