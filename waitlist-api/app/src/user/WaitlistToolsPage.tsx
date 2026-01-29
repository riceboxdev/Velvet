import { generateApiKey, getWaitlist } from 'wasp/client/operations'
import { useQuery, useAction } from 'wasp/client/operations'
import { Button } from '../client/components/ui/button'
import { useState } from 'react'

export default function WaitlistToolsPage() {
    const { data: entries, isLoading, refetch } = useQuery(getWaitlist)
    const generateApiKeyAction = useAction(generateApiKey)
    const [apiKey, setApiKey] = useState<string | null>(null)

    const handleGenerateKey = async () => {
        const key = await generateApiKeyAction({}) as string
        setApiKey(key)
        alert(`Your new API Key: ${key}`)
    }

    // Determine existing API key state - tricky as we didn't expose a query to get existing keys.
    // For MVP we just allow generating new ones or assume the user saves it.
    // Ideally we should list existing keys.

    return (
        <div className='p-8'>
            <h1 className='text-3xl font-bold mb-6'>Waitlist Tools</h1>

            <div className='mb-8 p-6 bg-card border rounded-lg shadow-sm'>
                <h2 className='text-xl font-semibold mb-4'>API Integration</h2>
                <p className='mb-4 text-muted-foreground'>Generate an API key to submit waitlist entries programmatically from your own apps.</p>
                <div className='flex items-center gap-4'>
                    <Button onClick={handleGenerateKey}>Generate New API Key</Button>
                    {apiKey && <code className='bg-muted p-2 rounded'>{apiKey}</code>}
                </div>
            </div>

            <div className='bg-card border rounded-lg shadow-sm overflow-hidden'>
                <div className='p-6 border-b'>
                    <h2 className='text-xl font-semibold'>Waitlist Entries</h2>
                </div>
                {isLoading ? (
                    <div className='p-6'>Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Source</th>
                                    <th className="px-6 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(entries as any[])?.map((entry: any) => (
                                    <tr key={entry.id} className="bg-background border-b hover:bg-muted/50">
                                        <td className="px-6 py-4 font-medium">{entry.email}</td>
                                        <td className="px-6 py-4">{entry.status}</td>
                                        <td className="px-6 py-4">{entry.source}</td>
                                        <td className="px-6 py-4">{new Date(entry.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {(entries as any[])?.length === 0 && (
                                    <tr><td colSpan={4} className='p-6 text-center text-muted-foreground'>No entries yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
