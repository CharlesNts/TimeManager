FROM sonarqube:community

USER root
RUN apt-get update && apt-get install -y wget
USER sonarqube
