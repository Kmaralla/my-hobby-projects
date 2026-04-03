"""
Unit tests for Agent Core module
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os
import tempfile
import yaml

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from agent_core import CloudOpsAgent


class TestCloudOpsAgent(unittest.TestCase):
    """Test cases for CloudOpsAgent class."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary config file
        self.config_data = {
            'aws': {
                'region': 'us-east-1',
                'profile': None
            },
            'monitoring': {
                'check_frequency_hours': 24,
                'cost_threshold_usd': 1000.0,
                'utilization_threshold_percent': 20.0
            },
            'optimization': {
                'enabled': True,
                'auto_execute': False,
                'actions': ['stop_idle_instances', 'delete_unused_volumes']
            },
            'notifications': {
                'enabled': True,
                'channels': ['email'],
                'email': {
                    'recipients': ['test@example.com'],
                    'sender': 'agent@example.com'
                }
            }
        }
        
        # Create temporary config file
        self.temp_config = tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False)
        yaml.dump(self.config_data, self.temp_config)
        self.temp_config.close()
        self.config_path = self.temp_config.name
    
    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.config_path):
            os.unlink(self.config_path)
    
    def test_agent_initialization(self):
        """Test CloudOpsAgent initialization."""
        agent = CloudOpsAgent(self.config_path)
        
        self.assertIsNotNone(agent.aws_monitor)
        self.assertIsNotNone(agent.optimizer)
        self.assertIsNotNone(agent.notifier)
        self.assertEqual(agent.config['aws']['region'], 'us-east-1')
    
    def test_load_config(self):
        """Test configuration loading."""
        agent = CloudOpsAgent(self.config_path)
        config = agent.config
        
        self.assertIn('aws', config)
        self.assertIn('monitoring', config)
        self.assertIn('optimization', config)
        self.assertIn('notifications', config)
    
    def test_load_config_file_not_found(self):
        """Test error handling when config file not found."""
        with self.assertRaises(FileNotFoundError):
            CloudOpsAgent('/nonexistent/config.yaml')
    
    def test_get_status(self):
        """Test getting agent status."""
        agent = CloudOpsAgent(self.config_path)
        status = agent.get_status()
        
        self.assertIsInstance(status, dict)
        self.assertIn('agent_name', status)
        self.assertIn('start_time', status)
        self.assertIn('aws_region', status)
        self.assertIn('optimization_enabled', status)
        self.assertEqual(status['aws_region'], 'us-east-1')
        self.assertTrue(status['optimization_enabled'])
    
    @patch('agent_core.AWSResourceMonitor')
    @patch('agent_core.CostOptimizer')
    @patch('agent_core.Notifier')
    def test_run_workflow(self, mock_notifier, mock_optimizer, mock_aws):
        """Test complete agent run workflow."""
        # Setup mocks
        mock_aws_instance = Mock()
        mock_aws_instance.fetch_data.return_value = {
            'ec2_instances': [],
            'ebs_volumes': [],
            'cost_data': {'total_cost': 500, 'period_days': 30},
            'instance_metrics': [],
            'fetch_timestamp': '2025-10-14T12:00:00'
        }
        mock_aws.return_value = mock_aws_instance
        
        mock_optimizer_instance = Mock()
        mock_optimizer_instance.analyze.return_value = []
        mock_optimizer_instance.generate_report.return_value = 'Test Report'
        mock_optimizer_instance.execute_optimizations.return_value = {
            'executed': False,
            'reason': 'auto_execute is disabled'
        }
        mock_optimizer.return_value = mock_optimizer_instance
        
        mock_notifier_instance = Mock()
        mock_notifier_instance.send_optimization_report.return_value = {
            'success': True
        }
        mock_notifier.return_value = mock_notifier_instance
        
        # Run agent
        agent = CloudOpsAgent(self.config_path)
        results = agent.run()
        
        # Verify workflow executed
        self.assertEqual(results['status'], 'completed')
        self.assertIn('aws_data', results)
        self.assertIn('recommendations_count', results)
        self.assertIn('report', results)
        
        # Verify methods were called
        mock_aws_instance.fetch_data.assert_called_once()
        mock_optimizer_instance.analyze.assert_called_once()
        mock_notifier_instance.send_optimization_report.assert_called_once()
    
    def test_initialize_components(self):
        """Test initialization of agent components."""
        agent = CloudOpsAgent(self.config_path)
        
        # Test AWS monitor initialization
        aws_monitor = agent._initialize_aws_monitor()
        self.assertIsNotNone(aws_monitor)
        
        # Test optimizer initialization
        optimizer = agent._initialize_optimizer()
        self.assertIsNotNone(optimizer)
        
        # Test notifier initialization
        notifier = agent._initialize_notifier()
        self.assertIsNotNone(notifier)


class TestAgentErrorHandling(unittest.TestCase):
    """Test error handling and edge cases."""
    
    def test_invalid_yaml_config(self):
        """Test handling of invalid YAML configuration."""
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False)
        temp_file.write('invalid: yaml: content: [unclosed')
        temp_file.close()
        
        try:
            with self.assertRaises(yaml.YAMLError):
                CloudOpsAgent(temp_file.name)
        finally:
            os.unlink(temp_file.name)
    
    def test_minimal_config(self):
        """Test agent with minimal configuration."""
        minimal_config = {
            'aws': {'region': 'us-east-1'},
            'monitoring': {},
            'optimization': {'enabled': False},
            'notifications': {'enabled': False}
        }
        
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False)
        yaml.dump(minimal_config, temp_file)
        temp_file.close()
        
        try:
            agent = CloudOpsAgent(temp_file.name)
            self.assertIsNotNone(agent)
            status = agent.get_status()
            self.assertFalse(status['optimization_enabled'])
        finally:
            os.unlink(temp_file.name)


class TestAgentIntegration(unittest.TestCase):
    """Integration tests for full agent workflow."""
    
    def setUp(self):
        """Set up integration test fixtures."""
        self.config_data = {
            'aws': {'region': 'us-east-1', 'profile': None},
            'monitoring': {
                'cost_threshold_usd': 1000.0,
                'utilization_threshold_percent': 20.0
            },
            'optimization': {
                'enabled': True,
                'auto_execute': False,
                'actions': ['stop_idle_instances']
            },
            'notifications': {
                'enabled': True,
                'channels': ['email'],
                'email': {'recipients': ['test@example.com']}
            }
        }
        
        self.temp_config = tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False)
        yaml.dump(self.config_data, self.temp_config)
        self.temp_config.close()
    
    def tearDown(self):
        """Clean up."""
        if os.path.exists(self.temp_config.name):
            os.unlink(self.temp_config.name)
    
    def test_full_run_with_mock_data(self):
        """Test full agent run with mock AWS data."""
        agent = CloudOpsAgent(self.temp_config.name)
        
        # This will use mock data from AWS integration
        results = agent.run()
        
        # Verify results structure
        self.assertIn('status', results)
        self.assertIn('aws_data', results)
        self.assertIn('recommendations_count', results)
        self.assertIn('report', results)
        self.assertIn('execution', results)
        self.assertIn('notification', results)


if __name__ == '__main__':
    unittest.main()

