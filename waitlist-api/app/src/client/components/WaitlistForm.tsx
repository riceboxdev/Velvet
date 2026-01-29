import { useState } from 'react'
import { addToWaitlist } from 'wasp/client/operations'
import { useForm } from 'react-hook-form'
import { Button } from './ui/button'

export default function WaitlistForm() {
    const { register, handleSubmit, reset } = useForm<{ email: string }>()
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [error, setError] = useState('')

    const onSubmit = async (data: { email: string }) => {
        setStatus('loading')
        try {
            await addToWaitlist({ email: data.email, source: 'landing' })
            setStatus('success')
            reset()
        } catch (err: any) {
            setError(err.message)
            setStatus('error')
        }
    }

    if (status === 'success') {
        return <div className="text-green-600 font-semibold p-4 bg-green-50 rounded-lg border border-green-200">Thanks for joining the waitlist! We'll stay in touch.</div>
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4 sm:flex-row justify-center max-w-md mx-auto">
            <div className='w-full'>
                <input
                    {...register('email', { required: true })}
                    type="email"
                    placeholder="Enter your email"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={status === 'loading'}
                />
                {status === 'error' && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <Button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
            </Button>
        </form>
    )
}
