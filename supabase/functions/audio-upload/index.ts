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
        const { audioData, fileName, fileType, fileSize } = await req.json();

        if (!audioData || !fileName) {
            throw new Error('Audio data and filename are required');
        }

        // Validate file size (max 100MB)
        if (fileSize > 104857600) {
            throw new Error('File size exceeds 100MB limit');
        }

        // Validate file type
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac', 'audio/ogg', 'video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
        if (!allowedTypes.includes(fileType)) {
            throw new Error(`Unsupported file type: ${fileType}`);
        }

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

        // Extract base64 data from data URL
        const base64Data = audioData.split(',')[1];
        const mimeType = audioData.split(';')[0].split(':')[1];

        // Convert base64 to binary
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Generate unique filename with user folder
        const timestamp = Date.now();
        const uniqueFileName = `${userId}/${timestamp}-${fileName}`;

        // Upload to Supabase Storage
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/audio-files/${uniqueFileName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': mimeType,
                'x-upsert': 'true'
            },
            body: binaryData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        // Get file URL
        const fileUrl = `${supabaseUrl}/storage/v1/object/audio-files/${uniqueFileName}`;

        // Create transcription record in database
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: userId,
                original_filename: fileName,
                file_type: fileType,
                file_size: fileSize,
                original_file_url: fileUrl,
                status: 'UPLOADED',
                metadata: {
                    upload_timestamp: new Date().toISOString(),
                    storage_path: uniqueFileName
                }
            })
        });

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Database insert failed: ${errorText}`);
        }

        const transcriptionData = await insertResponse.json();

        return new Response(JSON.stringify({
            data: {
                transcriptionId: transcriptionData[0].id,
                fileUrl: fileUrl,
                fileName: fileName,
                status: 'UPLOADED'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Audio upload error:', error);

        const errorResponse = {
            error: {
                code: 'AUDIO_UPLOAD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});