export class SpectrumVisualizer {
    private numBars: number;
    private smoothValues: Float32Array;
    private peakValues: Float32Array;
    private peakHoldCounters: Int32Array;

    private readonly peakHoldTime = 20;
    private readonly fallSpeed = 2.0;
    private readonly smoothingFactor = 0.25;

    constructor(numBars: number = 64) {
        this.numBars = numBars;
        this.smoothValues = new Float32Array(numBars);
        this.peakValues = new Float32Array(numBars);
        this.peakHoldCounters = new Int32Array(numBars);
    }

    draw(
        ctx: CanvasRenderingContext2D,
        spectrum: Uint8Array,
        sensitivity: number,
        width: number,
        height: number
    ) {
        const barWidth = width / this.numBars;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#00FFFF');
        gradient.addColorStop(0.5, '#FFFFFF');
        gradient.addColorStop(1, '#FF00FF');

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < this.numBars; i++) {
            // 1. Logarithmic Scale Mapping
            // Map linear index 'i' to logarithmic index in spectrum array
            // Low frequencies are at the start of spectrum
            // We want to sample more densely at low frequencies

            // Simple log mapping:
            // index = start + (end - start) * (log(i/numBars * (base-1) + 1) / log(base))
            // But simpler approach for visualizer:
            // Just map i (0..numBars) to spectrum index (0..spectrum.length) using a power curve
            const spectrumLen = spectrum.length; // usually 1024

            // Use a power curve to approximate log scale for frequency selection
            // index ~ i^2 gives more resolution at lower end
            // Or standard log formula

            // Let's use the user's request specific "Math.log" hint if possible, 
            // but usually for array indexing we want a mapping function.
            // "Utilise Math.log pour mapper les index du tableau FFT audio.spectrum"

            // Let's try to map the frequency range 20Hz - 20kHz to our bars.
            // The spectrum array is linear from 0 to Nyquist (22050Hz).
            // We want i=0 -> ~20Hz, i=numBars -> ~20kHz.
            // Log scale: freq = minFreq * (maxFreq/minFreq)^(i/numBars)

            // However, to keep it simple and robust with just array indices:
            // We can use a geometric progression for indices.

            // Let's implement a mapping that ensures bass (low indices) takes up ~1/3.
            // If numBars = 64. 1/3 is ~21 bars.
            // We want spectrum indices 0..~10 (bass) to map to bars 0..21.

            // Let's use a custom mapping function based on the prompt's requirement.
            // "Les fréquences basses (20Hz-150Hz) doivent occuper le premier tiers de l'écran"

            // Let's stick to a standard log-like distribution for visualizers:
            const interpolationFactor = Math.log(i + 2) / Math.log(this.numBars + 2);
            // This doesn't quite stretch bass enough.

            // Let's use a simpler approach often used:
            // index = floor( i * spectrumLen / numBars ) -> Linear
            // index = floor( spectrumLen * (i/numBars)^2 ) -> Quadratic (gives more bass bars)

            // Let's use Math.pow(i / this.numBars, 2) * spectrumLen;
            // But let's try to strictly follow "Utilise Math.log".
            // Maybe they mean: value = Math.log(spectrum[i])? No, "mapper les index".

            // Let's use a log-scale index mapping:
            // minIndex = 1 (ignore DC)
            // maxIndex = spectrumLen - 1
            // logMin = Math.log(minIndex)
            // logMax = Math.log(maxIndex)
            // currentLog = logMin + (i / numBars) * (logMax - logMin)
            // index = Math.exp(currentLog)

            const minIdx = 1;
            const maxIdx = spectrumLen / 2; // Use half spectrum (up to ~11kHz is usually enough visually)

            const logMin = Math.log(minIdx);
            const logMax = Math.log(maxIdx);
            const t = i / this.numBars;
            const logIdx = logMin + t * (logMax - logMin);
            const spectrumIdx = Math.floor(Math.exp(logIdx));

            const rawValue = spectrum[spectrumIdx] || 0;

            // 4. Courbe de Puissance (Expander)
            // Math.pow(val / 255, 1.8)
            const normalized = rawValue / 255;
            const expanded = Math.pow(normalized, 1.8) * 255;

            // Apply Sensitivity
            const targetValue = expanded * sensitivity;

            // 3. Lissage Temporel (Smoothing)
            this.smoothValues[i] += (targetValue - this.smoothValues[i]) * this.smoothingFactor;

            // 2. Physique des Pics (Ghost Peaks)
            if (this.smoothValues[i] > this.peakValues[i]) {
                this.peakValues[i] = this.smoothValues[i];
                this.peakHoldCounters[i] = this.peakHoldTime;
            } else {
                if (this.peakHoldCounters[i] > 0) {
                    this.peakHoldCounters[i]--;
                } else {
                    this.peakValues[i] -= this.fallSpeed;
                    if (this.peakValues[i] < 0) this.peakValues[i] = 0;
                }
            }

            // Draw Bar
            const barHeight = Math.max(2, (this.smoothValues[i] / 255) * height);
            const x = i * barWidth;
            const y = height - barHeight;

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 2, barHeight);

            // Draw Ghost Peak
            const peakY = height - Math.max(2, (this.peakValues[i] / 255) * height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x, peakY - 2, barWidth - 2, 2);
        }
    }
}
