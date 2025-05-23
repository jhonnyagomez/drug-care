import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  constructor(private authService: AuthService) {}

  onLogin() {
    this.loading = true;
    this.authService
      .login(this.email, this.password)
      .then(() => {
        alert('✅ Inicio de sesión exitoso');
        this.email = '';
        this.password = '';
      })
      .catch(err => {
        alert('❌ Error: ' + err.message);
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
