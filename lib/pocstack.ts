import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { aws_kinesisanalyticsv2 as kinesisanalyticsv2 } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';

export class PocStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // Create an S3 bucket to store the Flink application JAR
    const flinkBucket = new s3.Bucket(this, 'FlinkBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For testing; use RETAIN in production
      autoDeleteObjects: true, // Clean up on stack deletion
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
    });

    /**
    // Deploy application jar in the s3 bucket
    const flinkappCode = new s3deploy.BucketDeployment(this, 'flinkappCode', {
      sources: [s3deploy.Source.asset('./src/target/flinkapp.zip')],
      destinationBucket: flinkBucket,
      destinationKeyPrefix: 'flinkapp/', // optional prefix in destination bucket
    });

   */

    // Define the IAM role for the Flink application
    const flinkExecutionRole = new iam.Role(this, 'FlinkExecutionRole', {
      assumedBy: new iam.ServicePrincipal('kinesisanalytics.amazonaws.com'),
    });

    // Grant necessary permissions to the role
    flinkBucket.grantRead(flinkExecutionRole); // Allow reading the JAR
    flinkExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:PutLogEvents',
        'logs:CreateLogStream',
        'logs:CreateLogGroup',
      ],
      resources: ['arn:aws:logs:*:*:*'], // CloudWatch Logs access
    }));

    // Create a Kinesis Data Stream
    const KafkaStream = new kinesis.Stream(this, 'KafkaStream', {
      streamName: 'kafka-stream',
      shardCount: 1, // Adjust based on throughput needs
    });

     const flinkApp = new kinesisanalyticsv2.CfnApplication(this, 'flinkApp', {
         runtimeEnvironment: 'FLINK-1_18',
         serviceExecutionRole: flinkExecutionRole.roleArn,
         applicationConfiguration: {
           applicationCodeConfiguration: {
             codeContent: {
               s3ContentLocation: {
                  bucketArn: flinkBucket.bucketArn,
                  fileKey: 'flinkapp-1.0-SNAPSHOT.jar',
               }},
             codeContentType: 'ZIPFILE',
           },
        flinkApplicationConfiguration: {
          parallelismConfiguration: {
            configurationType: 'CUSTOM',
            parallelism: 1,
            parallelismPerKpu: 1,
            autoScalingEnabled: false,
          },
          checkpointConfiguration: {
            configurationType: 'DEFAULT',
          },
          monitoringConfiguration: {
            configurationType: 'CUSTOM',
            metricsLevel: 'APPLICATION',
            logLevel: 'INFO',
          },
        },
           environmentProperties: {
             propertyGroups: [
               {
                propertyGroupId: 'FlinkApplicationProperties',
                propertyMap: {
                  'ProgramClass': 'com.flink.main', // Specify the program class here
           }}]}},

    });
  }
}
