# n8n Workflow Setup Guide

## What's in here

| File | Purpose |
|------|---------|
| `velosluxe-sheets-capture.json` | Captures demo form leads (name, email, spa) → Google Sheets |
| `velosluxe-ai-receptionist.json` | Call requests → Google Sheets + triggers Vapi outbound call |

## Webhook URLs (already hardcoded in website)

- Sheets: `https://d1-allas.app.n8n.cloud/webhook/velosluxe-sheets`
- Call: `https://d1-allas.app.n8n.cloud/webhook/velosluxe-call`

## Vapi Resources (already created)

- **Assistant ID:** `27f1960c-a5e6-48d8-a0ca-3e6da698eb52`
- **Phone Number ID:** `d28c8a9f-b051-4a92-b074-c3df7c47c526`
- **Assistant Name:** Sophia (VelosLuxe AI Receptionist)

## Setup Steps

### 1. Create your Google Sheet

Create a new Google Sheet with two tabs:

**Tab 1: "Demo Leads"** — columns:
| name | email | spa_name | source | timestamp |

**Tab 2: "Call Requests"** — columns:
| name | phone | source | timestamp |

### 2. Import workflows into n8n

1. Go to your n8n Cloud dashboard
2. Click **Add workflow** → **Import from file**
3. Import `velosluxe-sheets-capture.json`
4. Import `velosluxe-ai-receptionist.json`

### 3. Configure Sheets Capture workflow

1. Open the **Google Sheets — Append Lead** node
2. Select your Google Sheets credential
3. Pick your spreadsheet and the "Demo Leads" tab
4. Save and **Activate** the workflow

### 4. Configure AI Receptionist workflow

1. **Create an HTTP Header Auth credential in n8n:**
   - Go to **Credentials** → **Add Credential** → search "Header Auth"
   - Name: `Vapi API Key`
   - Header Name: `Authorization`
   - Header Value: `Bearer 0847dc3a-0353-4592-9e4c-6616a83214af`
   - Save

2. Open the **Google Sheets — Log Call** node
   - Select your Google Sheets credential
   - Pick your spreadsheet and the "Call Requests" tab

3. Open the **Vapi — Trigger Outbound Call** node
   - Select the "Vapi API Key" credential you just created

4. Save and **Activate** the workflow

### 5. Test it

1. Open your website and go to the "Call Our AI Receptionist" section
2. Enter your name and phone number
3. Hit "Call Me Now"
4. Your phone should ring within 60 seconds with Sophia on the line
5. Check your Google Sheet — the call request should appear

## How the AI Receptionist works

**Sophia** (the AI) will:
- Greet the caller by name
- Ask what treatment they're interested in
- Describe the treatment briefly
- Offer to book a consultation
- Collect preferred day/time
- Confirm details and say the team will follow up via text
- Never discuss specific pricing (says it's personalized)
- Never give medical advice (redirects to consultation)

The assistant can be customized anytime in your Vapi dashboard under Assistants → "VelosLuxe AI Receptionist".
