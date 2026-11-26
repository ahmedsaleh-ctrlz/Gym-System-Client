import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PreferenceControls } from '../../components/preference-controls/preference-controls';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [TranslatePipe, PreferenceControls],
  templateUrl: './preferences.html',
  styleUrl: './preferences.scss',
})
export class Preferences {}
