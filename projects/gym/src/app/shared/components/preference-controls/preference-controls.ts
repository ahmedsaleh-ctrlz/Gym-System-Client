import { Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppLanguage, LanguageService } from '../../../core/services/language.service';
import { ThemeMode, ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-preference-controls',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './preference-controls.html',
  styleUrl: './preference-controls.scss',
})
export class PreferenceControls {
  readonly compact = input(false);
  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);

  setLanguage(value: AppLanguage): void { this.language.setLanguage(value); }
  setTheme(value: ThemeMode): void { this.theme.setTheme(value); }
}
