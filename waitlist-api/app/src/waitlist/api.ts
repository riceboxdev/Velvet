import { MiddlewareConfigFn } from 'wasp/server'
import { v4 as uuidv4 } from 'uuid'

export const submitWaitlistEntry = async (req, res, context) => {
    const apiKey = req.headers['x-api-key'] || req.body.apiKey
    const { email, tier } = req.body

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing API Key' })
    }

    const integrationKey = await context.entities.IntegrationKey.findUnique({
        where: { key: apiKey },
        include: { user: true }
    })

    if (!integrationKey) {
        return res.status(401).json({ error: 'Invalid API Key' })
    }

    try {
        const existing = await context.entities.WaitlistEntry.findUnique({
            where: { email }
        })

        if (existing) {
            return res.status(400).json({ error: 'Email already on waitlist' })
        }

        const entry = await context.entities.WaitlistEntry.create({
            data: {
                email,
                tier: tier || 'free',
                source: 'api',
                status: 'pending',
                user: { connect: { id: integrationKey.user.id } } // Link to API key owner if desired, or maybe just track source
            }
        })

        // Update last used
        await context.entities.IntegrationKey.update({
            where: { id: integrationKey.id },
            data: { lastUsedAt: new Date() }
        })

        return res.json({ success: true, entry })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}
