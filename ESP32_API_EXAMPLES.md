# ESP32 API curl examples

Replace `https://your-domain.example` and `your-token` before testing.

```bash
curl -X POST 'https://your-domain.example/api/smartpet/status' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your-token' \
  -d '{"device":"smartpet-01","mode":"website","power":"NORMAL","emotion":5,"food":"HUNGRY","remain":0,"motion":"NULL","uptime_ms":123456}'
```

```bash
curl 'https://your-domain.example/api/smartpet/command?device=smartpet-01' \
  -H 'Authorization: Bearer your-token'
```

```bash
curl -X POST 'https://your-domain.example/api/smartpet/ack' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your-token' \
  -d '{"device":"smartpet-01","id":"cmd-1001","command":"setmot 4","result":"OK"}'
```
