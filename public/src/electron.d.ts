// Augmentation de la déclaration globale pour TypeScript
declare global {
  interface Window {
    electron: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: Function) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
  }
}

export {};
