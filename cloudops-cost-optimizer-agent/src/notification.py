"""
Notification Module

This module handles sending optimization reports and alerts via multiple channels
including email (SMTP) and Slack. It formats reports appropriately for each
channel and includes error handling for failed deliveries.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError
    SLACK_AVAILABLE = True
except ImportError:
    SLACK_AVAILABLE = False
    logger.warning("slack_sdk not available. Slack notifications will be simulated.")


class Notifier:
    """Handle notifications to various channels."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Notifier.
        
        Args:
            config: Notification configuration dictionary
        """
        self.config = config
        self.notification_config = config.get('notifications', {})
        self.enabled = self.notification_config.get('enabled', True)
        self.channels = self.notification_config.get('channels', [])
        
        # Email configuration
        self.email_config = self.notification_config.get('email', {})
        
        # Slack configuration
        self.slack_config = self.notification_config.get('slack', {})
        self.slack_client = None
        
        if 'slack' in self.channels and SLACK_AVAILABLE:
            webhook_url = self.slack_config.get('webhook_url', '')
            if webhook_url and 'YOUR/WEBHOOK/URL' not in webhook_url:
                # In production, initialize WebClient here
                logger.info("Slack client would be initialized with webhook URL")
        
        logger.info(f"Notifier initialized. Channels: {self.channels}")
    
    def send_notification(self, subject: str, message: str, 
                         priority: str = 'normal') -> Dict[str, Any]:
        """
        Send notification through configured channels.
        
        Args:
            subject: Notification subject/title
            message: Notification message body
            priority: Priority level (high, normal, low)
            
        Returns:
            Results dictionary with success status per channel
        """
        if not self.enabled:
            logger.info("Notifications disabled in config")
            return {'enabled': False}
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'subject': subject,
            'priority': priority,
            'channels': {}
        }
        
        # Send via email
        if 'email' in self.channels:
            email_result = self._send_email(subject, message, priority)
            results['channels']['email'] = email_result
        
        # Send via Slack
        if 'slack' in self.channels:
            slack_result = self._send_slack(subject, message, priority)
            results['channels']['slack'] = slack_result
        
        logger.info(f"Notification sent: {subject}")
        return results
    
    def _send_email(self, subject: str, message: str, priority: str) -> Dict[str, Any]:
        """
        Send email notification.
        
        Args:
            subject: Email subject
            message: Email body
            priority: Priority level
            
        Returns:
            Result dictionary with success status
        """
        try:
            recipients = self.email_config.get('recipients', [])
            sender = self.email_config.get('sender', 'cloudops-agent@example.com')
            smtp_server = self.email_config.get('smtp_server', 'smtp.gmail.com')
            smtp_port = self.email_config.get('smtp_port', 587)
            
            if not recipients:
                logger.warning("No email recipients configured")
                return {'success': False, 'reason': 'No recipients configured'}
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = sender
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = f"[{priority.upper()}] {subject}"
            
            # Add body
            body = f"""
CloudOps Cost Optimizer Agent Notification

Priority: {priority.upper()}
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{message}

---
This is an automated message from CloudOps Cost Optimizer Agent.
"""
            msg.attach(MIMEText(body, 'plain'))
            
            # In production, actually send the email
            # For demo, we simulate it
            logger.info(f"[SIMULATED] Email sent to {recipients}")
            logger.info(f"[SIMULATED] Subject: {msg['Subject']}")
            
            # Uncomment below for actual email sending:
            # with smtplib.SMTP(smtp_server, smtp_port) as server:
            #     server.starttls()
            #     server.login(sender, password)  # Need password from env/config
            #     server.send_message(msg)
            
            return {
                'success': True,
                'recipients': recipients,
                'simulated': True
            }
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return {'success': False, 'error': str(e)}
    
    def _send_slack(self, subject: str, message: str, priority: str) -> Dict[str, Any]:
        """
        Send Slack notification.
        
        Args:
            subject: Message title
            message: Message body
            priority: Priority level
            
        Returns:
            Result dictionary with success status
        """
        try:
            webhook_url = self.slack_config.get('webhook_url', '')
            channel = self.slack_config.get('channel', '#cloudops-alerts')
            
            if not webhook_url or 'YOUR/WEBHOOK/URL' in webhook_url:
                logger.info("[SIMULATED] Slack notification (no valid webhook configured)")
                return {
                    'success': True,
                    'channel': channel,
                    'simulated': True
                }
            
            # Determine emoji based on priority
            emoji_map = {
                'high': ':rotating_light:',
                'medium': ':warning:',
                'low': ':information_source:',
                'normal': ':bell:'
            }
            emoji = emoji_map.get(priority, ':bell:')
            
            # Format message for Slack
            slack_message = {
                'channel': channel,
                'username': 'CloudOps Cost Optimizer',
                'icon_emoji': emoji,
                'blocks': [
                    {
                        'type': 'header',
                        'text': {
                            'type': 'plain_text',
                            'text': f"{emoji} {subject}"
                        }
                    },
                    {
                        'type': 'section',
                        'fields': [
                            {
                                'type': 'mrkdwn',
                                'text': f"*Priority:*\n{priority.upper()}"
                            },
                            {
                                'type': 'mrkdwn',
                                'text': f"*Time:*\n{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                            }
                        ]
                    },
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': message
                        }
                    }
                ]
            }
            
            # In production, send to Slack webhook
            logger.info(f"[SIMULATED] Slack message sent to {channel}")
            
            # Uncomment below for actual Slack sending:
            # import requests
            # response = requests.post(webhook_url, json=slack_message)
            # response.raise_for_status()
            
            return {
                'success': True,
                'channel': channel,
                'simulated': True
            }
            
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_optimization_report(self, report: str, 
                                recommendations_count: int,
                                total_savings: float) -> Dict[str, Any]:
        """
        Send cost optimization report notification.
        
        Args:
            report: Full report text
            recommendations_count: Number of recommendations
            total_savings: Total estimated savings
            
        Returns:
            Results dictionary
        """
        subject = f"AWS Cost Optimization Report - {recommendations_count} Recommendations"
        
        # Create summary message
        summary = f"""
Cost Optimization Analysis Complete

Recommendations: {recommendations_count}
Estimated Monthly Savings: ${total_savings:.2f}

{report}
"""
        
        # Determine priority based on savings
        if total_savings > 500:
            priority = 'high'
        elif total_savings > 100:
            priority = 'medium'
        else:
            priority = 'normal'
        
        return self.send_notification(subject, summary, priority)
    
    def send_alert(self, alert_type: str, details: str) -> Dict[str, Any]:
        """
        Send immediate alert notification.
        
        Args:
            alert_type: Type of alert
            details: Alert details
            
        Returns:
            Results dictionary
        """
        subject = f"AWS Alert: {alert_type}"
        message = f"""
ALERT: {alert_type}

Details:
{details}

Please review and take appropriate action.
"""
        
        return self.send_notification(subject, message, priority='high')

