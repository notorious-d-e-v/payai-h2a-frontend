import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if token exists
    if (!process.env.TWITTER_BEARER_TOKEN) {
      return NextResponse.json({ 
        error: 'TWITTER_BEARER_TOKEN not set' 
      }, { status: 500 });
    }

    const token = process.env.TWITTER_BEARER_TOKEN;
    console.log('Testing Twitter API with token:', {
      exists: !!token,
      length: token?.length,
      startsWith: token?.substring(0, 10) + '...',
    });

    // Test with a known public user (Elon Musk)
    const testResponse = await fetch(
      'https://api.twitter.com/2/users/by/username/elonmusk?user.fields=name,description,profile_image_url,id',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Test response status:', testResponse.status);
    console.log('Test response headers:', Object.fromEntries(testResponse.headers.entries()));

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('Test response error:', errorText);
      
      return NextResponse.json({
        error: 'Twitter API test failed',
        status: testResponse.status,
        statusText: testResponse.statusText,
        details: errorText
      }, { status: 500 });
    }

    const testData = await testResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Twitter API is working correctly',
      testUser: testData.data?.name || 'Unknown',
      status: testResponse.status
    });

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
} 