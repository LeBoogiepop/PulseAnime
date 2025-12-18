import { AudioData } from '../types';

export class AudioDebug {
    private container: HTMLDivElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private isVisible = false;

    private meters: { [key: string]: HTMLDivElement } = {};
    private valueLabels: { [key: string]: HTMLSpanElement } = {};

    constructor() {
        // CLEANUP: Remove any existing overlay to prevent HMR duplicates
        const existing = document.getElementById('audio-debug-overlay');
        if (existing) existing.remove();

        this.container = document.createElement('div');
        this.container.id = 'audio-debug-overlay';
        this.container.style.cssText = `
      position: fixed;
      top: 220px; /* Moved down to avoid player overlap */
      right: 20px;
      width: 280px;
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 12px;
      z-index: 10000; /* Increased z-index */
      display: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
    `;

        // Title
        const title = document.createElement('div');
        title.innerText = "AUDIO ENGINE DEBUG V3";
        title.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
        title.style.marginBottom = "12px";
        title.style.paddingBottom = "8px";
        title.style.fontWeight = "bold";
        title.style.letterSpacing = "1px";
        title.style.textAlign = "center";
        title.style.color = "#aaa";
        this.container.appendChild(title);

        // 1. OSCILLOSCOPE (Moved to Top)
        const oscContainer = document.createElement('div');
        oscContainer.style.marginBottom = "15px";
        oscContainer.style.border = "1px solid #333";
        oscContainer.style.background = "#000";

        this.canvas = document.createElement('canvas');
        this.canvas.width = 254;
        this.canvas.height = 60;
        this.ctx = this.canvas.getContext('2d')!;

        oscContainer.appendChild(this.canvas);
        this.container.appendChild(oscContainer);

        // 2. METERS
        const bands = ['subBass', 'bass', 'lowMid', 'mid', 'highMid', 'treble', 'energy'];
        bands.forEach(band => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.marginBottom = '6px';

            const label = document.createElement('div');
            let displayLabel = band.toUpperCase();
            if (band === 'subBass') displayLabel = "SUB-BASS";
            if (band === 'lowMid') displayLabel = "LOW-MID";
            if (band === 'highMid') displayLabel = "HIGH-MID";

            label.innerText = displayLabel.padEnd(9, ' ');
            label.style.width = '70px';
            label.style.color = "#888";
            label.style.fontSize = "10px";
            label.style.fontFamily = "'Courier New', monospace";
            row.appendChild(label);

            const barContainer = document.createElement('div');
            barContainer.style.flex = '1';
            barContainer.style.height = '6px';
            barContainer.style.background = '#222';
            barContainer.style.marginRight = '10px';
            barContainer.style.border = '1px solid #333';

            const bar = document.createElement('div');
            bar.style.height = '100%';
            bar.style.width = '0%';

            // Color Coding
            if (band === 'subBass') bar.style.background = '#ff0000'; // Pure Red
            else if (band === 'bass') bar.style.background = '#ff8800'; // Orange
            else bar.style.background = '#fff';

            bar.style.transition = 'width 0.05s linear';
            this.meters[band] = bar;
            barContainer.appendChild(bar);
            row.appendChild(barContainer);

            const val = document.createElement('span');
            val.innerText = "0.00";
            val.style.width = "30px";
            val.style.textAlign = "right";
            val.style.color = "#888";
            this.valueLabels[band] = val;
            row.appendChild(val);

            this.container.appendChild(row);
        });

        document.body.appendChild(this.container);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
    }

    update(data: AudioData) {
        if (!this.isVisible) return;

        // Update Meters
        const updateMeter = (key: string, val: number) => {
            if (this.meters[key]) {
                this.meters[key].style.width = `${Math.min(100, val * 100)}%`;
                this.valueLabels[key].innerText = val.toFixed(2);
            }
        };

        updateMeter('subBass', data.subBass);
        updateMeter('bass', data.bass);
        updateMeter('lowMid', data.lowMid);
        updateMeter('mid', data.mid);
        updateMeter('highMid', data.highMid);
        updateMeter('treble', data.treble);
        updateMeter('energy', data.energy);

        // Draw Oscilloscope
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#fff';
        this.ctx.beginPath();

        const sliceWidth = w * 1.0 / data.waveform.length;
        let x = 0;

        for (let i = 0; i < data.waveform.length; i++) {
            const v = data.waveform[i] / 128.0;
            const y = v * h / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }
}
