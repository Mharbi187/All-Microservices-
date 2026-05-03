# Use official Maven image to build the app
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace/app

# Copy the pom.xml and source code
COPY pom.xml .
COPY src src

# Build the application
RUN mvn -B package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-jammy
VOLUME /tmp
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /workspace/app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Entrypoint
ENTRYPOINT ["java", "-jar", "app.jar"]
