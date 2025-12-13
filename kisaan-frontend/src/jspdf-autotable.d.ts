declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  export default function autotable(doc: jsPDF, ...args: unknown[]): void;
  export {};
}

declare module 'jspdf' {
  interface jsPDF {
  autoTable: (...args: unknown[]) => void;
  }
}
