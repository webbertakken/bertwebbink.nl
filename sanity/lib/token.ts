import 'server-only'
import { assertValue } from '@/core/util/assertValue'

export const token = assertValue(process.env.SANITY_API_READ_TOKEN, 'Missing SANITY_API_READ_TOKEN')
