FROM sonarqube:10.9.0-community

USER root
RUN apt-get update && apt-get install -y wget
USER sonarqube
