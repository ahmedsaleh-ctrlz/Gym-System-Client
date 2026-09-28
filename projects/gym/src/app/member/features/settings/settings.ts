import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';

@Component({
  imports: [RouterLink, ButtonModule, ThemeToggle],
  selector: 'app-member-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {}
