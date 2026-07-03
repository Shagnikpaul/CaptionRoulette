package org.shagnik.backend.dto;

public class ImageUploadResponse {

    private String objectKey;
    private String uploadUrl;
    private String httpMethod;

    public ImageUploadResponse(String objectKey, String uploadUrl, String httpMethod) {
        this.objectKey = objectKey;
        this.uploadUrl = uploadUrl;
        this.httpMethod = httpMethod;
    }

    public String getObjectKey() { return objectKey; }
    public String getUploadUrl() { return uploadUrl; }
    public String getHttpMethod() { return httpMethod; }
}