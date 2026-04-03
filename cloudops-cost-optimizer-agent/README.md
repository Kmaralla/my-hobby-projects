# CloudOps Cost Optimizer Agent

A Python-based automation tool that continuously monitors your AWS infrastructure, analyzes spending patterns, and provides actionable recommendations to optimize cloud costs. Built for DevOps teams who want to reduce AWS bills without manual intervention.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![AWS](https://img.shields.io/badge/AWS-boto3-orange.svg)

## 🎯 Overview

This tool was built to solve a common problem: AWS bills that keep growing without clear visibility into what's driving the costs. After manually reviewing AWS resources became too time-consuming, I created this agent to automate the process.

The CloudOps Cost Optimizer Agent helps organizations:

- **Monitor** AWS resources continuously (EC2, EBS, Cost Explorer, CloudWatch)
- **Analyze** resource utilization and cost patterns  
- **Optimize** cloud spending through data-driven recommendations
- **Notify** teams via email and Slack with actionable insights

The agent runs autonomously, requiring minimal human intervention while providing significant cost savings.

## ✨ Features

- **🔍 Comprehensive AWS Monitoring**
  - EC2 instance tracking and metrics
  - EBS volume utilization analysis
  - Cost Explorer integration for spend analysis
  - CloudWatch metrics for resource utilization

- **🤖 Intelligent Optimization**
  - Detect idle and underutilized instances
  - Identify unused EBS volumes
  - Recommend instance right-sizing
  - Flag cost threshold breaches
  - Estimate savings for each recommendation

- **📊 Detailed Reporting**
  - Priority-based recommendations (High, Medium, Low)
  - Estimated monthly savings per action
  - Comprehensive optimization reports
  - Export capabilities for further analysis

- **🔔 Multi-Channel Notifications**
  - Email notifications with detailed reports
  - Slack integration for real-time alerts
  - Customizable alert thresholds
  - Priority-based routing

- **⚙️ Flexible Configuration**
  - YAML-based configuration
  - Configurable optimization actions
  - Auto-execute or recommendation-only modes
  - Adjustable monitoring intervals

## 📁 Project Structure

```
cloudops-cost-optimizer-agent/
│
├── README.md                    # This file
├── requirements.txt             # Python dependencies
├── .gitignore                  # Git ignore rules
│
├── config/
│   └── agent_config.yaml       # Agent configuration
│
├── src/
│   ├── main.py                 # Entry point
│   ├── agent_core.py           # Core agent orchestration
│   ├── aws_integration.py      # AWS API integration
│   ├── optimizer.py            # Cost optimization logic
│   └── notification.py         # Notification handlers
│
├── tests/
│   ├── test_agent_core.py      # Agent core tests
│   ├── test_aws_integration.py # AWS integration tests
│   └── test_optimizer.py       # Optimizer tests
│
├── scripts/
│   └── demo_run.sh            # Demo run script
│
└── logs/                       # Log files (created at runtime)
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- AWS Account with appropriate permissions
- AWS CLI configured (optional, for credentials)
- pip package manager

> **Note**: This tool requires read access to EC2, CloudWatch, and Cost Explorer APIs. For safety, it runs in recommendation-only mode by default.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/cloudops-cost-optimizer-agent.git
   cd cloudops-cost-optimizer-agent
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure AWS credentials:**
   
   Option A - AWS CLI:
   ```bash
   aws configure
   ```
   
   Option B - Environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_DEFAULT_REGION=us-east-1
   ```
   
   Option C - IAM role (for EC2/ECS deployments)

5. **Configure the agent:**
   
   Edit `config/agent_config.yaml` to customize:
   - AWS region and credentials
   - Cost thresholds
   - Optimization actions
   - Notification settings

### Quick Start

Run the agent in single execution mode:

```bash
python src/main.py --config config/agent_config.yaml
```

Or use the demo script:

```bash
chmod +x scripts/demo_run.sh
./scripts/demo_run.sh
```

## 📖 Usage

### Command Line Options

```bash
python src/main.py [OPTIONS]

Options:
  --config PATH          Path to configuration file (default: config/agent_config.yaml)
  --continuous          Run continuously at scheduled intervals
  --interval HOURS      Hours between runs in continuous mode
  --log-level LEVEL     Logging level: DEBUG, INFO, WARNING, ERROR (default: INFO)
  --log-file PATH       Log file path (default: logs/agent.log)
  --status              Display agent status and exit
  -h, --help           Show help message
```

### Usage Examples

**Single run with custom config:**
```bash
python src/main.py --config /path/to/config.yaml
```

**Continuous monitoring (runs every 24 hours):**
```bash
python src/main.py --continuous
```

**Continuous with custom interval (every 6 hours):**
```bash
python src/main.py --continuous --interval 6
```

**Debug mode:**
```bash
python src/main.py --log-level DEBUG
```

**Check agent status:**
```bash
python src/main.py --status
```

### Running Tests

Run all tests:
```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

Or with pytest (if installed):
```bash
pytest tests/ -v
```

Run specific test file:
```bash
python -m unittest tests.test_optimizer
```

## ⚙️ Configuration

The agent is configured via `config/agent_config.yaml`:

```yaml
aws:
  region: us-east-1
  profile: default  # AWS profile name or leave blank

monitoring:
  check_frequency_hours: 24
  cost_threshold_usd: 1000.0
  utilization_threshold_percent: 20.0

optimization:
  enabled: true
  auto_execute: false  # Set to true to automatically apply optimizations
  actions:
    - stop_idle_instances
    - resize_underutilized
    - delete_unused_volumes
    - cleanup_old_snapshots

notifications:
  enabled: true
  channels:
    - email
    - slack
  email:
    recipients:
      - admin@example.com
    smtp_server: smtp.gmail.com
    smtp_port: 587
    sender: cloudops-agent@example.com
  slack:
    webhook_url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
    channel: "#cloudops-alerts"
```

### Configuration Options

**AWS Settings:**
- `region`: AWS region to monitor
- `profile`: AWS credentials profile (optional)

**Monitoring Settings:**
- `check_frequency_hours`: How often to run in continuous mode
- `cost_threshold_usd`: Alert when monthly costs exceed this amount
- `utilization_threshold_percent`: Flag resources below this utilization

**Optimization Settings:**
- `enabled`: Enable/disable optimization analysis
- `auto_execute`: Whether to automatically apply recommendations (⚠️ use with caution)
- `actions`: List of enabled optimization actions

**Notification Settings:**
- `enabled`: Enable/disable notifications
- `channels`: Notification channels (email, slack)
- Channel-specific configuration for email and Slack

## 🏗️ Architecture

### Agent Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CloudOps Agent Workflow                      │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   Load Config    │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Initialize      │
    │  Components      │
    │  - AWS Monitor   │
    │  - Optimizer     │
    │  - Notifier      │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Fetch AWS Data  │
    │  - EC2 Instances │
    │  - EBS Volumes   │
    │  - Cost Data     │
    │  - Metrics       │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Analyze &       │
    │  Generate        │
    │  Recommendations │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Execute         │
    │  Optimizations   │
    │  (if enabled)    │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Send            │
    │  Notifications   │
    │  - Email         │
    │  - Slack         │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Generate        │
    │  Report          │
    └──────────────────┘
```

### Component Overview

**1. Agent Core (`agent_core.py`)**
- Orchestrates the entire workflow
- Manages component lifecycle
- Handles errors and retries

**2. AWS Integration (`aws_integration.py`)**
- Interfaces with AWS APIs via boto3
- Fetches EC2, EBS, Cost Explorer, and CloudWatch data
- Implements retry logic and error handling

**3. Cost Optimizer (`optimizer.py`)**
- Analyzes AWS resource data
- Generates prioritized recommendations
- Estimates cost savings
- Can execute optimizations (if configured)

**4. Notification Handler (`notification.py`)**
- Sends notifications via multiple channels
- Formats reports for each channel
- Manages notification preferences

## 🔧 AWS Permissions

The agent requires the following AWS IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeSnapshots",
        "ec2:StopInstances",
        "ec2:TerminateInstances",
        "ec2:DeleteVolume",
        "cloudwatch:GetMetricStatistics",
        "ce:GetCostAndUsage"
      ],
      "Resource": "*"
    }
  ]
}
```

**Note:** For read-only mode (recommendations without auto-execute), you can omit the write permissions (`StopInstances`, `TerminateInstances`, `DeleteVolume`).

## 📊 Sample Output

```
================================================================================
AWS COST OPTIMIZATION REPORT
================================================================================
Generated: 2025-10-14 15:30:45
Total Recommendations: 5
Estimated Total Monthly Savings: $247.50
================================================================================

HIGH PRIORITY (2 items):
--------------------------------------------------------------------------------
[HIGH] stop EC2 Instance i-1234567890abcdef0: Low CPU utilization (3.2% avg over 7 days) (Est. savings: $60.00/month)
[HIGH] review Cost Alert account-wide: Monthly costs ($1,125.00) exceed threshold ($1,000.00) (Est. savings: $0.00/month)

MEDIUM PRIORITY (3 items):
--------------------------------------------------------------------------------
[MEDIUM] delete EBS Volume vol-0987654321: Unattached 100GB volume (Est. savings: $10.00/month)
[MEDIUM] resize EC2 Instance i-abcdef1234567890: Underutilized m5.xlarge (CPU: 25.3%), consider smaller type (Est. savings: $70.00/month)
[MEDIUM] stop EC2 Instance i-fedcba0987654321: Low CPU utilization (12.1% avg over 7 days) (Est. savings: $107.50/month)

================================================================================
Total Potential Savings: $247.50/month
================================================================================
```

## 🛡️ Safety Features

- **Recommendation-Only Mode**: By default, the agent only recommends actions without executing them
- **Auto-Execute Flag**: Must be explicitly enabled in configuration
- **Priority-Based Actions**: High-priority items flagged for immediate attention
- **Dry-Run Support**: Test recommendations without applying them
- **Comprehensive Logging**: All actions logged for audit trail
- **Error Handling**: Graceful degradation and error notifications

## 🔄 Development and Extension

### Adding New Optimization Actions

1. Add your action to `src/optimizer.py`
2. Implement the analysis logic
3. Add the action to the config file
4. Write tests in `tests/test_optimizer.py`

Example:
```python
def _analyze_rds_instances(self, rds_data):
    """Analyze RDS instances for optimization."""
    recommendations = []
    # Your analysis logic here
    return recommendations
```

### Adding New Notification Channels

1. Add channel handler to `src/notification.py`
2. Implement the send method
3. Update configuration schema
4. Write tests

### Extending AWS Integration

1. Add new fetch methods to `src/aws_integration.py`
2. Update the `fetch_data()` method to include new data
3. Add corresponding tests

## 🐛 Troubleshooting

**Problem**: `NoCredentialsError` from boto3

**Solution**: Configure AWS credentials using one of the methods in Installation section

---

**Problem**: Agent reports "connection timeout"

**Solution**: Check internet connectivity and AWS service health. Verify security group rules if running on EC2.

---

**Problem**: No recommendations generated

**Solution**: This is normal if resources are well-optimized. Try lowering thresholds in config or wait for more data to accumulate.

---

**Problem**: Email notifications not working

**Solution**: Ensure SMTP settings are correct. For Gmail, you may need to enable "Less secure app access" or use an app-specific password.

## 📝 TODO / Roadmap

- [ ] Add support for more AWS services (RDS, Lambda, S3)
- [ ] Implement machine learning for better predictions
- [ ] Add web dashboard for visualization
- [ ] Support for multi-account AWS Organizations
- [ ] Integration with Terraform/CloudFormation
- [ ] Cost forecasting and trend analysis
- [ ] Automated tagging recommendations
- [ ] Kubernetes cost optimization

## 🤝 Contributing

Contributions are welcome! This project started as a personal tool but has grown into something that could benefit the broader DevOps community.

**How to contribute:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature-name`)
3. Make your changes and test them thoroughly
4. Commit with a clear message (`git commit -m 'Add support for RDS optimization'`)
5. Push to your branch (`git push origin feature/your-feature-name`)
6. Open a Pull Request

**What I'm looking for:**
- Bug fixes and improvements
- Support for additional AWS services (RDS, Lambda, S3, etc.)
- Better cost estimation algorithms
- Additional notification channels
- Performance optimizations

**Code standards:**
- Follow PEP 8 style guidelines
- Include tests for new features
- Update documentation
- Keep the code readable and well-commented

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [boto3](https://github.com/boto/boto3) - AWS SDK for Python
- Uses [pydantic](https://github.com/pydantic/pydantic) for data validation
- Slack integration via [slack_sdk](https://github.com/slackapi/python-slack-sdk)

## 📧 Contact & Support

- **Issues**: Please use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and general discussion
- **Email**: [your-email@example.com]

## ⚠️ Important Notes

This tool is designed to help optimize AWS costs, but it's important to understand its limitations:

- **Always review recommendations** before applying them in production
- **Test in non-production environments** first
- **Monitor the impact** of any changes you make
- **Keep backups** of important data before making changes
- **The tool provides recommendations** - you make the final decisions

This software is provided as-is. Use at your own risk and always follow AWS best practices.

---

Built with ❤️ for the DevOps community

<!-- 
Placeholder for architecture diagram:
Upload your architecture diagram as: architecture-diagram.png
-->

