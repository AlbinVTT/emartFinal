FROM openjdk:17-slim

# Set working directory
WORKDIR /app

# Install curl and unzip to download JARs
RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*

# Download required JARs
RUN mkdir -p libs && \
    curl -o libs/postgresql.jar https://jdbc.postgresql.org/download/postgresql-42.7.3.jar && \
    curl -o libs/json.jar https://repo1.maven.org/maven2/org/json/json/20231013/json-20231013.jar

# Copy Java source code
COPY src ./src

# Compile Java code
RUN javac -cp "libs/*" -d out src/LedgerService.java

# Run the Java app
CMD ["java", "-cp", "out:libs/*", "LedgerService"]
