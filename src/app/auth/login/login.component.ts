import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnDestroy {
  loginForm!: FormGroup;
  loading = false;
  showPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  // Getters para acceder fácilmente a los controles del formulario
  get email() { return this.loginForm?.get('email'); }
  get password() { return this.loginForm?.get('password'); }

  // Método para mostrar/ocultar contraseña
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Validación en tiempo real
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Obtener mensaje de error específico
  getFieldError(fieldName: string): string {
    const field = this.loginForm?.get(fieldName);

    if (field?.errors?.['required']) {
      return `${fieldName === 'email' ? 'El correo' : 'La contraseña'} es requerido`;
    }

    if (field?.errors?.['email']) {
      return 'Por favor ingresa un correo válido';
    }

    if (field?.errors?.['minlength']) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    return '';
  }

  async onLogin(): Promise<void> {
    // Marcar todos los campos como tocados para mostrar errores
    this.loginForm?.markAllAsTouched();

    if (this.loginForm?.invalid || this.loading) {
      return;
    }

    this.loading = true;
    const { email, password, rememberMe } = this.loginForm?.value;

    try {
      await this.authService.login(email, password);

      // Manejar "recordarme" si es necesario
      if (rememberMe) {
        this.handleRememberMe(email);
      }

      this.loginForm?.reset();

      // Navegar después de un breve delay para mostrar la notificación
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1000);

    } catch (error: any) {
      this.handleLoginError(error);
    } finally {
      this.loading = false;
    }
  }

  getInputClasses(controlName: string): string {
  const base = 'p-2 border rounded w-full focus:outline-none';
  const control = this.loginForm.get(controlName);

  return control && control.invalid && control.touched
    ? `${base} border-red-500 focus:ring-red-500`
    : `${base} border-gray-300 focus:ring-blue-500`;
}


  private handleLoginError(error: any): void {
    let errorMessage = 'Error desconocido';

    // Manejar diferentes tipos de errores de Firebase Auth
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No existe una cuenta con este correo electrónico';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Contraseña incorrecta';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Correo electrónico inválido';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Esta cuenta ha sido deshabilitada';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
        break;
      default:
        errorMessage = error.message || 'Error al iniciar sesión';
    }
  }

  private handleRememberMe(email: string): void {
    // Implementar lógica para recordar al usuario
    // Nota: Evita almacenar contraseñas, solo información no sensible
    try {
      localStorage.setItem('rememberedEmail', email);
    } catch (e) {
      console.warn('No se pudo guardar la información de recordar usuario');
    }
  }

  // Cargar email recordado al inicializar
  ngOnInit(): void {
    try {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      if (rememberedEmail) {
        this.loginForm?.patchValue({
          email: rememberedEmail,
          rememberMe: true
        });
      }
    } catch (e) {
      // Falló al cargar, continuar normalmente
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
