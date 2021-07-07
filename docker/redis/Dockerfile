FROM redis:6.2

COPY redis.conf /usr/local/etc/redis/redis.conf

COPY ./scripts/docker-healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-healthcheck.sh

HEALTHCHECK CMD ["docker-healthcheck.sh"]

CMD [ "redis-server", "/usr/local/etc/redis/redis.conf", "--bind", "0.0.0.0", "--port", "6379"]

EXPOSE 6379