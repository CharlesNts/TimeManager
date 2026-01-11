#!/bin/bash

# Script pour analyser le projet avec SonarCloud
# Usage: ./analyze-sonarcloud.sh [backend|frontend|all]
#
# Prérequis:
# - Variable d'environnement SONAR_TOKEN doit être définie
# - Pour le frontend: sonar-scanner doit être installé

set -e

SONAR_HOST="https://sonarcloud.io"

echo "==================================="
echo "  Analyse SonarCloud TimeManager"
echo "==================================="
echo ""

# Vérifier le token
if [ -z "$SONAR_TOKEN" ]; then
    echo "❌ ERREUR: La variable d'environnement SONAR_TOKEN n'est pas définie"
    echo ""
    echo "Pour définir le token:"
    echo "  export SONAR_TOKEN=votre_token_sonarcloud"
    echo ""
    echo "Pour obtenir un token:"
    echo "  1. Connectez-vous à https://sonarcloud.io"
    echo "  2. Allez dans Account > Security"
    echo "  3. Générez un nouveau token"
    exit 1
fi

echo "✅ Token SonarCloud détecté"
echo ""

# Fonction pour analyser le backend
analyze_backend() {
    echo "📊 Analyse du Backend Java..."
    echo "-------------------------------"
    cd backend/TimeManager1

    # Compilation et analyse avec Maven
    echo "Compilation et analyse du projet Maven..."
    mvn clean verify sonar:sonar -Dsonar.token=$SONAR_TOKEN

    cd ../..
    echo "✅ Analyse du backend terminée"
    echo ""
}

# Fonction pour analyser le frontend
analyze_frontend() {
    echo "📊 Analyse du Frontend React..."
    echo "--------------------------------"
    cd frontend

    # Vérifier si sonar-scanner est installé
    if ! command -v sonar-scanner &> /dev/null; then
        echo "❌ ERREUR: sonar-scanner n'est pas installé"
        echo ""
        echo "Installation requise:"
        echo "  - Windows: Téléchargez depuis https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/sonarscanner-cli/"
        echo "  - Linux: sudo apt install sonar-scanner"
        echo "  - macOS: brew install sonar-scanner"
        echo ""
        echo "Alternative: Utilisez le conteneur Docker:"
        echo "  docker run --rm -v \"\$(pwd):/usr/src\" -e SONAR_TOKEN=\$SONAR_TOKEN sonarsource/sonar-scanner-cli"
        cd ..
        exit 1
    fi

    # Installation des dépendances npm si nécessaire
    if [ ! -d "node_modules" ]; then
        echo "Installation des dépendances npm..."
        npm ci
    fi

    # Analyse SonarCloud
    echo "Lancement de l'analyse SonarCloud..."
    sonar-scanner -Dsonar.token=$SONAR_TOKEN

    cd ..
    echo "✅ Analyse du frontend terminée"
    echo ""
}

# Traiter les arguments
case "${1:-all}" in
    backend)
        analyze_backend
        ;;
    frontend)
        analyze_frontend
        ;;
    all)
        analyze_backend
        analyze_frontend
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

echo "==================================="
echo "✅ Analyse terminée avec succès!"
echo "==================================="
echo ""
echo "Consultez les résultats sur SonarCloud:"
echo "  https://sonarcloud.io/project/overview?id=CharlesNts_TimeManager"
echo ""
