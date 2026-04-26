import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// accents.txt is stored in Supabase Storage (bucket: kanjium, file: accents.txt, public access)
// Format per line: kanji\tkana\tpitch  (tab-separated; pitch may be "1,3" — take first value)
const ACCENTS_URL = `${SUPABASE_URL}/storage/v1/object/public/kanjium/accents.txt`

let pitchMap: Map<string, number> | null = null

async function getPitchMap(): Promise<Map<string, number>> {
  if (pitchMap)
    return pitchMap

  const map = new Map<string, number>()
  try {
    const res = await fetch(ACCENTS_URL)
    if (!res.ok)
      return map

    const text = await res.text()
    for (const line of text.split('\n')) {
      const tab1 = line.indexOf('\t')
      if (tab1 === -1)
        continue
      const tab2 = line.indexOf('\t', tab1 + 1)
      if (tab2 === -1)
        continue

      const kanji = line.slice(0, tab1)
      const kana = line.slice(tab1 + 1, tab2)
      const pitch = Number.parseInt(line.slice(tab2 + 1).split(',')[0] ?? '', 10)
      if (Number.isNaN(pitch))
        continue

      map.set(`${kanji}\t${kana}`, pitch)
      if (!map.has(kana))
        map.set(kana, pitch)
    }
  }
  catch {
    // Storage unreachable — pitch_pattern will be null
  }

  pitchMap = map
  return map
}

function lookupPitch(map: Map<string, number>, kana: string, kanji: string | null): number | null {
  if (kanji) {
    const hit = map.get(`${kanji}\t${kana}`)
    if (hit !== undefined)
      return hit
  }
  const hit = map.get(kana)
  return hit !== undefined ? hit : null
}

interface RequestBody {
  vocab_id: string
  kana: string
  kanji: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { vocab_id, kana, kanji } = body
  if (!vocab_id || !kana) {
    return new Response(JSON.stringify({ error: 'vocab_id and kana are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: existing, error: fetchError } = await supabase
    .from('custom_vocabulary')
    .select('id')
    .eq('id', vocab_id)
    .maybeSingle()

  if (fetchError || !existing) {
    return new Response(JSON.stringify({ error: 'vocab_id not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const map = await getPitchMap()
  const pitchPattern = lookupPitch(map, kana, kanji ?? null)

  const { error: patchError } = await supabase
    .from('custom_vocabulary')
    .update({ pitch_pattern: pitchPattern })
    .eq('id', vocab_id)

  if (patchError) {
    return new Response(JSON.stringify({ error: 'Failed to update pitch_pattern' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ pitch_pattern: pitchPattern }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
