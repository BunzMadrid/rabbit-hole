// Simple event emitter for inter-component communication
class EventEmitter {
  private events: { [key: string]: Array<() => void> } = {}

  on(event: string, callback: () => void) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  off(event: string, callback: () => void) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(cb => cb !== callback)
  }

  emit(event: string) {
    if (!this.events[event]) return
    this.events[event].forEach(callback => callback())
  }
}

export const conversionEvents = new EventEmitter()
