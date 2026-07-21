#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StorageStack } from "../lib/storage-stack";
import { ImageProcessingStack } from "../lib/image-processing-stack";
import { ModerationStack } from "../lib/moderation-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const storageStack = new StorageStack(app, "StorageStack", { env });

const moderationStack = new ModerationStack(app, "ModerationStack", {
  env,
  bucket: storageStack.bucket,
});

new ImageProcessingStack(app, "ImageProcessingStack", {
  env,
  bucket: storageStack.bucket,
  moderationQueue: moderationStack.moderationQueue,
});
