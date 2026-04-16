import { Buffer } from 'node:buffer'
import { createHash, scrypt as nodeScrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { Injectable } from '@nestjs/common'

async function derivePasswordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(Buffer.from(derivedKey))
    })
  })
}

@Injectable()
export class CryptoService {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const hash = await derivePasswordHash(password, salt)
    return `${salt}:${hash.toString('hex')}`
  }

  async verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [salt, expectedHash] = encoded.split(':')
    if (!salt || !expectedHash) {
      return false
    }

    const hash = await derivePasswordHash(password, salt)
    const expected = Buffer.from(expectedHash, 'hex')
    if (hash.length !== expected.length) {
      return false
    }

    return timingSafeEqual(hash, expected)
  }

  hashApiKey(apiKey: string): string {
    const normalized = apiKey.trim()
    return createHash('sha256').update(normalized).digest('hex')
  }

  generateApiKey(projectId: string): string {
    const normalizedProjectId = projectId.trim() || 'project'
    const random = randomBytes(24).toString('hex')
    return `ezm_${normalizedProjectId}_${random}`
  }
}
