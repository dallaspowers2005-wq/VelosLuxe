// Vapi API Helper — create and manage AI assistants

const VAPI_BASE = 'https://api.vapi.ai';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json'
  };
}

// Create a customized assistant for a client
async function createAssistant({ spaName, assistantName, services, hours, webhookSlug }) {
  const botName = assistantName || 'Sophia';

  const systemPrompt = `You are ${botName}, the AI receptionist for ${spaName}. You answer calls warmly, ask about treatment interests, describe services briefly, offer to book consultations, and collect preferred times. Services offered: ${services}. Hours: ${hours}. Never discuss pricing. Never give medical advice.

When the caller wants to book an appointment, collect their name, phone number, the service they're interested in, and their preferred date/time. Then use the bookAppointment function to book it for them. Confirm the booking details back to the caller.

When you've gathered the caller's contact info or interest, use the captureLeadInfo function to save their details so the team can follow up.`;

  const serverUrl = `${process.env.BASE_URL || 'https://velosluxe.com'}/api/vapi/webhook/${webhookSlug}`;

  // Tool definitions — these let the assistant take actions during a call
  const tools = [
    {
      type: 'function',
      function: {
        name: 'bookAppointment',
        description: 'Book an appointment for the caller at the spa. Use this when the caller wants to schedule a visit.',
        parameters: {
          type: 'object',
          properties: {
            customerName: {
              type: 'string',
              description: 'The caller\'s full name'
            },
            customerPhone: {
              type: 'string',
              description: 'The caller\'s phone number'
            },
            service: {
              type: 'string',
              description: 'The service or treatment they want to book'
            },
            preferredDate: {
              type: 'string',
              description: 'Their preferred date (YYYY-MM-DD format)'
            },
            preferredTime: {
              type: 'string',
              description: 'Their preferred time (e.g. "2:00 PM", "morning", "afternoon")'
            }
          },
          required: ['customerName', 'customerPhone', 'service']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'captureLeadInfo',
        description: 'Save the caller\'s contact info and interests so the team can follow up. Use this when you learn the caller\'s name, what they\'re interested in, or any relevant details.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The caller\'s name'
            },
            phone: {
              type: 'string',
              description: 'The caller\'s phone number'
            },
            email: {
              type: 'string',
              description: 'The caller\'s email if provided'
            },
            interest: {
              type: 'string',
              description: 'What service or treatment they\'re interested in'
            },
            notes: {
              type: 'string',
              description: 'Any other relevant details from the conversation'
            }
          },
          required: ['name']
        }
      }
    }
  ];

  const res = await fetch(`${VAPI_BASE}/assistant`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: `${botName} - ${spaName}`,
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        tools
      },
      voice: {
        provider: '11labs',
        voiceId: 'EXAVITQu4vr4xnSDxMaL'
      },
      serverUrl,
      firstMessage: `Hi, thank you for calling ${spaName}! This is ${botName}, how can I help you today?`
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Vapi createAssistant failed: ${err.message || JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.id;
}

// Assign a phone number to an assistant
async function assignPhoneNumber(phoneNumberId, assistantId) {
  const res = await fetch(`${VAPI_BASE}/phone-number/${phoneNumberId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ assistantId })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Vapi assignPhoneNumber failed: ${err.message || JSON.stringify(err)}`);
  }

  return await res.json();
}

// List all phone numbers in the Vapi account
async function listPhoneNumbers() {
  const res = await fetch(`${VAPI_BASE}/phone-number`, {
    headers: getHeaders()
  });

  if (!res.ok) throw new Error('Failed to list Vapi phone numbers');
  return await res.json();
}

// List unassigned phone numbers
async function listAvailableNumbers() {
  const numbers = await listPhoneNumbers();
  return numbers.filter(n => !n.assistantId);
}

// Fetch recent calls (for poll loop)
async function fetchCalls(limit = 20) {
  const res = await fetch(`${VAPI_BASE}/call?limit=${limit}`, {
    headers: getHeaders()
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

module.exports = {
  createAssistant,
  assignPhoneNumber,
  listPhoneNumbers,
  listAvailableNumbers,
  fetchCalls
};
