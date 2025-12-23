const crypto = require('crypto');
const Webhook = require('../models/Webhook');

class WebhookService {
    static async dispatch(waitlistId, event, payload) {
        const webhooks = Webhook.getActiveForEvent(waitlistId, event);

        const results = await Promise.allSettled(
            webhooks.map(webhook => this.send(webhook, event, payload))
        );

        return results.map((result, index) => ({
            webhookId: webhooks[index].id,
            success: result.status === 'fulfilled',
            error: result.status === 'rejected' ? result.reason.message : null
        }));
    }

    static async send(webhook, event, payload) {
        const timestamp = Date.now();
        const signature = this.generateSignature(webhook.secret, timestamp, payload);

        const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Timestamp': timestamp.toString(),
                'X-Webhook-Event': event
            },
            body: JSON.stringify({
                event,
                timestamp,
                data: payload
            })
        });

        if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`);
        }

        return response;
    }

    static generateSignature(secret, timestamp, payload) {
        const data = `${timestamp}.${JSON.stringify(payload)}`;
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }

    static verifySignature(secret, signature, timestamp, payload) {
        const expectedSignature = this.generateSignature(secret, timestamp, payload);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }
}

module.exports = WebhookService;
