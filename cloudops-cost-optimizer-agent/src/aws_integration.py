"""
AWS Integration Module

This module handles all interactions with AWS services using boto3.
It fetches EC2 instances, EBS volumes, cost data, and CloudWatch metrics.
Includes fallback to mock data when AWS APIs are unavailable or for testing.
"""

import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


class AWSResourceMonitor:
    """Monitor AWS resources and costs using boto3."""
    
    def __init__(self, region: str = 'us-east-1', profile: Optional[str] = None):
        """
        Initialize AWS Resource Monitor.
        
        Args:
            region: AWS region to connect to
            profile: AWS profile name (optional)
        """
        self.region = region
        self.profile = profile
        self.session = self._create_session()
        
    def _create_session(self) -> boto3.Session:
        """Create boto3 session with specified profile and region."""
        if self.profile:
            session = boto3.Session(profile_name=self.profile, region_name=self.region)
        else:
            session = boto3.Session(region_name=self.region)
        logger.info(f"AWS session created for region: {self.region}")
        return session
    
    def fetch_ec2_instances(self) -> List[Dict[str, Any]]:
        """
        Fetch EC2 instances information.
        
        Returns:
            List of EC2 instance data dictionaries
        """
        try:
            ec2 = self.session.client('ec2')
            response = ec2.describe_instances()
            
            instances = []
            for reservation in response.get('Reservations', []):
                for instance in reservation.get('Instances', []):
                    instances.append({
                        'instance_id': instance['InstanceId'],
                        'instance_type': instance['InstanceType'],
                        'state': instance['State']['Name'],
                        'launch_time': instance.get('LaunchTime'),
                        'tags': {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
                    })
            
            logger.info(f"Fetched {len(instances)} EC2 instances")
            return instances
            
        except Exception as e:
            logger.error(f"Error fetching EC2 instances: {e}")
            # Return mock data for demo purposes
            return self._get_mock_ec2_data()
    
    def fetch_ebs_volumes(self) -> List[Dict[str, Any]]:
        """
        Fetch EBS volumes information.
        
        Returns:
            List of EBS volume data dictionaries
        """
        try:
            ec2 = self.session.client('ec2')
            response = ec2.describe_volumes()
            
            volumes = []
            for volume in response.get('Volumes', []):
                volumes.append({
                    'volume_id': volume['VolumeId'],
                    'size': volume['Size'],
                    'state': volume['State'],
                    'volume_type': volume['VolumeType'],
                    'attachments': volume.get('Attachments', [])
                })
            
            logger.info(f"Fetched {len(volumes)} EBS volumes")
            return volumes
            
        except Exception as e:
            logger.error(f"Error fetching EBS volumes: {e}")
            return self._get_mock_ebs_data()
    
    def fetch_cost_data(self, days: int = 30) -> Dict[str, Any]:
        """
        Fetch AWS cost data from Cost Explorer.
        
        Args:
            days: Number of days to look back
            
        Returns:
            Cost data dictionary
        """
        try:
            ce = self.session.client('ce')
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            response = ce.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['UnblendedCost']
            )
            
            total_cost = sum(
                float(result['Total']['UnblendedCost']['Amount'])
                for result in response['ResultsByTime']
            )
            
            logger.info(f"Fetched cost data: ${total_cost:.2f} over {days} days")
            return {
                'total_cost': total_cost,
                'period_days': days,
                'detailed_results': response['ResultsByTime']
            }
            
        except Exception as e:
            logger.error(f"Error fetching cost data: {e}")
            return self._get_mock_cost_data(days)
    
    def fetch_cloudwatch_metrics(self, instance_id: str, metric_name: str = 'CPUUtilization') -> Dict[str, Any]:
        """
        Fetch CloudWatch metrics for an instance.
        
        Args:
            instance_id: EC2 instance ID
            metric_name: Metric name (default: CPUUtilization)
            
        Returns:
            Metrics data dictionary
        """
        try:
            cw = self.session.client('cloudwatch')
            end_time = datetime.now()
            start_time = end_time - timedelta(days=7)
            
            response = cw.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName=metric_name,
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=['Average']
            )
            
            datapoints = response.get('Datapoints', [])
            avg_value = sum(dp['Average'] for dp in datapoints) / len(datapoints) if datapoints else 0
            
            logger.info(f"Fetched {metric_name} for {instance_id}: {avg_value:.2f}%")
            return {
                'instance_id': instance_id,
                'metric_name': metric_name,
                'average': avg_value,
                'datapoints': datapoints
            }
            
        except Exception as e:
            logger.error(f"Error fetching CloudWatch metrics: {e}")
            return {'instance_id': instance_id, 'metric_name': metric_name, 'average': 15.5, 'datapoints': []}
    
    def fetch_data(self) -> Dict[str, Any]:
        """
        Fetch all AWS resource and cost data.
        
        Returns:
            Complete resource and cost data dictionary
        """
        logger.info("Starting comprehensive AWS data fetch...")
        
        ec2_instances = self.fetch_ec2_instances()
        ebs_volumes = self.fetch_ebs_volumes()
        cost_data = self.fetch_cost_data()
        
        # Fetch metrics for running instances
        instance_metrics = []
        for instance in ec2_instances:
            if instance['state'] == 'running':
                metrics = self.fetch_cloudwatch_metrics(instance['instance_id'])
                instance_metrics.append(metrics)
        
        data = {
            'ec2_instances': ec2_instances,
            'ebs_volumes': ebs_volumes,
            'cost_data': cost_data,
            'instance_metrics': instance_metrics,
            'fetch_timestamp': datetime.now().isoformat()
        }
        
        logger.info("AWS data fetch completed")
        return data
    
    # Mock data methods for demo/testing
    def _get_mock_ec2_data(self) -> List[Dict[str, Any]]:
        """Generate mock EC2 data for testing when AWS APIs are unavailable."""
        # These are realistic examples based on common AWS setups I've seen
        return [
            {
                'instance_id': 'i-1234567890abcdef0',
                'instance_type': 't3.medium',
                'state': 'running',
                'launch_time': datetime.now() - timedelta(days=30),
                'tags': {'Name': 'web-server-1', 'Environment': 'production'}
            },
            {
                'instance_id': 'i-0987654321fedcba0',
                'instance_type': 't3.large',
                'state': 'stopped',
                'launch_time': datetime.now() - timedelta(days=60),
                'tags': {'Name': 'dev-server', 'Environment': 'development'}
            },
            {
                'instance_id': 'i-abcdef1234567890',
                'instance_type': 'm5.xlarge',
                'state': 'running',
                'launch_time': datetime.now() - timedelta(days=5),
                'tags': {'Name': 'data-processor', 'Environment': 'production'}
            }
        ]
    
    def _get_mock_ebs_data(self) -> List[Dict[str, Any]]:
        """Generate mock EBS data for testing."""
        return [
            {
                'volume_id': 'vol-1234567890',
                'size': 100,
                'state': 'in-use',
                'volume_type': 'gp3',
                'attachments': [{'InstanceId': 'i-1234567890abcdef0'}]
            },
            {
                'volume_id': 'vol-0987654321',
                'size': 50,
                'state': 'available',
                'volume_type': 'gp2',
                'attachments': []
            }
        ]
    
    def _get_mock_cost_data(self, days: int) -> Dict[str, Any]:
        """Generate mock cost data for testing."""
        return {
            'total_cost': 1250.75,
            'period_days': days,
            'detailed_results': [
                {'date': (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'), 'cost': 41.69}
                for i in range(days)
            ]
        }

