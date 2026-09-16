import { PersistedEntity, Repository } from './persistence.domain';

export class InMemoryRepository<T extends PersistedEntity> implements Repository<T> {
  private readonly records = new Map<string, T>();

  async findById(id: string): Promise<T | null> {
    return this.records.get(id) ?? null;
  }

  async save(entity: T): Promise<T> {
    const existing = this.records.get(entity.id);
    if (existing && entity.version !== existing.version) {
      throw new Error('Optimistic concurrency conflict');
    }
    const now = new Date().toISOString();
    const saved: T = {
      ...entity,
      createdAt: existing?.createdAt ?? entity.createdAt ?? now,
      updatedAt: now,
      version: existing ? existing.version + 1 : 1,
    };
    this.records.set(saved.id, saved);
    return saved;
  }

  async list(): Promise<T[]> {
    return [...this.records.values()];
  }
}
