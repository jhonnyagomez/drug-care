import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  isFormValid(): boolean {
    return !!(
      this.displayName.trim() &&
      this.email.trim() &&
      this.password.length >= 6 &&
      this.password === this.confirmPassword &&
      this.acceptTerms &&
      this.isValidEmail(this.email)
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  onRegister(): void {
    this.clearMessages();

    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.loading = true;

    this.authService
      .register(this.email.trim(), this.password)
      .then(() => {
        this.successMessage = '¡Registro exitoso! Serás redirigido al login...';

        // Redirigir después de 3 segundos para que el usuario vea el mensaje
        setTimeout(() => {
          this.router.navigate(['/auth/login'], {
            queryParams: {
              email: this.email,
            }
          });
        }, 3000);
      })
      .catch((error) => {
        this.errorMessage = error.message;
      })
      .finally(() => {
        this.loading = false;
      });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
