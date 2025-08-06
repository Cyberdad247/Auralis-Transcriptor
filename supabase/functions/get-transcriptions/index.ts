Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Parse query parameters
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const status = url.searchParams.get('status');
        const sortBy = url.searchParams.get('sortBy') || 'created_at';
        const order = url.searchParams.get('order') || 'desc';

        // Get environment variables
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token and get user
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Build query
        let query = `user_id=eq.${userId}`;
        if (status) {
            query += `&status=eq.${status}`;
        }

        // Calculate offset
        const offset = (page - 1) * limit;

        // Get transcriptions with pagination
        const transcriptionsResponse = await fetch(`${supabaseUrl}/rest/v1/transcriptions?${query}&order=${sortBy}.${order}&limit=${limit}&offset=${offset}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!transcriptionsResponse.ok) {
            throw new Error('Failed to fetch transcriptions');
        }

        const transcriptions = await transcriptionsResponse.json();

        // Get total count for pagination
        const countResponse = await fetch(`${supabaseUrl}/rest/v1/transcriptions?${query}&select=count`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'count=exact'
            }
        });

        const countData = await countResponse.text();
        const totalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || '0');

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return new Response(JSON.stringify({
            data: {
                transcriptions: transcriptions,
                pagination: {
                    page: page,
                    limit: limit,
                    totalCount: totalCount,
                    totalPages: totalPages,
                    hasNextPage: hasNextPage,
                    hasPrevPage: hasPrevPage
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get transcriptions error:', error);

        const errorResponse = {
            error: {
                code: 'GET_TRANSCRIPTIONS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});