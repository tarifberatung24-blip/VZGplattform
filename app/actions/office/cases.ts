'use server'

import { revalidatePath } from 'next/cache'
import { createCaseRepository } from '@/lib/office/repositories/cases'

export async function archiveOfficeCase(caseId: string, locale: string) {
  const { repository, userId } = await createCaseRepository()
  if (!userId) return { error: 'Unauthorized' }
  const result = await repository.archiveMine(caseId)
  if (!result.error) revalidatePath(`/${locale}/office/cases/${caseId}`)
  return result
}
