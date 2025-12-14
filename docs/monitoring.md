# Monitoring and Alerts

This project can be monitored with a lightweight Prometheus + Grafana stack.

Recommendations:

- Expose `/metrics` (already implemented via `prom-client`).
- Run a Prometheus instance scraping the service's `/metrics` endpoint.
- Create Grafana dashboards for request rate, error rate, CPU/memory.
- Add alert rules for high error rate and downtime; integrate with PagerDuty/Slack.

Quickstart (Prometheus config snippet):

```
scrape_configs:
  - job_name: 'microservice'
    static_configs:
      - targets: ['my-service.example.com:80']
    metrics_path: /metrics
```

Backups & Retention:

- Use `scripts/db-backup.sh` to copy and optionally upload DB backups to S3.
- Schedule backups via GitHub Actions or a cron job on your infrastructure.

Logging:

- App uses `winston`. Forward logs to a centralized logging backend (Elasticsearch/Logz.io/Datadog).

