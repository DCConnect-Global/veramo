import { IIdentifier, IMessage, ManagedKeyInfo } from '@veramo/core-types'
import { ManagedPrivateKey } from '@veramo/key-manager'
import {
  DiffCallback,
  VeramoJsonCache,
  ClaimTableEntry,
  CredentialTableEntry,
  PresentationTableEntry,
  VeramoJsonStore,
} from './types.js'
import { Json } from '@metamask/snaps-sdk'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Implementation of {@link VeramoJsonStore} that uses the snap managed state to store data.
 *
 * @example
 * ```
 * const dataStore = SnapManagedStateStore.fromLocalStorage('veramo-state')
 * const plugin = new DataStoreJson(dataStore)
 * ```
 *
 * @public
 */
export class SnapManagedStateStore implements VeramoJsonStore {
  notifyUpdate: DiffCallback
  dids: Record<string, IIdentifier>
  keys: Record<string, ManagedKeyInfo>
  privateKeys: Record<string, ManagedPrivateKey>
  credentials: Record<string, CredentialTableEntry>
  claims: Record<string, ClaimTableEntry>
  presentations: Record<string, PresentationTableEntry>
  messages: Record<string, IMessage>

  private constructor(private localStorageKey: string) {
    this.notifyUpdate = async (_oldState: VeramoJsonCache, newState: VeramoJsonCache) => {
      this.save(newState)
    }
    this.dids = {}
    this.keys = {}
    this.privateKeys = {}
    this.credentials = {}
    this.claims = {}
    this.presentations = {}
    this.messages = {}
  }

  public static async fromLocalStorage(localStorageKey: string): Promise<SnapManagedStateStore> {
    if (!snap) throw new Error('snap global object not found. Are you in a snap context?')
    const store = new SnapManagedStateStore(localStorageKey)
    return await store.load()
  }

  private async getStorage(): Promise<Json> {
    return await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    })
  }

  private async setStorage(input: string) {
    const state = (await this.getStorage()) || {}
    const oldState = isObject(state) ? state : {}
    const newState = { ...oldState, [this.localStorageKey]: input }
    return await snap.request({
      method: 'snap_manageState',
      params: { operation: 'update', newState },
    })
  }

  private async load(): Promise<SnapManagedStateStore> {
    const rawCache: unknown = (await this.getStorage()) || {}
    let veramoState: VeramoJsonCache
    try {
      if (!isObject(rawCache)) veramoState = {}
      else {
        const storage = rawCache[this.localStorageKey]
        veramoState = typeof storage === 'string' ? JSON.parse(storage) : {}
      }
    } catch (e: unknown) {
      console.log('Error parsing cache', e)
      veramoState = {}
    }
    ;({
      dids: this.dids,
      keys: this.keys,
      credentials: this.credentials,
      claims: this.claims,
      presentations: this.presentations,
      messages: this.messages,
      privateKeys: this.privateKeys,
    } = {
      dids: {},
      keys: {},
      credentials: {},
      claims: {},
      presentations: {},
      messages: {},
      privateKeys: {},
      ...veramoState,
    })
    return this
  }

  private async save(input: VeramoJsonCache): Promise<void> {
    const veramoState = JSON.stringify(input)
    await this.setStorage(veramoState)
  }
}
