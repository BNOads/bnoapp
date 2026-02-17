const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const parseMetaMoney = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null

    const raw = String(value).trim()
    if (!raw) return null

    const numeric = Number(raw)
    if (!Number.isFinite(numeric)) return null

    // Meta frequently returns money as integer cents (e.g. "12345" = 123.45)
    return raw.includes('.') ? numeric : numeric / 100
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN')
        if (!META_ACCESS_TOKEN) {
            throw new Error('META_ACCESS_TOKEN is not set')
        }

        // Fetch Ad Accounts from Meta
        const fields = 'name,account_status,currency,amount_spent,spend_cap,business,owner,is_prepay_account,balance'
        const url = `https://graph.facebook.com/v24.0/me/adaccounts?fields=${fields}&access_token=${META_ACCESS_TOKEN}&limit=500`

        const response = await fetch(url)
        const json = await response.json() as {
            error?: { message?: string }
            data?: Array<Record<string, unknown>>
        }

        if (json.error) {
            throw new Error(json.error.message || 'Meta API error')
        }

        const accounts = (json.data || []).map((acc: Record<string, unknown>) => {
            const balanceRaw = parseMetaMoney(acc.balance)
            const amountSpent = parseMetaMoney(acc.amount_spent)
            const spendCap = parseMetaMoney(acc.spend_cap)

            let availableBalance = balanceRaw
            let balanceSource = 'balance'

            // Fallback for postpaid/capped accounts where Meta balance frequently comes as 0:
            // use "spend cap - amount spent" as available value.
            if ((availableBalance === null || availableBalance === 0) && spendCap !== null && spendCap > 0 && amountSpent !== null) {
                availableBalance = Math.max(spendCap - amountSpent, 0)
                balanceSource = 'spend_cap_minus_amount_spent'
            }

            return {
                ...acc,
                balance: availableBalance ?? 0,
                available_balance: availableBalance ?? 0,
                balance_raw: balanceRaw,
                amount_spent: amountSpent,
                spend_cap: spendCap,
                balance_source: balanceSource
            }
        })

        return new Response(
            JSON.stringify({ success: true, data: accounts }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido ao listar contas Meta'
        return new Response(
            JSON.stringify({ success: false, error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
