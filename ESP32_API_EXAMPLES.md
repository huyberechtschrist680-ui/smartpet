# ESP32 sync API curl examples

Replace `https://your-domain.example` and `your-token` before testing.

## Sync without ACK

```bash
curl -X POST 'https://your-domain.example/api/smartpet/sync' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your-token' \
  -d '{"device":"smartpet-01","heartbeat":true,"mode":"website","uptime_ms":123456,"status":{"power":"NORMAL","emotion":5,"food":"HUNGRY","remain":0,"motion":"NULL"},"ack":null}'
```

Expected response when there is no command:

```json
{
  "ok": true,
  "online": true,
  "command": null
}
```

## Sync with ACK

```bash
curl -X POST 'https://your-domain.example/api/smartpet/sync' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your-token' \
  -d '{"device":"smartpet-01","heartbeat":true,"mode":"website","uptime_ms":123456,"status":{"power":"NORMAL","emotion":6,"food":"FULL","remain":118,"motion":"FOWD"},"ack":{"id":"cmd-001","command":"setmot 4","result":"OK"}}'
```

Expected response when a command is waiting:

```json
{
  "ok": true,
  "online": true,
  "command": {
    "id": "cmd-002",
    "text": "touch"
  }
}
```

The older `/api/smartpet/status`, `/api/smartpet/command`, and `/api/smartpet/ack` endpoints are still present for compatibility, but new ESP32 firmware should use `/api/smartpet/sync`.
