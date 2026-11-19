export class Scene {
  constructor(name = "Untitled Scene") {
    this.name = name;
    this.objects = new Map();
    this.nextId = 1;
  }

  add(object) {
    if (!object || typeof object !== "object") {
      throw new TypeError("Scene object must be an object.");
    }

    const id = object.id || `object-${this.nextId++}`;
    object.id = id;
    this.objects.set(id, object);
    return id;
  }

  remove(id) {
    return this.objects.delete(id);
  }

  get(id) {
    return this.objects.get(id) || null;
  }

  list() {
    return Array.from(this.objects.values());
  }

  clear() {
    this.objects.clear();
  }
}
