export interface Medicamento {
  id: string;
  genericName: string[];
  purpose?: string[];
  indicationsAndUsage: string[];
  dosageAndAdministration: string[];
  contraindications: string[];
  warningsAndPrecautions: string[];
  frecuenciaHoras: number;
  horaInicio: string;
  proximaDosis: Date;
  estado: 'activo' | 'proximo' | 'vencido';
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
  fechaCreacion: Date;
  activo: boolean;
  ultimaActualizacion?: Date; // Nuevo campo para rastrear actualizaciones
}
