import type { Passage } from '../types/passages'
import { db } from './schema'

export async function getPassagesForLesson(bookSource: string, lessonNumber: number): Promise<Passage[]> {
  return db.passages
    .where('[book_source+lesson_number]')
    .equals([bookSource, lessonNumber])
    .toArray()
}
