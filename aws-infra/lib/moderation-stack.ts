import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Duration } from "aws-cdk-lib";

interface ModerationStackProps extends cdk.StackProps {
  bucket: s3.IBucket;
}

export class ModerationStack extends cdk.Stack {
  public readonly moderationQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: ModerationStackProps) {
    super(scope, id, props);

    const { bucket } = props;

    // -------------------------------------------------------------------
    // DLQ + main moderation queue
    // -------------------------------------------------------------------
    const moderationDlq = new sqs.Queue(this, "ModerationDlq", {
      retentionPeriod: Duration.days(14),
    });

    this.moderationQueue = new sqs.Queue(this, "ModerationQueue", {
      visibilityTimeout: Duration.seconds(180), // 6x Lambda timeout
      retentionPeriod: Duration.days(4),
      deadLetterQueue: {
        queue: moderationDlq,
        maxReceiveCount: 3,
      },
    });

    // -------------------------------------------------------------------
    // Moderation Lambda
    // -------------------------------------------------------------------
    const moderationFn = new lambda.NodejsFunction(this, "ModerationFn", {
      entry: "lambda/moderation/index.ts",
      handler: "handler",
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      architecture: cdk.aws_lambda.Architecture.X86_64,
      memorySize: 512,
      timeout: Duration.seconds(30),
      bundling: {
        forceDockerBundling: false,
        nodeModules: ["pg", "sharp"],
      },
      environment: {
        SOURCE_BUCKET: bucket.bucketName,
        REKOGNITION_REGION: "ap-south-1", // Rekognition not available in ap-south-2
      },
    });

    // -------------------------------------------------------------------
    // Event Source Mapping: SQS -> Lambda
    // -------------------------------------------------------------------
    moderationFn.addEventSource(
      new lambdaEventSources.SqsEventSource(this.moderationQueue, {
        batchSize: 5,
        reportBatchItemFailures: true,
      })
    );

    // -------------------------------------------------------------------
    // IAM
    // -------------------------------------------------------------------

    // Read processed images
    bucket.grantRead(moderationFn, "processed/*");

    // Rekognition — DetectModerationLabels has no resource-level ARN scoping
    moderationFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rekognition:DetectModerationLabels"],
        resources: ["*"],
      })
    );

    // Consume moderation queue
    this.moderationQueue.grantConsumeMessages(moderationFn);

    // Postgres secret
    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "PostgresSecret",
      "postgres-credentials"
    );
    dbSecret.grantRead(moderationFn);
    moderationFn.addEnvironment("DB_SECRET_ARN", "postgres-credentials");

    // Groq secret
    const groqSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "GroqSecret",
      "groq-api-key"
    );
    groqSecret.grantRead(moderationFn);
    moderationFn.addEnvironment("GROQ_SECRET_ARN", "groq-api-key");

    // CloudWatch Logs — granted automatically by NodejsFunction's default role

    // -------------------------------------------------------------------
    // Outputs
    // -------------------------------------------------------------------
    new cdk.CfnOutput(this, "ModerationQueueUrl", { value: this.moderationQueue.queueUrl });
    new cdk.CfnOutput(this, "ModerationQueueArn", { value: this.moderationQueue.queueArn });
    new cdk.CfnOutput(this, "ModerationLambdaArn", { value: moderationFn.functionArn });
  }
}