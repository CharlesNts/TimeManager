# Rapport sur l'approche du projet *Time Manager*

Ce document résume l’approche décidée pour le développement du projet **Time Manager**.

---

## 1. 🎯 Objectif du projet

Le projet **Time Manager** est une application de gestion du temps permettant :
- aux **employés** de saisir leurs heures d’arrivée et de départ,
- aux **managers** de gérer leurs équipes,
- et à l’entreprise de suivre les **indicateurs de performance (KPIs)**.

---

## 2. ⚙️ Architecture générale

- **Backend :** Spring Boot (Java) — API RESTful.  
- **Frontend :** React.js — déployé sur **Vercel**.  
- **Base de données :** PostgreSQL (conteneurisée avec Docker).  
- **DevOps :** GitHub Actions pour l’intégration continue (build, tests, couverture).  
- **Reverse Proxy :** Nginx pour router les requêtes et exposer le backend publiquement.  

---

## 3. 🧩 Approche choisie

- **Application monolithique modulaire :**  
  Le backend est un monolithe structuré en modules (utilisateurs, équipes, pointages, rapports).

- **Architecture REST :**  
  Toutes les interactions entre le frontend et le backend se font via des endpoints REST sécurisés avec **JWT**.

- **CORS :**  
  Géré via la configuration Spring ou via un proxy côté Vercel (`vercel.json` rewrite).

- **Pipeline CI/CD :**  
  GitHub Actions compile, teste et déploie automatiquement le backend.

- **Déploiement frontend :**  
  Vercel construit et déploie automatiquement le frontend à chaque push sur `main`.

---

## 4. 💡 Justification des choix techniques

- **REST** plutôt que **GraphQL** → plus simple, plus rapide à implémenter, adapté à la structure CRUD du projet.  
- **Architecture monolithique** plutôt que microservices → plus cohérente pour un projet de cette taille et plus simple à déployer.  
- **Vercel** pour le frontend → gratuit, rapide, optimisé pour React.  
- **Docker** pour le backend → standardise les environnements et simplifie la mise en production.  

---

## 5. 🚀 Plan de déploiement

1. **Backend + Base de données** : déployés via **Docker Compose** sur un serveur distant (ou cloud).  
2. **Nginx** : agit comme **reverse proxy**, exposant l’API publique via HTTPS (Let’s Encrypt).  
3. **Frontend (React)** : déployé sur **Vercel**, communique avec l’API via une URL publique (`https://api.mondomaine.com/api/...`)  
   ou via un rewrite proxy (`vercel.json`) pour éviter les problèmes de CORS.  

---

## 6. 🧰 Stack technique finale

| Composant | Technologies principales |
|------------|---------------------------|
| **Backend** | Spring Boot, Java 17, Spring Security, JWT, PostgreSQL |
| **Frontend** | React.js, Axios, JWT token management, Vercel |
| **DevOps** | GitHub Actions, Docker, Nginx |

