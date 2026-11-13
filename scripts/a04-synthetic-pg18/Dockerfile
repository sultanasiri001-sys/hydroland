# Official PostgreSQL major-pinned base; CI records its resolved digest.
FROM postgres:18-bookworm
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
USER postgres
WORKDIR /tests
ENTRYPOINT ["python3"]
