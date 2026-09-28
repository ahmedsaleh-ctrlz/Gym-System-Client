import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeToggle } from './shared/components/theme-toggle/theme-toggle';

@Component({
  imports: [RouterOutlet, ThemeToggle],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
