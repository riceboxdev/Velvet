// import { AddToWaitlist, GenerateApiKey } from '@wasp/actions/types'
// import { GetWaitlist } from '@wasp/queries/types'

import { HttpError } from 'wasp/server'
import { v4 as uuidv4 } from 'uuid'

type AddToWaitlistArgs = { email: string; tier?: string; source?: string }

export const addToWaitlist = async ({ email, tier, source }: any, context: any) => {
    const existing = await context.entities.WaitlistEntry.findUnique({
        where: { email }
    })
    if (existing) {
        throw new HttpError(400, 'Email already on waitlist')
    }
    await context.entities.WaitlistEntry.create({
        data: {
            email,
            tier: tier || 'free',
            source: source || 'web',
            status: 'pending'
        }
    })
}

export const generateApiKey = async (args: any, context: any) => {
    if (!context.user) {
        throw new HttpError(401, 'Must be logged in')
    }
    const key = `sk_live_${uuidv4()}`
    await context.entities.IntegrationKey.create({
        data: {
            key,
            label: 'Default Key',
            user: { connect: { id: context.user.id } }
        }
    })
    return key
}

export const getWaitlist = async (args: any, context: any) => {
    if (!context.user) {
        throw new HttpError(401, 'Must be logged in')
    }
    return context.entities.WaitlistEntry.findMany({
        orderBy: { createdAt: 'desc' }
    })
}
