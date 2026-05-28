# Regression Commands

## Local Bootstrap

```bash
npm run setup:mysql
cd server
mvn spring-boot:run
```

In another shell:

```bash
npm run dev
```

## Fast Backend Smoke

```bash
npm run smoke:mysql-backend
```

## Full Backend And AI Sweep

```bash
bash scripts/full_stack_check.sh
```

Override local targets if needed:

```bash
API_BASE=http://127.0.0.1:8088/api FRONT_BASE=http://127.0.0.1:5175 bash scripts/full_stack_check.sh
```

## Chrome CDP Setup

Example Chrome launch:

```bash
google-chrome --remote-debugging-port=9222 about:blank
```

If the environment uses a different Chrome binary, use the local equivalent.

## Hosted Browser Regression Examples

### Patient signup/login

```bash
node scripts/cdp-smoke.mjs auth https://jp.jerrypsy.top/xinyu-care/
```

### Assessment full flow

```bash
node scripts/cdp-smoke.mjs assessment-full https://jp.jerrypsy.top/xinyu-care/ <username> <password>
```

### Health report history switching

```bash
node scripts/cdp-smoke.mjs health-report-history https://jp.jerrypsy.top/xinyu-care/ <username> <password>
```

### Personal info persistence

```bash
node scripts/cdp-smoke.mjs personal-info https://jp.jerrypsy.top/xinyu-care/ <username> <password>
```

### Record update persistence

```bash
node scripts/cdp-smoke.mjs record-update https://jp.jerrypsy.top/xinyu-care/ <username> <password>
```

### Smart-band persistence

```bash
node scripts/cdp-smoke.mjs smartband-persistence https://jp.jerrypsy.top/xinyu-care/ <username> <password>
```

### Profile asset upload

```bash
node scripts/cdp-smoke.mjs profile-assets https://jp.jerrypsy.top/xinyu-care/ <username> <password> /root/jerry/xinyu-care/app/public/srcs/img/1.png /root/jerry/xinyu-care/app/public/srcs/img/2.png
```

### Doctor dashboard audit

```bash
node scripts/cdp-smoke.mjs doctor-dashboard-audit https://jp.jerrypsy.top/xinyu-care/ <doctor_username> <password>
```

### Doctor patient tabs

```bash
node scripts/cdp-smoke.mjs doctor-patient-tabs https://jp.jerrypsy.top/xinyu-care/ <doctor_username> <password>
```

### Doctor alert handling

```bash
node scripts/cdp-smoke.mjs doctor-alert-handle https://jp.jerrypsy.top/xinyu-care/ <doctor_username> <password>
```

### Doctor signup via verification code

```bash
node scripts/cdp-smoke.mjs doctor-code-signup https://jp.jerrypsy.top/xinyu-care/ <doctor_username> <password>
```

### Doctor verification code delete

```bash
node scripts/cdp-smoke.mjs doctor-code-delete https://jp.jerrypsy.top/xinyu-care/ <doctor_username> <password>
```

### Doctor knowledge CRUD

```bash
node scripts/cdp-smoke.mjs doctor-knowledge-crud https://jp.jerrypsy.top/xinyu-care/ <doctor_username> <password> /root/jerry/xinyu-care/app/README.md
```

## Serial Execution Reminder

Do not run multiple CDP scenarios against the same Chrome target in parallel. Use one scenario at a time, wait for it to exit, then run the next one.
