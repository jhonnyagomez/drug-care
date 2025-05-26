import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DrugsService } from '../../services/drugs.service';
import { Medicamento } from '../../interfaces/medicamento.interface';
import { AuthService } from '../../services/auth.service';

// Interface para el medicamento

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  medicamentos: Medicamento[] = [];
  nombreUsuario: string = 'Usuario';

  // Stats calculadas
  medicamentosActivos: number = 0;
  proximaDosisHora: string = '';
  dosisHoy: number = 0;
  totalDosisHoy: number = 0;
  adherencia: number = 0;

  constructor(
    private router: Router,
    private medicamentoService: DrugsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario(); // esto no depende de auth
    this.calcularStats(); // puede quedar si ya tienes medicamentos cargados

    // Escuchar cambios en el usuario autenticado
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.medicamentoService
          .obtenerMedicamentos(user.uid)
          .subscribe((data) => {
            this.medicamentos = data;
            this.actualizarEstados(); // importante para que arranque con datos consistentes
            this.calcularStats();
          });
      } else {
        console.error('Usuario no autenticado');
      }
    });

    // Actualizar stats y estados cada minuto
    setInterval(() => {
      this.actualizarEstados();
      this.calcularStats();
    }, 60000);
  }

  // Cargar datos del usuario
  cargarDatosUsuario(): void {
    // Aquí obtendrías el nombre del usuario del servicio de auth
    this.nombreUsuario = localStorage.getItem('nombreUsuario') || 'Usuario';
  }

  // Calcular próxima dosis basada en hora de inicio y frecuencia
  calcularProximaDosis(horaInicio: string, frecuenciaHoras: number): Date {
    const ahora = new Date();
    const [hora, minuto] = horaInicio.split(':').map(Number);

    const proximaDosis = new Date();
    proximaDosis.setHours(hora, minuto, 0, 0);

    // Si la hora ya pasó hoy, calcular la próxima dosis
    while (proximaDosis <= ahora) {
      proximaDosis.setTime(
        proximaDosis.getTime() + frecuenciaHoras * 60 * 60 * 1000
      );
    }

    return proximaDosis;
  }

  // Actualizar estados de los medicamentos
  actualizarEstados(): void {
    const ahora = new Date();

    this.medicamentos.forEach((medicamento) => {
      const tiempoHastaProximaDosis =
        medicamento.proximaDosis.getTime() - ahora.getTime();
      const minutosHastaProximaDosis = tiempoHastaProximaDosis / (1000 * 60);

      if (minutosHastaProximaDosis <= 0) {
        medicamento.estado = 'vencido';
      } else if (minutosHastaProximaDosis <= 30) {
        medicamento.estado = 'proximo';
      } else {
        medicamento.estado = 'activo';
      }
    });
  }

  // Calcular estadísticas
  calcularStats(): void {
    const ahora = new Date();
    let dosisTotales = 0;
    let dosisTomadas = 0;
    let dosisPendientesHoy = 0;

    this.medicamentosActivos = this.medicamentos.filter(
      (m) => m.estado === 'activo'
    ).length;

    const proximas = this.medicamentos
      .map((m) => m.proximaDosis)
      .sort((a, b) => a.getTime() - b.getTime());

    this.proximaDosisHora =
      proximas.length > 0 ? this.formatearHora(proximas[0]) : 'N/A';

    this.medicamentos.forEach((m) => {
      // Calcula cuántas dosis toca hoy según frecuencia y hora de inicio
      const horaInicio = m.horaInicio;
      const frecuencia = m.frecuenciaHoras;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const [hora, minuto] = horaInicio.split(':').map(Number);

      let dosisHora = new Date(hoy);
      dosisHora.setHours(hora, minuto, 0, 0);

      while (dosisHora.getDate() === hoy.getDate()) {
        dosisTotales++;

        if (dosisHora < ahora) {
          // Simulación: asumimos que se tomó (esto lo manejarías con backend luego)
          dosisTomadas++;
        } else {
          dosisPendientesHoy++;
        }

        dosisHora = new Date(dosisHora.getTime() + frecuencia * 60 * 60 * 1000);
      }
    });

    this.dosisHoy = dosisTomadas;
    this.totalDosisHoy = dosisTotales;
    this.adherencia = dosisTotales
      ? Math.round((dosisTomadas / dosisTotales) * 100)
      : 0;
  }

  // Formatear hora para mostrar
  formatearHora(fecha: Date): string {
    return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Obtener nombre principal del medicamento
  obtenerNombrePrincipal(med: Medicamento): string {
    return med.genericName?.[0] || 'Sin nombre';
  }

  // Obtener dosis principal del medicamento
  obtenerDosisPrincipal(med: Medicamento): string {
    return med.dosageAndAdministration?.[0] || 'Dosis no especificada';
  }

  // Obtener propósito principal
  obtenerProposito(medicamento: Medicamento): string {
    return medicamento.purpose && medicamento.purpose.length > 0
      ? medicamento.purpose[0]
      : 'Medicamento';
  }
  obtenerTextoFrecuencia(frecuencia: number): string {
    return `Cada ${frecuencia} horas`;
  }

  // Obtener clases CSS para el color del medicamento
  obtenerClasesColor(color: string): string {
    const colores: { [key: string]: string } = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
      purple: 'bg-purple-100 text-purple-600',
      gray: 'bg-gray-100 text-gray-600',
    };
    return colores[color] || colores['gray'];
  }

  // Obtener clases para el estado
  obtenerClasesEstado(estado: string): string {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-700';
      case 'proximo':
        return 'bg-yellow-100 text-yellow-800';
      case 'atrasado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Obtener texto del estado
  obtenerTextoEstado(estado: string): string {
    switch (estado) {
      case 'activo':
        return 'A tiempo';
      case 'proximo':
        return 'Próxima dosis';
      case 'atrasado':
        return 'Dosis atrasada';
      default:
        return 'Desconocido';
    }
  }

  // Navegación y acciones
  irAgregarMedicamento(): void {
    this.router.navigate(['dashboard/add']);
  }

  verDetalleMedicamento(medicamento: Medicamento): void {
    this.router.navigate(['/medicamento', medicamento.id]);
  }

  editarMedicamento(medicamento: Medicamento): void {
    this.router.navigate(['/editar-medicamento', medicamento.id]);
  }

  eliminarMedicamento(medicamento: Medicamento): void {
    const nombre = this.obtenerNombrePrincipal(medicamento);
    if (confirm(`¿Estás seguro de que quieres eliminar ${nombre}?`)) {
      this.medicamentos = this.medicamentos.filter(
        (m) => m.id !== medicamento.id
      );
      this.calcularStats();
      // Aquí llamarías a tu servicio para eliminar del backend
      console.log('Eliminando medicamento:', medicamento.id);
    }
  }

  marcarComoTomado(medicamento: Medicamento): void {
    // Actualizar la próxima dosis
    medicamento.proximaDosis = new Date(
      medicamento.proximaDosis.getTime() +
        medicamento.frecuenciaHoras * 60 * 60 * 1000
    );
    medicamento.estado = 'activo';
    this.calcularStats();

    // Aquí registrarías la toma en el backend
    console.log('Medicamento tomado:', medicamento.genericName[0]);
  }

  cerrarSesion(): void {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('nombreUsuario');
      this.router.navigate(['/login']);
    }
  }

  // Método para obtener el saludo según la hora
  obtenerSaludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
