FROM postgres:12.2

ARG POSTGRES_USER=servicemind
ARG POSTGRES_PASSWORD=password
ARG POSTGRES_DB=tis_database

ENV POSTGRES_USER=$POSTGRES_USER
ENV POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ENV POSTGRES_DB=$POSTGRES_DB

# COPY init.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
