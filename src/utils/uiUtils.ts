import { SketchParam } from '../types';

/**
 * Creates a Dot Matrix style slider and appends it to the container.
 * Returns the created input element and the wrapper container.
 */
export function createDotMatrixSlider(
    param: { value: any, min?: number, max?: number, step?: number, onChange?: (val: number) => void },
    container: HTMLElement,
    valDisplay?: HTMLElement
): { wrapper: HTMLDivElement, input: HTMLInputElement } {
    // Defaults
    const min = param.min ?? 0;
    const max = param.max ?? 100;
    const step = param.step ?? 1;
    const value = param.value;

    // 1. Container Principal
    const sliderContainer = document.createElement('div');
    sliderContainer.className = "relative w-full h-8 flex items-center select-none group/slider";

    // 2. Track (Points)
    // px-[14px] aligns the dots with the 32px thumb's center travel range (16px to Width-16px)
    // First dot center at 14px + 2px = 16px. Last dot center at Width - 14px - 2px = Width - 16px.
    const trackContainer = document.createElement('div');
    trackContainer.className = "absolute inset-0 flex justify-between items-center px-[14px] z-0 pointer-events-none";

    // Génération des points
    const dotCount = 20;
    const dots: HTMLDivElement[] = [];
    for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('div');
        // Style de base (inactif) : sombre
        dot.className = "w-1 h-1 rounded-full bg-white/20 transition-all duration-300";
        trackContainer.appendChild(dot);
        dots.push(dot);
    }
    sliderContainer.appendChild(trackContainer);

    // 3. Curseur (Anneau vide)
    const cursorRing = document.createElement('div');
    cursorRing.className = "absolute top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white rounded-full bg-black z-10 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-75 ease-out";
    // On le place initialement
    sliderContainer.appendChild(cursorRing);

    // 4. Input Invisible
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.className = "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20";

    // --- UPDATE LOGIC ---
    const updateVisuals = (val: number) => {
        // Recalculate min/max in case they changed (e.g. audio duration)
        const currentMin = parseFloat(input.min) || min;
        const currentMax = parseFloat(input.max) || max;

        const percentage = (val - currentMin) / (currentMax - currentMin) || 0; // 0.0 to 1.0

        // Position du curseur
        // Alignement avec le thumb natif de 32px (centré à 16px des bords)
        // Le ring fait 16px (centré à 8px de son left)
        // Left = 16px (thumb center start) - 8px (ring center offset) + (100% - 32px) * percentage
        cursorRing.style.left = `calc(8px + (100% - 32px) * ${percentage})`;

        // Trace Effect (Allumage des points)
        const activeIndex = Math.floor(percentage * dotCount);

        dots.forEach((dot, idx) => {
            if (idx <= activeIndex) {
                // Allumé (Trace)
                dot.className = "w-1 h-1 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all duration-150";
                if (idx === activeIndex) {
                    dot.classList.add('scale-150');
                } else {
                    dot.classList.remove('scale-150');
                }
            } else {
                // Eteint
                dot.className = "w-1 h-1 rounded-full bg-white/10 transition-all duration-300";
                dot.classList.remove('scale-150');
            }
        });
    };

    // Init
    updateVisuals(value);

    // Events
    input.oninput = (e: any) => {
        const val = parseFloat(e.target.value);
        param.value = val; // Update the source param object
        if (valDisplay) valDisplay.innerText = val.toFixed(2);
        updateVisuals(val);
        if (param.onChange) param.onChange(val);
    };

    // Expose updateVisuals on the input element so we can call it externally if needed
    // (Quick hack for external updates like audio progress)
    (input as any).updateVisuals = updateVisuals;

    sliderContainer.appendChild(input);
    container.appendChild(sliderContainer);

    return { wrapper: sliderContainer, input };
}
