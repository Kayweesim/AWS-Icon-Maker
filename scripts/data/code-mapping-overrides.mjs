// Hand-curated code mappings for the most common services. These take precedence over the
// names auto-matched by build-code-mappings.mjs, and are the only source of Terraform types.
//
// m(mermaidIcon, diagramsClass, terraformType)
//   mermaidIcon    iconify "logos:aws-*" name, or a Mermaid built-in (cloud, database, disk, internet, server)
//   diagramsClass  class under diagrams.aws, e.g. "compute.EC2"
//   terraformType  hashicorp/aws resource type

const m = (mermaidIcon, diagramsClass, terraformType) => ({
  ...(mermaidIcon && { mermaidIcon }),
  ...(diagramsClass && { diagramsClass: `diagrams.aws.${diagramsClass}` }),
  ...(terraformType && { terraformType }),
})

export const OVERRIDES = {
  // Compute
  'svc:Compute/Amazon-EC2': m('logos:aws-ec2', 'compute.EC2', 'aws_instance'),
  'res:Compute/Amazon-EC2_Instance': m('logos:aws-ec2', 'compute.EC2Instance', 'aws_instance'),
  'svc:Compute/AWS-Lambda': m('logos:aws-lambda', 'compute.Lambda', 'aws_lambda_function'),
  'res:Compute/AWS-Lambda_Lambda-Function': m('logos:aws-lambda', 'compute.LambdaFunction', 'aws_lambda_function'),
  'svc:Compute/Amazon-EC2-Auto-Scaling': m(null, 'compute.EC2AutoScaling', 'aws_autoscaling_group'),
  'res:Compute/Amazon-EC2_Auto-Scaling': m(null, 'compute.EC2AutoScaling', 'aws_autoscaling_group'),
  'svc:Compute/AWS-Elastic-Beanstalk': m('logos:aws-elastic-beanstalk', 'compute.ElasticBeanstalk', 'aws_elastic_beanstalk_environment'),
  'svc:Compute/AWS-App-Runner': m(null, 'compute.AppRunner', 'aws_apprunner_service'),
  'svc:Compute/AWS-Batch': m('logos:aws-batch', 'compute.Batch', 'aws_batch_compute_environment'),
  'svc:Compute/Amazon-Lightsail': m('logos:aws-lightsail', 'compute.Lightsail', 'aws_lightsail_instance'),

  // Containers
  'svc:Containers/Amazon-Elastic-Container-Service': m('logos:aws-ecs', 'compute.ECS', 'aws_ecs_cluster'),
  'res:Containers/Amazon-Elastic-Container-Service_Service': m('logos:aws-ecs', 'compute.ElasticContainerServiceService', 'aws_ecs_service'),
  'res:Containers/Amazon-Elastic-Container-Service_Task': m('logos:aws-ecs', 'compute.ElasticContainerServiceTask', 'aws_ecs_task_definition'),
  'svc:Containers/AWS-Fargate': m('logos:aws-fargate', 'compute.Fargate', 'aws_ecs_service'),
  'svc:Containers/Amazon-Elastic-Kubernetes-Service': m('logos:aws-eks', 'compute.EKS', 'aws_eks_cluster'),
  'svc:Containers/Amazon-Elastic-Container-Registry': m(null, 'compute.ECR', 'aws_ecr_repository'),

  // Storage
  'svc:Storage/Amazon-Simple-Storage-Service': m('logos:aws-s3', 'storage.S3', 'aws_s3_bucket'),
  'res:Storage/Amazon-Simple-Storage-Service_Bucket': m('logos:aws-s3', 'storage.SimpleStorageServiceS3Bucket', 'aws_s3_bucket'),
  'svc:Storage/Amazon-EFS': m(null, 'storage.EFS', 'aws_efs_file_system'),
  'res:Storage/Amazon-Elastic-File-System_File-System': m(null, 'storage.ElasticFileSystemEFSFileSystem', 'aws_efs_file_system'),
  'svc:Storage/Amazon-Elastic-Block-Store': m(null, 'storage.EBS', 'aws_ebs_volume'),
  'res:Storage/Amazon-Elastic-Block-Store_Volume': m(null, 'storage.ElasticBlockStoreEBSVolume', 'aws_ebs_volume'),
  'svc:Storage/Amazon-Simple-Storage-Service-Glacier': m('logos:aws-glacier', 'storage.S3Glacier', 'aws_glacier_vault'),
  'svc:Storage/AWS-Backup': m('logos:aws-backup', 'storage.Backup', 'aws_backup_vault'),

  // Databases
  'svc:Databases/Amazon-RDS': m('logos:aws-rds', 'database.RDS', 'aws_db_instance'),
  'svc:Databases/Amazon-Aurora': m('logos:aws-aurora', 'database.Aurora', 'aws_rds_cluster'),
  'res:Databases/Amazon-Aurora-Instance': m('logos:aws-aurora', 'database.AuroraInstance', 'aws_rds_cluster_instance'),
  'svc:Databases/Amazon-DynamoDB': m('logos:aws-dynamodb', 'database.Dynamodb', 'aws_dynamodb_table'),
  'svc:Databases/Amazon-ElastiCache': m('logos:aws-elasticache', 'database.ElastiCache', 'aws_elasticache_cluster'),
  'svc:Databases/Amazon-DocumentDB': m('logos:aws-documentdb', 'database.DocumentDB', 'aws_docdb_cluster'),
  'svc:Databases/Amazon-Neptune': m('logos:aws-neptune', 'database.Neptune', 'aws_neptune_cluster'),
  'svc:Databases/Amazon-Keyspaces': m('logos:aws-keyspaces', 'database.KeyspacesManagedApacheCassandraService', 'aws_keyspaces_keyspace'),
  'svc:Databases/Amazon-Timestream': m('logos:aws-timestream', 'database.Timestream', 'aws_timestreamwrite_database'),
  'svc:Analytics/Amazon-Redshift': m('logos:aws-redshift', 'analytics.Redshift', 'aws_redshift_cluster'),

  // Networking & content delivery
  'svc:Networking-Content-Delivery/Amazon-CloudFront': m('logos:aws-cloudfront', 'network.CloudFront', 'aws_cloudfront_distribution'),
  'svc:Networking-Content-Delivery/Amazon-Route-53': m('logos:aws-route53', 'network.Route53', 'aws_route53_zone'),
  'svc:Networking-Content-Delivery/Amazon-API-Gateway': m('logos:aws-api-gateway', 'network.APIGateway', 'aws_api_gateway_rest_api'),
  'svc:Networking-Content-Delivery/Amazon-Virtual-Private-Cloud': m('logos:aws-vpc', 'network.VPC', 'aws_vpc'),
  'svc:Networking-Content-Delivery/Elastic-Load-Balancing': m('logos:aws-elb', 'network.ELB', 'aws_lb'),
  'res:Networking-Content-Delivery/Elastic-Load-Balancing_Application-Load-Balancer': m('logos:aws-elb', 'network.ALB', 'aws_lb'),
  'res:Networking-Content-Delivery/Elastic-Load-Balancing_Network-Load-Balancer': m('logos:aws-elb', 'network.NLB', 'aws_lb'),
  'res:Networking-Content-Delivery/Amazon-VPC_NAT-Gateway': m('logos:aws-vpc', 'network.NATGateway', 'aws_nat_gateway'),
  'res:Networking-Content-Delivery/Amazon-VPC_Internet-Gateway': m('logos:aws-vpc', 'network.InternetGateway', 'aws_internet_gateway'),
  'res:Networking-Content-Delivery/Amazon-VPC_Endpoints': m('logos:aws-vpc', 'network.Endpoint', 'aws_vpc_endpoint'),
  'svc:Networking-Content-Delivery/AWS-Direct-Connect': m(null, 'network.DirectConnect', 'aws_dx_connection'),
  'svc:Networking-Content-Delivery/AWS-Transit-Gateway': m(null, 'network.TransitGateway', 'aws_ec2_transit_gateway'),
  'svc:Networking-Content-Delivery/AWS-Global-Accelerator': m(null, 'network.GlobalAccelerator', 'aws_globalaccelerator_accelerator'),
  'svc:Networking-Content-Delivery/AWS-Site-to-Site-VPN': m(null, 'network.SiteToSiteVpn', 'aws_vpn_connection'),
  'svc:Networking-Content-Delivery/AWS-Client-VPN': m(null, 'network.ClientVpn', 'aws_ec2_client_vpn_endpoint'),
  'svc:Networking-Content-Delivery/AWS-PrivateLink': m(null, 'network.Privatelink', 'aws_vpc_endpoint_service'),
  'svc:Networking-Content-Delivery/AWS-Cloud-Map': m(null, 'network.CloudMap', 'aws_service_discovery_private_dns_namespace'),

  // Application integration
  'svc:Application-Integration/Amazon-Simple-Queue-Service': m('logos:aws-sqs', 'integration.SQS', 'aws_sqs_queue'),
  'res:Application-Integration/Amazon-Simple-Queue-Service_Queue': m('logos:aws-sqs', 'integration.SimpleQueueServiceSqsQueue', 'aws_sqs_queue'),
  'svc:Application-Integration/Amazon-Simple-Notification-Service': m('logos:aws-sns', 'integration.SNS', 'aws_sns_topic'),
  'res:Application-Integration/Amazon-Simple-Notification-Service_Topic': m('logos:aws-sns', 'integration.SimpleNotificationServiceSnsTopic', 'aws_sns_topic'),
  'svc:Application-Integration/Amazon-EventBridge': m('logos:aws-eventbridge', 'integration.Eventbridge', 'aws_cloudwatch_event_bus'),
  'svc:Application-Integration/AWS-Step-Functions': m('logos:aws-step-functions', 'integration.StepFunctions', 'aws_sfn_state_machine'),
  'svc:Application-Integration/Amazon-MQ': m('logos:aws-mq', 'integration.MQ', 'aws_mq_broker'),
  'svc:Application-Integration/AWS-AppSync': m('logos:aws-appsync', 'integration.Appsync', 'aws_appsync_graphql_api'),

  // Analytics
  'svc:Analytics/Amazon-Kinesis-Data-Streams': m('logos:aws-kinesis', 'analytics.KinesisDataStreams', 'aws_kinesis_stream'),
  'svc:Analytics/Amazon-Data-Firehose': m('logos:aws-kinesis', 'analytics.KinesisDataFirehose', 'aws_kinesis_firehose_delivery_stream'),
  'svc:Analytics/Amazon-Athena': m('logos:aws-athena', 'analytics.Athena', 'aws_athena_workgroup'),
  'svc:Analytics/AWS-Glue': m('logos:aws-glue', 'analytics.Glue', 'aws_glue_job'),
  'svc:Analytics/Amazon-EMR': m(null, 'analytics.EMR', 'aws_emr_cluster'),
  'svc:Analytics/Amazon-OpenSearch-Service': m('logos:aws-open-search', 'analytics.AmazonOpensearchService', 'aws_opensearch_domain'),
  'svc:Analytics/Amazon-Managed-Streaming-for-Apache-Kafka': m('logos:aws-msk', 'analytics.ManagedStreamingForKafka', 'aws_msk_cluster'),
  'svc:Analytics/AWS-Lake-Formation': m('logos:aws-lake-formation', 'analytics.LakeFormation', 'aws_lakeformation_resource'),
  'svc:Analytics/Amazon-SageMaker': m(null, 'ml.Sagemaker', 'aws_sagemaker_endpoint'),

  // Security, identity & compliance
  'svc:Security-Identity/AWS-Identity-and-Access-Management': m('logos:aws-iam', 'security.IAM', 'aws_iam_role'),
  'svc:Security-Identity/Amazon-Cognito': m('logos:aws-cognito', 'security.Cognito', 'aws_cognito_user_pool'),
  'svc:Security-Identity/AWS-Key-Management-Service': m('logos:aws-kms', 'security.KMS', 'aws_kms_key'),
  'svc:Security-Identity/AWS-Secrets-Manager': m('logos:aws-secrets-manager', 'security.SecretsManager', 'aws_secretsmanager_secret'),
  'svc:Security-Identity/AWS-WAF': m('logos:aws-waf', 'security.WAF', 'aws_wafv2_web_acl'),
  'svc:Security-Identity/AWS-Shield': m('logos:aws-shield', 'security.Shield', 'aws_shield_protection'),
  'svc:Security-Identity/AWS-Certificate-Manager': m('logos:aws-certificate-manager', 'security.CertificateManager', 'aws_acm_certificate'),
  'svc:Security-Identity/Amazon-GuardDuty': m(null, 'security.Guardduty', 'aws_guardduty_detector'),
  'svc:Security-Identity/AWS-Security-Hub': m(null, 'security.SecurityHub', 'aws_securityhub_account'),
  'svc:Security-Identity/AWS-Network-Firewall': m(null, 'network.NetworkFirewall', 'aws_networkfirewall_firewall'),

  // Management & governance
  'svc:Management-Tools/Amazon-CloudWatch': m('logos:aws-cloudwatch', 'management.Cloudwatch', 'aws_cloudwatch_log_group'),
  'svc:Management-Tools/AWS-CloudTrail': m('logos:aws-cloudtrail', 'management.Cloudtrail', 'aws_cloudtrail'),
  'svc:Management-Tools/AWS-CloudFormation': m('logos:aws-cloudformation', 'management.Cloudformation', 'aws_cloudformation_stack'),
  'svc:Management-Tools/AWS-Systems-Manager': m('logos:aws-systems-manager', 'management.SystemsManager', 'aws_ssm_parameter'),
  'svc:Management-Tools/AWS-Config': m('logos:aws-config', 'management.Config', 'aws_config_configuration_recorder'),

  // AI, front end, messaging, developer tools
  'svc:Artificial-Intelligence/Amazon-Bedrock': m(null, 'ml.Bedrock', null),
  'svc:Business-Applications/Amazon-Simple-Email-Service': m('logos:aws-ses', 'engagement.SES', 'aws_sesv2_email_identity'),
  'svc:Front-End-Web-Mobile/AWS-Amplify': m('logos:aws-amplify', 'mobile.Amplify', 'aws_amplify_app'),
  'svc:Developer-Tools/AWS-CodePipeline': m('logos:aws-codepipeline', 'devtools.Codepipeline', 'aws_codepipeline'),
  'svc:Developer-Tools/AWS-CodeBuild': m('logos:aws-codebuild', 'devtools.Codebuild', 'aws_codebuild_project'),
  'svc:Developer-Tools/AWS-CodeCommit': m('logos:aws-codecommit', 'devtools.Codecommit', 'aws_codecommit_repository'),
  'svc:Developer-Tools/AWS-CodeDeploy': m('logos:aws-codedeploy', 'devtools.Codedeploy', 'aws_codedeploy_app'),
  'svc:Developer-Tools/AWS-X-Ray': m('logos:aws-xray', 'devtools.XRay', 'aws_xray_group'),

  // General icons: external actors and generic infrastructure have no Terraform resource.
  'res:General-Icons/User': m('internet', 'general.User', null),
  'res:General-Icons/Users': m('internet', 'general.Users', null),
  'res:General-Icons/Authenticated-User': m('internet', 'general.User', null),
  'res:General-Icons/Client': m('internet', 'general.Client', null),
  'res:General-Icons/Mobile-client': m('internet', 'general.MobileClient', null),
  'res:General-Icons/Internet': m('internet', 'general.InternetAlt1', null),
  'res:General-Icons/Server': m('server', 'general.TraditionalServer', null),
  'res:General-Icons/Database': m('database', 'general.GenericDatabase', null),
  'res:General-Icons/Firewall': m(null, 'general.GenericFirewall', null),
}
