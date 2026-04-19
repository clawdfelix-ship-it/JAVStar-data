import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { actresses } = await request.json();
    
    if (!actresses || !Array.isArray(actresses)) {
      return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
    }

    let success = 0;
    let failed = 0;

    for (const a of actresses) {
      try {
        await sql`
          INSERT INTO actresses (id, name_ja, name_cn, birthday, age, zodiac, height, bust, waist, hip, cup, agency, hobby, debut_date, debut_year, debut_work, blog, official_site, tags, avatar_url, created_at, updated_at)
          VALUES (
            ${String(a.id || '')}, 
            ${a.name_ja || ''}, 
            ${a.name_cn || null}, 
            ${a.birthday || null}, 
            ${a.age || null}, 
            ${a.zodiac || null}, 
            ${a.height || null}, 
            ${a.bust || null}, 
            ${a.waist || null}, 
            ${a.hip || null}, 
            ${a.cup || null}, 
            ${a.agency || null}, 
            ${a.hobby || null}, 
            ${a.debut_date || null}, 
            ${a.debut_year || null}, 
            ${a.debut_work || null}, 
            ${a.blog || null}, 
            ${a.official_site || null}, 
            ${a.tags || null}, 
            ${a.avatar_url || null}, 
            NOW(), 
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name_ja = EXCLUDED.name_ja,
            name_cn = EXCLUDED.name_cn,
            birthday = EXCLUDED.birthday,
            age = EXCLUDED.age,
            zodiac = EXCLUDED.zodiac,
            height = EXCLUDED.height,
            bust = EXCLUDED.bust,
            waist = EXCLUDED.waist,
            hip = EXCLUDED.hip,
            cup = EXCLUDED.cup,
            agency = EXCLUDED.agency,
            hobby = EXCLUDED.hobby,
            debut_date = EXCLUDED.debut_date,
            debut_year = EXCLUDED.debut_year,
            debut_work = EXCLUDED.debut_work,
            blog = EXCLUDED.blog,
            official_site = EXCLUDED.official_site,
            tags = EXCLUDED.tags,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW()
        `;
        success++;
      } catch (e) {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      total: actresses.length,
      inserted: success,
      failed: failed,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}