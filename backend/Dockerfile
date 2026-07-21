# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Cache dependencies first (only re-runs if pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build the fat JAR, skipping tests
COPY src ./src
RUN mvn package -DskipTests -B

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

# Render injects PORT env var; Spring Boot reads SERVER_PORT
ENV SERVER_PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "-Dserver.port=${SERVER_PORT}", "app.jar"]
