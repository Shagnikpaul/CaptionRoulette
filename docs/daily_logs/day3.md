## 03-06-2026

* Created an AWS S3 bucket and IAM user with restricted bucket permissions.
* Generated AWS access credentials and configured backend environment variables.
* Added and configured the AWS SDK for S3.
* Created the S3 configuration and client bean.
* Implemented a dedicated storage service for S3 operations.
* Designed a unique object key strategy using UUID-based filenames.
* Created request and response DTOs for image upload.
* Implemented the `ImageController`.
* Added the authenticated endpoint:

  * `POST /api/images/presign`
* Protected the pre-sign endpoint using JWT authentication.
* Added validation for upload metadata, including supported image types and size limits.
* Verified backend generation of unique pre-signed upload URLs.
* Built a reusable frontend image upload component.
* Implemented the frontend API call for requesting pre-signed URLs.
* Implemented the direct browser-to-S3 upload flow.
* Added image preview, upload progress, loading states, success messages, and upload error handling.
* Stored the returned `objectKey` in frontend state for future post creation.
* Verified successful direct uploads to AWS S3 and confirmed uploaded objects appeared in the bucket.
* Confirmed the backend never handled image bytes, following the direct-to-storage architecture.
