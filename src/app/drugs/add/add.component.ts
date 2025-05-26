import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  Timestamp,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Medicamento } from '../../interfaces/medicamento.interface';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrl: './add.component.css',
})
export class AddComponent {
  nombreMedicamento: string = '';
  medicamento: Medicamento | null = null;
  error: string = '';

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  buscarMedicamento() {
    this.error = '';
    this.medicamento = null;

    const nombre = this.nombreMedicamento.trim();

    if (!nombre) {
      this.error = 'Debe ingresar un nombre de medicamento.';
      return;
    }

    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${nombre}"&limit=1`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (!response.results || response.results.length === 0) {
          this.error = 'Medicamento no encontrado.';
          return;
        }

        const result = response.results[0];

        this.medicamento = {
          id: uuidv4(),
          genericName: result.openfda?.generic_name || [],
          purpose: result.purpose || [],
          indicationsAndUsage: result.indications_and_usage || [],
          dosageAndAdministration: result.dosage_and_administration || [],
          contraindications: result.contraindications || [],
          warningsAndPrecautions: result.warnings_and_cautions || [],
          frecuenciaHoras: 0,
          horaInicio: '',
          proximaDosis: new Date(),
          estado: 'proximo',
          color: 'blue',
          fechaCreacion: new Date(),
          activo: true,
        };
      },
      error: () => {
        this.error = 'Error al buscar el medicamento.';
      },
    });
  }

  guardarMedicamento() {
    if (!this.medicamento) return;

    const hora = this.medicamento.horaInicio;
    const ahora = new Date();
    const [horaStr, minStr] = hora.split(':');

    const proxima = new Date();
    proxima.setHours(parseInt(horaStr));
    proxima.setMinutes(parseInt(minStr));
    proxima.setSeconds(0);
    proxima.setMilliseconds(0);

    // Bucle: sumar frecuencia hasta que sea futuro
    while (proxima <= ahora) {
      proxima.setHours(proxima.getHours() + this.medicamento.frecuenciaHoras);
    }

    this.medicamento.proximaDosis = proxima;
    this.medicamento.estado = 'proximo';
    this.medicamento.fechaCreacion = new Date();

    const user = this.auth.currentUser;
    if (!user) {
      this.error = 'Usuario no autenticado.';
      return;
    }

    const medicamentoAGuardar = {
      id: this.medicamento.id,
      genericName: this.medicamento.genericName ?? [],
      purpose: this.medicamento.purpose ?? [],
      indicationsAndUsage: this.medicamento.indicationsAndUsage ?? [],
      dosageAndAdministration: this.medicamento.dosageAndAdministration ?? [],
      contraindications: this.medicamento.contraindications ?? [],
      warningsAndPrecautions: this.medicamento.warningsAndPrecautions ?? [],
      frecuenciaHoras: this.medicamento.frecuenciaHoras ?? 0,
      horaInicio: this.medicamento.horaInicio ?? '',
      proximaDosis: Timestamp.fromDate(this.medicamento.proximaDosis),
      estado: this.medicamento.estado ?? 'proximo',
      color: this.medicamento.color ?? 'blue',
      fechaCreacion: Timestamp.fromDate(this.medicamento.fechaCreacion),
      activo: this.medicamento.activo ?? true,
    };

    const medicamentosRef = collection(
      this.firestore,
      `usuarios/${user.uid}/medicamentos`
    );

    addDoc(medicamentosRef, medicamentoAGuardar)
      .then(() => {
        console.log('✅ Medicamento guardado en Firestore.');
      })
      .finally(
        () => {
          this.router.navigate(['/dashboard']);
        }
      )
      .catch((error) => {
        console.error('❌ Error al guardar en Firestore:', error);
        this.error = 'No se pudo guardar el medicamento.';
      });

  }
}
function uuidv4(): string {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
