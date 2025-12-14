Langkah bikin SendGrid dynamic template (contoh)

1. Login ke SendGrid dashboard.
2. Menu: Email API -> Dynamic Templates -> Create Template.
3. Klik "Add Version" dan pilih "Design Editor" atau "Code Editor".
4. Salin contoh HTML dari `docs/sendgrid-license-template.json` ke template (sesuaikan placeholder `{{license_key}}`, `{{product_name}}`, `{{order_id}}`).
5. Simpan dan publish template, catat `Template ID`.
6. Set environment variables pada deployment:
   - `SENDGRID_API_KEY` = API key dari SendGrid
   - `SENDGRID_LICENSE_TEMPLATE_ID` = Template ID yang tadi
   - `EMAIL_FROM` = alamat pengirim

Contoh: di Linux/CI

```bash
export SENDGRID_API_KEY="SG.xxxx"
export SENDGRID_LICENSE_TEMPLATE_ID="d-1234567890abcdef"
export EMAIL_FROM="sales@example.com"
```

Setelah di-set, service akan mengirim email license menggunakan template saat license dibuat oleh webhook.
