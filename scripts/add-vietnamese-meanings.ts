import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import YAML from 'js-yaml'

interface Meaning {
  en: string
  fr?: string
  vi?: string
}

interface VocabEntry {
  id: [number, number]
  edition: number[]
  kanji: string | null
  kana: string
  romaji: string
  meaning: Meaning
}

interface Dataset {
  languages: Record<string, string>
  lessons: Array<{ key: string, id: number }>
  [key: string]: unknown
}

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const MODEL_NAME = 'deepseek-coder-v2:16b'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function translateBatch(entries: Array<{ vocab: string, meaning: string }>): Promise<string[]> {
  const vocabList = entries
    .map((e, i) => `${i + 1}. ${e.vocab}: ${e.meaning}`)
    .join('\n')

  const prompt = `Translate these Japanese vocabulary meanings to Vietnamese.
For each, provide ONLY the Vietnamese translation (concise, suitable for Japanese learners).
Return as a numbered list matching the input order exactly.

${vocabList}

Format each as: "N. [vietnamese translation]"`

  let retries = 0
  const maxRetries = 3

  while (retries < maxRetries) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: false,
        }),
      })

      if (response.status === 429) {
        const waitTime = 2 ** retries * 10000 // 10s, 20s, 40s
        console.log(`  Rate limited. Waiting ${waitTime}ms before retry...`)
        await sleep(waitTime)
        retries++
        continue
      }

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as { message: { content: string } }
      const responseText = data.message.content

      const translations = responseText
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())

      return translations
    }
    catch (error) {
      if (retries === maxRetries - 1)
        throw error
      retries++
      await sleep(2000)
    }
  }

  throw new Error('Failed to translate batch after retries')
}

async function main() {
  const filePath = path.join(process.cwd(), 'dataset/minna-no-ds.yaml')
  const progressFile = path.join(process.cwd(), 'dataset/.translation-progress.json')

  const content = fs.readFileSync(filePath, 'utf-8')
  const data = YAML.load(content) as Dataset

  // Add Vietnamese to languages
  if (!data.languages)
    data.languages = {}
  data.languages.vi = 'Tiếng Việt'

  // Load progress if it exists
  let processedCount = 0
  let startIndex = 0
  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
    processedCount = progress.processedCount
    startIndex = progress.lastIndex
    console.log(`Resuming from batch ${Math.floor(startIndex / 10) + 1}. Already processed ${processedCount} entries.`)
  }

  // Collect all vocab entries needing translation
  const entriesToTranslate: Array<{
    vocabKey: string
    index: number
    vocab: VocabEntry
    englishMeaning: string
  }> = []

  for (const [lessonKey, vocabList] of Object.entries(data)) {
    if (!Array.isArray(vocabList) || lessonKey.startsWith('_'))
      continue

    vocabList.forEach((vocab: VocabEntry, idx: number) => {
      if (vocab.meaning && vocab.meaning.en && !vocab.meaning.vi) {
        entriesToTranslate.push({
          vocabKey: lessonKey,
          index: idx,
          vocab,
          englishMeaning: vocab.meaning.en,
        })
      }
    })
  }

  console.log(`Found ${entriesToTranslate.length} entries to translate...`)

  // Process in batches of 10 to avoid rate limiting
  const batchSize = 10
  for (let i = startIndex; i < entriesToTranslate.length; i += batchSize) {
    const batch = entriesToTranslate.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(entriesToTranslate.length / batchSize)
    console.log(`\nTranslating batch ${batchNum}/${totalBatches}...`)

    const translations = await translateBatch(
      batch.map(e => ({
        vocab: `${e.vocab.kanji || e.vocab.kana} (${e.vocab.romaji})`,
        meaning: e.englishMeaning,
      })),
    )

    // Update vocab entries with Vietnamese meanings
    batch.forEach((entry, idx) => {
      const vietnameseMeaning = translations[idx] || ''
      if (vietnameseMeaning) {
        const lesson = data[entry.vocabKey] as VocabEntry[]
        lesson[entry.index].meaning.vi = vietnameseMeaning
      }
    })

    // Save progress and write YAML after each batch
    processedCount += batch.length
    const progress = { processedCount, lastIndex: i + batchSize }
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2), 'utf-8')

    const updatedYaml = YAML.dump(data, {
      lineWidth: -1,
      noRefs: true,
    })
    fs.writeFileSync(filePath, updatedYaml, 'utf-8')
    console.log(`✓ Saved batch ${batchNum}/${totalBatches} (${processedCount}/${entriesToTranslate.length} total)`)

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < entriesToTranslate.length) {
      await sleep(5000) // 5 seconds between batches
    }
  }

  // Clean up progress file
  if (fs.existsSync(progressFile)) {
    fs.unlinkSync(progressFile)
  }

  console.log(`\n✅ Updated ${processedCount} vocabulary entries with Vietnamese meanings!`)
}

main().catch(console.error)
