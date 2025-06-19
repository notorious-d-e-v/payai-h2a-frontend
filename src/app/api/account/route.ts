import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's Twitter handle from their auth metadata
    const userMeta = user.user_metadata;
    const twitterHandle = userMeta.user_name;

    if (!twitterHandle) {
      return NextResponse.json({ 
        error: 'Twitter handle not found. Please sign in with Twitter again.' 
      }, { status: 400 });
    }
    
    const twitterResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${twitterHandle}?user.fields=name,description,profile_image_url,id`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!twitterResponse.ok) {
      if (twitterResponse.status === 401) {
        console.error('Twitter API authentication failed. Check TWITTER_BEARER_TOKEN');
        // Try to get more details about the error
        try {
          const errorData = await twitterResponse.json();
          console.error('Twitter API error details:', errorData);
        } catch (e) {
          console.error('Could not parse Twitter API error response');
        }
        return NextResponse.json({ 
          error: 'Twitter API authentication failed. Please contact support.' 
        }, { status: 500 });
      }
      if (twitterResponse.status === 404) {
        return NextResponse.json({ 
          error: 'Twitter user not found. Please check your Twitter handle.' 
        }, { status: 404 });
      }
      if (twitterResponse.status === 429) {
        return NextResponse.json({ 
          error: 'Twitter API rate limit exceeded. Please try again later.' 
        }, { status: 429 });
      }
      throw new Error(`Twitter API error: ${twitterResponse.status} ${twitterResponse.statusText}`);
    }

    const twitterData = await twitterResponse.json();

    if (!twitterData.data) {
      return NextResponse.json({ 
        error: 'Twitter user data not found. Please Try again.' 
      }, { status: 404 });
    }

    const userData = {
      name: twitterData.data.name,
      bio: twitterData.data.description || '',
      profileImage: twitterData.data.profile_image_url || '',
      twitterUserId: twitterData.data.id,
    };

    // Update user metadata with real Twitter data
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        name: userData.name,
        avatar_url: userData.profileImage,
        bio: userData.bio,
        twitterUserId: userData.twitterUserId,
        twitter_handle: twitterHandle,
        last_synced: new Date().toISOString(),
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      displayName: userData.name,
      avatarUrl: userData.profileImage,
      bio: userData.bio,
      twitterHandle: twitterHandle,
      email: user.email,
    });
  } catch (error: any) {
    console.error('Error syncing profile with Twitter:', error);
    
    // Handle specific Twitter API errors
    if (error.message?.includes('Twitter API error: 404')) {
      return NextResponse.json({ 
        error: 'Twitter user not found. Please check your Twitter handle.' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
