import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Duration } from "aws-cdk-lib";



interface ImageProcessingStackProps extends cdk.StackProps {
  bucket: s3.IBucket;
}

export class ImageProcessingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ImageProcessingStackProps) {
    super(scope, id, props);

    const { bucket } = props;

    // -------------------------------------------------------------------
    // DLQ + main queue
    // -------------------------------------------------------------------
    const imageProcessingDlq = new sqs.Queue(this, "ImageProcessingDlq", {
      retentionPeriod: Duration.days(14),
    });

    const imageProcessingQueue = new sqs.Queue(this, "ImageProcessingQueue", {
      visibilityTimeout: Duration.seconds(180), // 6x Lambda timeout
      retentionPeriod: Duration.days(4),
      deadLetterQueue: {
        queue: imageProcessingDlq,
        maxReceiveCount: 3,
      },
    });

    // -------------------------------------------------------------------
    // Lambda (stub handler for now)
    // -------------------------------------------------------------------
    const imageProcessorFn = new lambda.NodejsFunction(this, "ImageProcessorFn", {
      entry: "lambda/image-processor/index.ts",
      handler: "handler",
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      architecture: cdk.aws_lambda.Architecture.X86_64,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      bundling: {
        forceDockerBundling: false,
        nodeModules: ["sharp", "pg"],
      },
      environment: {
        SOURCE_BUCKET: bucket.bucketName,
        PROCESSED_PREFIX: "processed/",
        THUMBNAILS_PREFIX: "thumbnails/",
      },
    });

    // -------------------------------------------------------------------
    // Event Source Mapping: SQS -> Lambda
    // -------------------------------------------------------------------
    imageProcessorFn.addEventSource(
      new lambdaEventSources.SqsEventSource(imageProcessingQueue, {
        batchSize: 5,
        reportBatchItemFailures: true,
      })
    );

    // -------------------------------------------------------------------
    // S3 -> SQS notification, scoped to users/ only
    // -------------------------------------------------------------------
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(imageProcessingQueue),
      { prefix: "users/" }
    );

    // -------------------------------------------------------------------
    // IAM
    // -------------------------------------------------------------------
    bucket.grantRead(imageProcessorFn, "users/*");
    bucket.grantWrite(imageProcessorFn, "processed/*");
    bucket.grantWrite(imageProcessorFn, "thumbnails/*");
    imageProcessingQueue.grantConsumeMessages(imageProcessorFn);

    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "PostgresSecret",
      "postgres-credentials" // update to your actual secret name
    );
    dbSecret.grantRead(imageProcessorFn);
    imageProcessorFn.addEnvironment("DB_SECRET_ARN", dbSecret.secretArn);

    // CloudWatch Logs permissions are already granted automatically
    // via NodejsFunction's default execution role — no extra policy needed.

    // -------------------------------------------------------------------
    // Outputs
    // -------------------------------------------------------------------
    new cdk.CfnOutput(this, "QueueUrl", { value: imageProcessingQueue.queueUrl });
    new cdk.CfnOutput(this, "QueueArn", { value: imageProcessingQueue.queueArn });
    new cdk.CfnOutput(this, "LambdaArn", { value: imageProcessorFn.functionArn });
  }
}