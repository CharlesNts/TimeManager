# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copie et téléchargement des dépendances (mise en cache)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copie du code source et build
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup -S spring && adduser -S spring -G spring

# Copie du JAR depuis le build stage
COPY --from=build /app/target/*.jar app.jar

# On change le propriétaire du fichier
RUN chown spring:spring app.jar

USER spring

EXPOSE 8080

# Variables d'environnement pour la JVM
ENV JAVA_OPTS="-Xmx512m -Xms256m"

# Commande de démarrage avec les options JVM
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]