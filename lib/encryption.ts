// Client-side encryption utilities
export class EncryptionService {
  private static async getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, [
      "deriveKey",
    ])

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )
  }

  private static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16))
  }

  private static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(12))
  }

  static async encrypt(text: string, userKey: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)

    const salt = this.generateSalt()
    const iv = this.generateIV()
    const key = await this.getKey(userKey, salt)

    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data)

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined))
  }

  static async decrypt(encryptedData: string, userKey: string): Promise<string> {
    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0)),
      )

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16)
      const iv = combined.slice(16, 28)
      const encrypted = combined.slice(28)

      const key = await this.getKey(userKey, salt)

      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encrypted)

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error("Decryption failed:", error)
      throw new Error("Failed to decrypt content")
    }
  }

  // Generate a user-specific encryption key from their auth data
  static generateUserKey(userId: string, email: string): string {
    // Combine user ID and email to create a consistent key
    // In production, you might want to use additional entropy
    return `${userId}:${email}:journal_encryption_key`
  }

  // For search functionality, we'll encrypt search terms the same way
  static async encryptSearchTerm(term: string, userKey: string): Promise<string> {
    return this.encrypt(term.toLowerCase().trim(), userKey)
  }
}
