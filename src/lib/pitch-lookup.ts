// Kanjium pitch accent lookup — loaded lazily from /data/kanjium/accents.txt on first use.
// Format per line: kanji\tkana\tpitch  (pitch may be "1,3" — first value is used)
// The file is ~3 MB but served from CDN and cached by the browser after first fetch.

let pitchMap: Map<string, number> | null = null
let loadPromise: Promise<Map<string, number>> | null = null

async function load(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const res = await fetch('/data/kanjium/accents.txt')
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
    // Network error or missing file — pitch lookup returns null silently
  }
  pitchMap = map
  return map
}

function getMap(): Promise<Map<string, number>> {
  if (pitchMap)
    return Promise.resolve(pitchMap)
  if (!loadPromise)
    loadPromise = load()
  return loadPromise
}

export async function lookupPitch(kana: string, kanji: string | null): Promise<number | null> {
  const map = await getMap()
  if (kanji) {
    const hit = map.get(`${kanji}\t${kana}`)
    if (hit !== undefined)
      return hit
  }
  const hit = map.get(kana)
  return hit !== undefined ? hit : null
}
